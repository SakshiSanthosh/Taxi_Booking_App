import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  getMockBookings, 
  saveMockBooking, 
  updateMockBookingStatus, 
  deleteMockBooking,
  getMockRequests,
  saveMockRequest,
  updateMockRequestStatus
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
  const { user, isDemoMode, hasConfiguredSupabase, isAdmin } = useAuth();
  
  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Requests state (customer public requests)
  const [bookingRequests, setBookingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [lastNotifiedTripId, setLastNotifiedTripId] = useState(null);

  // Fetch all bookings (Admin only)
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

  // Fetch customer booking requests (Admin only)
  const fetchRequests = useCallback(async () => {
    if (!user) {
      setBookingRequests([]);
      return;
    }

    setLoadingRequests(true);
    if (isDemoMode || !hasConfiguredSupabase) {
      const demoRequests = getMockRequests();
      demoRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setBookingRequests(demoRequests);
      setLoadingRequests(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoadingRequests(false);
      return;
    }

    try {
      const { data, error: reqErr } = await supabase
        .from('booking_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqErr) {
        // Table may not exist yet if migration 001 not executed
        console.warn('Booking requests query warning:', reqErr.message);
      } else {
        setBookingRequests(data || []);
      }
    } catch (err) {
      console.warn('Could not fetch booking requests:', err.message);
    } finally {
      setLoadingRequests(false);
    }
  }, [user, isDemoMode, hasConfiguredSupabase]);

  // Initial load and Realtime Supabase subscription
  useEffect(() => {
    fetchBookings();
    fetchRequests();

    const supabase = getSupabase();
    if (supabase && !isDemoMode && user) {
      // Channel 1: Bookings table
      const bookingsChannel = supabase
        .channel('realtime-bookings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          () => fetchBookings()
        )
        .subscribe();

      // Channel 2: Booking requests table
      const requestsChannel = supabase
        .channel('realtime-requests')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'booking_requests' },
          () => fetchRequests()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(bookingsChannel);
        supabase.removeChannel(requestsChannel);
      };
    }
  }, [fetchBookings, fetchRequests, isDemoMode, user]);

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

  // Submit a customer booking request (Public / Guest accessible)
  const submitCustomerRequest = async (requestData) => {
    const { 
      customer_name, 
      customer_phone, 
      pickup_location, 
      drop_location, 
      start_at, 
      end_at, 
      notes 
    } = requestData;

    if (!customer_name?.trim() || !customer_phone?.trim() || !pickup_location?.trim() || !drop_location?.trim()) {
      throw new Error('Please fill in all required contact and location fields.');
    }

    if (!start_at || !end_at) {
      throw new Error('Journey start and end date/time are required.');
    }

    if (new Date(end_at) <= new Date(start_at)) {
      throw new Error('End date/time must be strictly after journey start date/time.');
    }

    // Offline / Demo mode fallback
    if (isDemoMode || !hasConfiguredSupabase) {
      const saved = saveMockRequest({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        pickup_location: pickup_location.trim(),
        drop_location: drop_location.trim(),
        start_at,
        end_at,
        notes: notes?.trim() || null,
      });
      await fetchRequests();
      return saved;
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client is not available.');

    const payload = {
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      pickup_location: pickup_location.trim(),
      drop_location: drop_location.trim(),
      start_at,
      end_at,
      notes: notes?.trim() || null,
      status: 'pending',
    };

    const { data, error: insertErr } = await supabase
      .from('booking_requests')
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      console.error('Request insertion error:', insertErr);
      throw new Error(insertErr.message || 'Failed to submit booking request.');
    }

    await fetchRequests();
    return data;
  };

  // Approve a customer booking request (Transactional RPC)
  const approveBookingRequest = async (requestId, fare, advanceAmount = 0, adminNotes = '') => {
    if (!requestId) throw new Error('Request ID is required');

    const parsedFare = parseFloat(fare) || 0;
    const parsedAdvance = parseFloat(advanceAmount) || 0;

    if (parsedFare <= 0) {
      throw new Error('Please enter a valid total fare.');
    }
    if (parsedAdvance > parsedFare) {
      throw new Error('Advance amount cannot exceed total fare.');
    }

    // Demo Mode handling
    if (isDemoMode || !hasConfiguredSupabase) {
      const req = bookingRequests.find(r => r.id === requestId);
      if (!req) throw new Error('Request not found in demo records.');

      // Check overlap
      const availability = checkAvailability(req.start_at, req.end_at);
      if (!availability.isAvailable) {
        throw new Error('Cannot approve: Time slot overlaps with an existing confirmed booking.');
      }

      const newBooking = saveMockBooking({
        customer_name: req.customer_name,
        customer_phone: req.customer_phone,
        pickup_location: req.pickup_location,
        drop_location: req.drop_location,
        start_at: req.start_at,
        end_at: req.end_at,
        fare: parsedFare,
        advance_amount: parsedAdvance,
        status: 'confirmed',
        notes: req.notes ? `${req.notes}\n[Admin Notes]: ${adminNotes}` : adminNotes,
      });

      updateMockRequestStatus(requestId, 'approved', {
        booking_id: newBooking.id,
        admin_notes: adminNotes
      });

      await fetchBookings();
      await fetchRequests();
      return { success: true, booking_id: newBooking.id };
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized.');

    // Call the atomic database RPC function
    const { data, error: rpcErr } = await supabase.rpc('approve_booking_request', {
      p_request_id: requestId,
      p_fare: parsedFare,
      p_advance_amount: parsedAdvance,
      p_admin_notes: adminNotes?.trim() || null,
    });

    if (rpcErr) {
      // Friendly message for conflict or authorization errors
      if (rpcErr.code === '23P01' || rpcErr.message?.includes('conflicts with confirmed booking') || rpcErr.message?.includes('Cannot approve')) {
        throw new Error(rpcErr.message);
      }
      if (rpcErr.code === '42501' || rpcErr.message?.includes('Access denied')) {
        throw new Error('Unauthorized: Only registered admin accounts can approve booking requests.');
      }
      throw new Error(rpcErr.message || 'Failed to approve booking request.');
    }

    await fetchBookings();
    await fetchRequests();
    return data;
  };

  // Reject a customer booking request
  const rejectBookingRequest = async (requestId, adminNotes = '') => {
    if (!requestId) throw new Error('Request ID is required');

    if (isDemoMode || !hasConfiguredSupabase) {
      updateMockRequestStatus(requestId, 'rejected', { admin_notes: adminNotes });
      await fetchRequests();
      return { success: true };
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized.');

    // Try RPC reject_booking_request
    const { data, error: rpcErr } = await supabase.rpc('reject_booking_request', {
      p_request_id: requestId,
      p_admin_notes: adminNotes?.trim() || null,
    });

    if (rpcErr) {
      // Fallback direct update
      const { error: updateErr } = await supabase
        .from('booking_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes?.trim() || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateErr) throw new Error(updateErr.message);
    }

    await fetchRequests();
    return { success: true };
  };

  // Add a new manual phone booking (Saves directly to public.bookings)
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
    
    // Only 'confirmed' status blocks availability and counts towards active trips
    const upcoming = bookings.filter(b => 
      b.status === 'confirmed' && new Date(b.end_at) > now
    );

    const todayBookings = bookings.filter(b => 
      b.status === 'confirmed' && isBookingToday(b.start_at)
    );

    const tomorrowBookings = bookings.filter(b => 
      b.status === 'confirmed' && isBookingTomorrow(b.start_at)
    );

    const nextTrip = upcoming.length > 0 ? upcoming[0] : null;

    const imminentTrips = upcoming.filter(b => {
      const diffMs = new Date(b.start_at) - now;
      return diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000;
    });

    const pendingRequests = bookingRequests.filter(r => r.status === 'pending');

    return {
      upcoming,
      todayBookings,
      tomorrowBookings,
      nextTrip,
      imminentTrips,
      pendingRequests,
      pendingRequestsCount: pendingRequests.length,
      totalCount: bookings.length,
      confirmedCount: bookings.filter(b => b.status === 'confirmed').length,
      completedCount: bookings.filter(b => b.status === 'completed').length,
      cancelledCount: bookings.filter(b => b.status === 'cancelled').length,
    };
  }, [bookings, bookingRequests]);

  // Periodic Reminder Checker (runs every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!metrics.imminentTrips.length) return;
      const trip = metrics.imminentTrips[0];
      
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
      bookingRequests,
      loading,
      loadingRequests,
      error,
      metrics,
      fetchBookings,
      fetchRequests,
      submitCustomerRequest,
      approveBookingRequest,
      rejectBookingRequest,
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
