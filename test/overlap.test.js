import { checkBookingOverlap } from '../src/utils/dateUtils.js';

console.log('--- RUNNING OVERLAP LOGIC TEST SUITE ---');

const existingBookings = [
  {
    id: 'trip-1',
    customer_name: 'Rajesh (Confirmed)',
    start_at: '2026-11-20T10:00:00+05:30',
    end_at: '2026-11-20T14:00:00+05:30',
    status: 'confirmed'
  },
  {
    id: 'trip-2',
    customer_name: 'Pooja (Cancelled)',
    start_at: '2026-11-20T15:00:00+05:30',
    end_at: '2026-11-20T17:00:00+05:30',
    status: 'cancelled'
  },
  {
    id: 'trip-3',
    customer_name: 'Dr. Sunita (Completed)',
    start_at: '2026-11-20T18:00:00+05:30',
    end_at: '2026-11-20T20:00:00+05:30',
    status: 'completed'
  },
  {
    id: 'trip-4',
    customer_name: 'Midnight Express (Confirmed)',
    start_at: '2026-11-20T23:00:00+05:30',
    end_at: '2026-11-21T03:00:00+05:30',
    status: 'confirmed'
  }
];

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// 1. Direct overlap
{
  const res = checkBookingOverlap('2026-11-20T11:00:00+05:30', '2026-11-20T13:00:00+05:30', existingBookings);
  assert(res.hasConflict === true && res.conflicts.length === 1, 'Direct overlap inside 10:00-14:00 detected');
}

// 2. Overlap start before and end inside
{
  const res = checkBookingOverlap('2026-11-20T09:00:00+05:30', '2026-11-20T11:00:00+05:30', existingBookings);
  assert(res.hasConflict === true && res.conflicts.length === 1, 'Overlap starting before and ending inside 10:00-14:00 detected');
}

// 3. Overlap start inside and end after
{
  const res = checkBookingOverlap('2026-11-20T13:00:00+05:30', '2026-11-20T15:00:00+05:30', existingBookings);
  assert(res.hasConflict === true && res.conflicts.length === 1, 'Overlap starting inside and ending after 10:00-14:00 detected');
}

// 4. Overlap enveloping
{
  const res = checkBookingOverlap('2026-11-20T08:00:00+05:30', '2026-11-20T15:00:00+05:30', existingBookings);
  assert(res.hasConflict === true && res.conflicts.length === 1, 'Enveloping overlap detected');
}

// 5. Consecutive bookings: ends EXACTLY when existing starts (10:00)
{
  const res = checkBookingOverlap('2026-11-20T08:00:00+05:30', '2026-11-20T10:00:00+05:30', existingBookings);
  assert(res.hasConflict === false, 'Consecutive trip ending exactly at 10:00 does NOT conflict');
}

// 6. Consecutive bookings: starts EXACTLY when existing ends (14:00)
{
  const res = checkBookingOverlap('2026-11-20T14:00:00+05:30', '2026-11-20T15:00:00+05:30', existingBookings);
  assert(res.hasConflict === false, 'Consecutive trip starting exactly at 14:00 does NOT conflict');
}

// 7. Cancelled booking slot (15:00 - 17:00) MUST BE AVAILABLE
{
  const res = checkBookingOverlap('2026-11-20T15:30:00+05:30', '2026-11-20T16:30:00+05:30', existingBookings);
  assert(res.hasConflict === false, 'Cancelled booking slot is available');
}

// 8. Completed booking slot (18:00 - 20:00) MUST BE AVAILABLE
{
  const res = checkBookingOverlap('2026-11-20T18:30:00+05:30', '2026-11-20T19:30:00+05:30', existingBookings);
  assert(res.hasConflict === false, 'Completed booking slot is available');
}

// 9. Self-exclusion when editing
{
  const res = checkBookingOverlap('2026-11-20T10:00:00+05:30', '2026-11-20T14:00:00+05:30', existingBookings, 'trip-1');
  assert(res.hasConflict === false, 'Editing self-excludes trip ID and does not flag conflict');
}

// 10. Midnight crossing trip (23:00 to 03:00)
{
  const res = checkBookingOverlap('2026-11-21T01:00:00+05:30', '2026-11-21T02:00:00+05:30', existingBookings);
  assert(res.hasConflict === true && res.conflicts[0].id === 'trip-4', 'Midnight crossing overlap detected');
}

if (failed === 0) {
  console.log('ALL OVERLAP TESTS PASSED SUCCESSFULLY! (10/10)');
} else {
  console.error(`${failed} TESTS FAILED!`);
  process.exit(1);
}

