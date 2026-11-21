import { 
  format, 
  parseISO, 
  isSameDay, 
  isToday, 
  isTomorrow, 
  isAfter, 
  isBefore, 
  differenceInMinutes, 
  differenceInHours,
  addDays,
  startOfDay,
  endOfDay
} from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Convert any ISO date or Date object to Asia/Kolkata Zoned Date
 */
export function toIST(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(d, TIMEZONE);
}

/**
 * Format date for display in IST
 * e.g., "19 Nov 2026, 02:30 PM"
 */
export function formatDateTime(date) {
  if (!date) return '-';
  try {
    const istDate = toIST(date);
    return formatTz(istDate, 'dd MMM yyyy, hh:mm a', { timeZone: TIMEZONE });
  } catch (err) {
    return String(date);
  }
}

/**
 * Format time only in IST
 * e.g., "02:30 PM"
 */
export function formatTime(date) {
  if (!date) return '-';
  try {
    const istDate = toIST(date);
    return formatTz(istDate, 'hh:mm a', { timeZone: TIMEZONE });
  } catch (err) {
    return String(date);
  }
}

/**
 * Format date only in IST
 * e.g., "19 Nov 2026"
 */
export function formatDate(date) {
  if (!date) return '-';
  try {
    const istDate = toIST(date);
    return formatTz(istDate, 'dd MMM yyyy', { timeZone: TIMEZONE });
  } catch (err) {
    return String(date);
  }
}

/**
 * Format for HTML input type="date" (YYYY-MM-DD)
 */
export function toInputDate(date) {
  if (!date) return '';
  try {
    const istDate = toIST(date);
    return formatTz(istDate, 'yyyy-MM-dd', { timeZone: TIMEZONE });
  } catch (err) {
    return '';
  }
}

/**
 * Format for HTML input type="time" (HH:mm)
 */
export function toInputTime(date) {
  if (!date) return '';
  try {
    const istDate = toIST(date);
    return formatTz(istDate, 'HH:mm', { timeZone: TIMEZONE });
  } catch (err) {
    return '';
  }
}

/**
 * Combine date (YYYY-MM-DD) and time (HH:mm) strings in IST into an ISO string
 */
export function combineDateTimeToISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // Parse in IST: YYYY-MM-DDTHH:mm:00+05:30
  const isoLocal = `${dateStr}T${timeStr}:00+05:30`;
  const parsed = new Date(isoLocal);
  return parsed.toISOString();
}

/**
 * Calculate readable trip duration (e.g., "2h 30m" or "45m")
 */
export function getTripDuration(startAt, endAt) {
  if (!startAt || !endAt) return '';
  const start = typeof startAt === 'string' ? parseISO(startAt) : startAt;
  const end = typeof endAt === 'string' ? parseISO(endAt) : endAt;
  
  const totalMins = differenceInMinutes(end, start);
  if (totalMins < 0) return 'Invalid';
  if (totalMins < 60) return `${totalMins}m`;
  
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a booking is for Today (IST)
 */
export function isBookingToday(startAt) {
  if (!startAt) return false;
  const istDate = toIST(startAt);
  const nowIST = toIST(new Date());
  return isSameDay(istDate, nowIST);
}

/**
 * Check if a booking is for Tomorrow (IST)
 */
export function isBookingTomorrow(startAt) {
  if (!startAt) return false;
  const istDate = toIST(startAt);
  const tomorrowIST = addDays(toIST(new Date()), 1);
  return isSameDay(istDate, tomorrowIST);
}

/**
 * Core Overlap Condition:
 * newStart < existingEnd && newEnd > existingStart
 * Cancelled and Completed bookings do NOT block availability.
 * When editing, exclude the current booking's ID.
 */
export function checkBookingOverlap(newStartISO, newEndISO, bookings, excludeId = null) {
  if (!newStartISO || !newEndISO || !Array.isArray(bookings)) {
    return { hasConflict: false, conflicts: [] };
  }

  const newStart = new Date(newStartISO).getTime();
  const newEnd = new Date(newEndISO).getTime();

  if (newEnd <= newStart) {
    return {
      hasConflict: true,
      error: 'End time must be after start time',
      conflicts: []
    };
  }

  const conflicts = bookings.filter(b => {
    // Only 'confirmed' status blocks availability
    if (b.status !== 'confirmed') return false;
    
    // Ignore self when updating
    if (excludeId && b.id === excludeId) return false;

    const existingStart = new Date(b.start_at).getTime();
    const existingEnd = new Date(b.end_at).getTime();

    // Overlap condition:
    // Trip A starts before Trip B ends AND Trip A ends after Trip B starts
    // (Strict inequality allows consecutive trips where one ends exactly when next begins)
    return newStart < existingEnd && newEnd > existingStart;
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

