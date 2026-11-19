import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  getMockBookings, 
  saveMockBooking, 
  updateMockBookingStatus, 
  deleteMockBooking 
} from '../lib/mockStorage';
import { 
  checkBookingOverlap, 
  isBookingToday, 
  isBookingTomorrow,
  getTripDuration 
} from '../utils/dateUtils';
import { playAlertSound, showNotification } from '../utils/notificationUtils';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const { user, isDemoMode, hasConfiguredSupabase } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastNotifiedTripId, setLastNotifiedTripId] = useState(null);

  // Fetch all bookings
  const fetchBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // If demo mode or Supabase not configured, use local demo storage
    if (isDemoMode || !hasConfiguredSupabase) {
      const demoData = getMockBookings();
      // Sort ascending by start_at
      demoData.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
      setBookings(demoData);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select('*')
        .order('start_at', { ascending: true });

      if (fetchErr) {
        console.error('Supabase fetch error:', fetchErr);
        setError(fetchErr.message);
      } else {
        setBookings(data || []);
      }
    } catch (err) {
      console.error('Failed to query bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode, hasConfiguredSupabase]);

  // Initial load and Realtime Supabase subscription
  useEffect(() => {
    fetchBookings();

    const supabase = getSupabase();
    if (supabase && !isDemoMode && user) {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Realtime DB change received:', payload);
            fetchBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchBookings, isDemoMode, user]);

  // Check Availability helper
  const checkAvailability = useCallback((startISO, endISO, excludeId = null) => {
    if (!startISO || !endISO) {
      return { isAvailable: false, error: 'Start and end time are required', conflicts: [] };
    }

    const startDate = new Date(startISO);
    const endDate = new Date(endISO);

    if (endDate <= startDate) {
      return { 
        isAvailable: false, 
        error: 'Journey end time must be after start time.', 
        conflicts: [] 
      };
    }

    const result = checkBookingOverlap(startISO, endISO, bookings, excludeId);
    return {
      isAvailable: !result.hasConflict,
      error: result.error,
      conflicts: result.conflicts,
      duration: getTripDuration(startISO, endISO)
    };
  }, [bookings]);

  // Add a new booking
  const addBooking = async (bookingData) => {
    setError(null);
    const { start_at, end_at } = bookingData;

    // 1. Frontend Pre-validation overlap check
    const availability = checkAvailability(start_at, end_at);
    if (!availability.isAvailable) {
      const conflictMsg = availability.conflicts.length > 0
        ? `Conflict: Slot overlaps with booking for ${availability.conflicts[0].customer_name} (${new Date(availability.conflicts[0].start_at).toLocaleTimeString()} - ${new Date(availability.conflicts[0].end_at).toLocaleTimeString()})`
        : availability.error || 'Requested time is not available.';
      throw new Error(conflictMsg);
    }

    // 2. Persist
    if (isDemoMode || !hasConfiguredSupabase) {
      const saved = saveMockBooking({
        ...bookingData,
        status: 'confirmed',
      });
      await fetchBookings();
      return saved;
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const payload = {
      user_id: user.id,
      customer_name: bookingData.customer_name?.trim(),
      customer_phone: bookingData.customer_phone?.trim() || null,
      pickup_location: bookingData.pickup_location?.trim() || null,
      drop_location: bookingData.drop_location?.trim() || null,
      start_at: bookingData.start_at,
      end_at: bookingData.end_at,
      fare: parseFloat(bookingData.fare) || 0,
      advance_amount: parseFloat(bookingData.advance_amount) || 0,
      status: 'confirmed',
      notes: bookingData.notes?.trim() || null,
    };

    const { data, error: insertErr } = await supabase
      .from('bookings')
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      // Check for PostgreSQL exclusion constraint error code 23P01
      if (insertErr.code === '23P01' || insertErr.message?.includes('prevent_overlapping_confirmed_bookings')) {
        throw new Error('Database overlap protection: This taxi is already booked for an overlapping time slot.');
      }
      throw new Error(insertErr.message || 'Failed to create booking');
    }

    await fetchBookings();
    return data;
  };

  // Update existing booking
  const updateBooking = async (id, bookingData) => {
    setError(null);
    const { start_at, end_at, status } = bookingData;

    // Only validate overlap if status is confirmed
    if (status === 'confirmed') {
      const availability = checkAvailability(start_at, end_at, id);
      if (!availability.isAvailable) {
        throw new Error('This time slot conflicts with another confirmed booking.');
      }
    }

    if (isDemoMode || !hasConfiguredSupabase) {
      const updated = saveMockBooking({
        ...bookingData,
        id,
      });
      await fetchBookings();
      return updated;
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const payload = {
      customer_name: bookingData.customer_name?.trim(),
      customer_phone: bookingData.customer_phone?.trim() || null,
      pickup_location: bookingData.pickup_location?.trim() || null,
      drop_location: bookingData.drop_location?.trim() || null,
      start_at: bookingData.start_at,
      end_at: bookingData.end_at,
      fare: parseFloat(bookingData.fare) || 0,
      advance_amount: parseFloat(bookingData.advance_amount) || 0,
      status: bookingData.status,
      notes: bookingData.notes?.trim() || null,
    };

    const { data, error: updateErr } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.code === '23P01' || updateErr.message?.includes('prevent_overlapping_confirmed_bookings')) {
        throw new Error('Database overlap protection: This taxi is already booked for an overlapping time slot.');
      }
      throw new Error(updateErr.message || 'Failed to update booking');
    }

    await fetchBookings();
    return data;
  };

  // Quick cancel booking
  const cancelBooking = async (id) => {
    if (isDemoMode || !hasConfiguredSupabase) {
      updateMockBookingStatus(id, 'cancelled');
      await fetchBookings();
      return;
    }

    const supabase = getSupabase();
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (err) throw err;
    await fetchBookings();
  };

  // Quick mark trip as completed
  const completeBooking = async (id) => {
    if (isDemoMode || !hasConfiguredSupabase) {
      updateMockBookingStatus(id, 'completed');
      await fetchBookings();
      return;
    }

    const supabase = getSupabase();
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', id);

    if (err) throw err;
    await fetchBookings();
  };

  // Delete booking permanently
  const deleteBooking = async (id) => {
    if (isDemoMode || !hasConfiguredSupabase) {
      deleteMockBooking(id);
      await fetchBookings();
      return;
    }

    const supabase = getSupabase();
    const { error: err } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (err) throw err;
    await fetchBookings();
  };

  // Computed dashboard metrics
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Filter active confirmed bookings that haven't ended yet
    const upcoming = bookings.filter(b => 
      b.status === 'confirmed' && new Date(b.end_at) > now
    );

    const todayBookings = bookings.filter(b => 
      b.status === 'confirmed' && isBookingToday(b.start_at)
    );

    const tomorrowBookings = bookings.filter(b => 
      b.status === 'confirmed' && isBookingTomorrow(b.start_at)
    );

    // Next scheduled trip is the earliest confirmed trip that has not ended
    const nextTrip = upcoming.length > 0 ? upcoming[0] : null;

    // Imminent trips starting within 2 hours
    const imminentTrips = upcoming.filter(b => {
      const diffMs = new Date(b.start_at) - now;
      return diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000;
    });

    return {
      upcoming,
      todayBookings,
      tomorrowBookings,
      nextTrip,
      imminentTrips,
      totalCount: bookings.length,
      confirmedCount: bookings.filter(b => b.status === 'confirmed').length,
      completedCount: bookings.filter(b => b.status === 'completed').length,
      cancelledCount: bookings.filter(b => b.status === 'cancelled').length,
    };
  }, [bookings]);

  // Periodic Reminder Checker (runs every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!metrics.imminentTrips.length) return;
      const trip = metrics.imminentTrips[0];
      
      // Notify once per imminent trip
      if (trip && trip.id !== lastNotifiedTripId) {
        const start = new Date(trip.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        playAlertSound('urgent');
        showNotification(`Trip Reminder: ${trip.customer_name}`, {
          body: `Pickup at ${trip.pickup_location || 'designated spot'} scheduled for ${start}!`,
          tag: `trip-${trip.id}`
        });
        setLastNotifiedTripId(trip.id);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [metrics.imminentTrips, lastNotifiedTripId]);

  return (
    <BookingContext.Provider value={{
      bookings,
      loading,
      error,
      metrics,
      fetchBookings,
      addBooking,
      updateBooking,
      cancelBooking,
      completeBooking,
      deleteBooking,
      checkAvailability,
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
}
