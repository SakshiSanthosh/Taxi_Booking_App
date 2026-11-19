/**
 * Offline / Demo Mode Storage for Smart Taxi Manager
 * Used when Supabase credentials are not configured yet, so the driver/evaluator
 * can test every feature immediately without a broken UI.
 */

const STORAGE_KEY = 'smart_taxi_demo_bookings';

const INITIAL_DEMO_BOOKINGS = [
  {
    id: 'demo-1',
    user_id: 'demo-driver-001',
    customer_name: 'Rajesh Sharma',
    customer_phone: '+91 98765 43210',
    pickup_location: 'Airport Terminal 2, Mumbai',
    drop_location: 'BKC Business Center, Bandra',
    start_at: new Date(Date.now() + 3600 * 1000 * 2).toISOString(), // 2 hours from now
    end_at: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),   // 4 hours from now
    fare: 1450,
    advance_amount: 500,
    status: 'confirmed',
    notes: 'Flight arriving at 4:30 PM. Has 2 heavy suitcases.',
    created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    user_id: 'demo-driver-001',
    customer_name: 'Pooja Verma',
    customer_phone: '+91 91234 56789',
    pickup_location: 'Andheri West Metro Station',
    drop_location: 'Colaba Causeway, Fort',
    start_at: new Date(Date.now() + 86400 * 1000 * 1 + 3600 * 1000 * 3).toISOString(), // Tomorrow morning
    end_at: new Date(Date.now() + 86400 * 1000 * 1 + 3600 * 1000 * 5).toISOString(),
    fare: 1800,
    advance_amount: 1800,
    status: 'confirmed',
    notes: 'Sightseeing trip. Full advance paid via UPI.',
    created_at: new Date(Date.now() - 43200 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    user_id: 'demo-driver-001',
    customer_name: 'Amit Patel',
    customer_phone: '+91 99887 76655',
    pickup_location: 'Dadar Central Station',
    drop_location: 'Thane West Ghodbunder Rd',
    start_at: new Date(Date.now() + 86400 * 1000 * 2 + 3600 * 1000 * 4).toISOString(), // Day after tomorrow
    end_at: new Date(Date.now() + 86400 * 1000 * 2 + 3600 * 1000 * 7).toISOString(),
    fare: 1200,
    advance_amount: 300,
    status: 'confirmed',
    notes: 'Regular customer.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    user_id: 'demo-driver-001',
    customer_name: 'Dr. Sunita Mehta',
    customer_phone: '+91 98111 22334',
    pickup_location: 'Lilavati Hospital, Bandra',
    drop_location: 'Juhu Tara Road',
    start_at: new Date(Date.now() - 86400 * 1000 * 2).toISOString(), // 2 days ago
    end_at: new Date(Date.now() - 86400 * 1000 * 2 + 3600 * 1000 * 2).toISOString(),
    fare: 650,
    advance_amount: 650,
    status: 'completed',
    notes: 'Completed successfully.',
    created_at: new Date(Date.now() - 86400 * 1000 * 3).toISOString(),
  },
  {
    id: 'demo-5',
    user_id: 'demo-driver-001',
    customer_name: 'Vikram Singh',
    customer_phone: '+91 97654 32109',
    pickup_location: 'Powai Hiranandani',
    drop_location: 'Pune Station',
    start_at: new Date(Date.now() - 86400 * 1000 * 1).toISOString(),
    end_at: new Date(Date.now() - 86400 * 1000 * 1 + 3600 * 1000 * 5).toISOString(),
    fare: 3500,
    advance_amount: 0,
    status: 'cancelled',
    notes: 'Client cancelled train ticket.',
    created_at: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
  }
];

export function getMockBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_BOOKINGS));
      return INITIAL_DEMO_BOOKINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_DEMO_BOOKINGS;
  }
}

export function saveMockBooking(booking) {
  const current = getMockBookings();
  const newBooking = {
    ...booking,
    id: booking.id || `demo-${Date.now()}`,
    user_id: 'demo-driver-001',
    created_at: booking.created_at || new Date().toISOString(),
  };

  const updated = [newBooking, ...current.filter(b => b.id !== newBooking.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newBooking;
}

export function updateMockBookingStatus(id, newStatus) {
  const current = getMockBookings();
  const updated = current.map(b => b.id === id ? { ...b, status: newStatus } : b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.find(b => b.id === id);
}

export function deleteMockBooking(id) {
  const current = getMockBookings();
  const updated = current.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
