import React, { useState } from 'react';
import { 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Phone,
  RefreshCw
} from 'lucide-react';
import { useBookings } from '../context/BookingContext';
import { 
  combineDateTimeToISO, 
  toInputDate, 
  toInputTime, 
  formatDateTime,
  formatTime,
  getTripDuration 
} from '../utils/dateUtils';

export default function Availability({ onProceedToBook, initialDates }) {
  const { checkAvailability, fetchBookings, loading } = useBookings();

  // Initialize with sensible defaults (now + 1h, + 3h)
  const defaultStartDate = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d;
  };
  const defaultEndDate = () => {
    const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d;
  };

  const [startDate, setStartDate] = useState(
    initialDates?.startDate || toInputDate(defaultStartDate())
  );
  const [startTime, setStartTime] = useState(
    initialDates?.startTime || toInputTime(defaultStartDate())
  );
  const [endDate, setEndDate] = useState(
    initialDates?.endDate || toInputDate(defaultEndDate())
  );
  const [endTime, setEndTime] = useState(
    initialDates?.endTime || toInputTime(defaultEndDate())
  );

  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Quick Presets for Driver
  const applyPreset = (type) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (type === 'today_next2h') {
      start = new Date(now.getTime() + 30 * 60 * 1000);
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    } else if (type === 'today_evening') {
      start.setHours(18, 0, 0, 0);
      end.setHours(22, 0, 0, 0);
    } else if (type === 'tomorrow_morning') {
      start.setDate(now.getDate() + 1);
      start.setHours(8, 0, 0, 0);
      end.setDate(now.getDate() + 1);
      end.setHours(12, 0, 0, 0);
    } else if (type === 'tomorrow_full') {
      start.setDate(now.getDate() + 1);
      start.setHours(9, 0, 0, 0);
      end.setDate(now.getDate() + 1);
      end.setHours(21, 0, 0, 0);
    }

    setStartDate(toInputDate(start));
    setStartTime(toInputTime(start));
    setEndDate(toInputDate(end));
    setEndTime(toInputTime(end));
    setCheckResult(null);
  };

  const handleCheck = async (e) => {
    if (e) e.preventDefault();
    setIsChecking(true);
    setCheckResult(null);

    // Refresh latest bookings from database to ensure fresh state
    await fetchBookings();

    const startISO = combineDateTimeToISO(startDate, startTime);
    const endISO = combineDateTimeToISO(endDate, endTime);

    const result = checkAvailability(startISO, endISO);
    setCheckResult({
      ...result,
      startISO,
      endISO,
    });
    setIsChecking(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Instant Overlap Checker</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Check Taxi Availability
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Verify if your car is free before accepting a customer booking call.
        </p>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-semibold mr-1">Quick Slots:</span>
        <button
          type="button"
          onClick={() => applyPreset('today_next2h')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
        >
          Next 2 Hours
        </button>
        <button
          type="button"
          onClick={() => applyPreset('today_evening')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
        >
          Today Evening
        </button>
        <button
          type="button"
          onClick={() => applyPreset('tomorrow_morning')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
        >
          Tomorrow Morning
        </button>
        <button
          type="button"
          onClick={() => applyPreset('tomorrow_full')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
        >
          Tomorrow Full Day
        </button>
      </div>

      {/* Main Checker Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleCheck} className="space-y-6">
          {/* Start and End Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Fieldset */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                Journey Start
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCheckResult(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Start Time (IST)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setCheckResult(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
            </div>

            {/* End Fieldset */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                Journey End
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCheckResult(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  End Time (IST)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setCheckResult(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isChecking || loading}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 disabled:opacity-50 touch-target"
          >
            {isChecking ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <CalendarCheck className="w-5 h-5" />
            )}
            <span>Check Availability</span>
          </button>
        </form>
      </div>

      {/* Check Result Display */}
      {checkResult && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {checkResult.isAvailable ? (
            /* AVAILABLE STATE */
            <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 flex-shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    Slot Status
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    AVAILABLE
                  </h3>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-sm space-y-2">
                <p className="text-slate-300 font-medium">
                  Your taxi has <span className="text-emerald-400 font-bold">no conflicting bookings</span> for this requested time window:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">From:</span>
                    <span className="text-white font-semibold text-sm">{formatDateTime(checkResult.startISO)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">To:</span>
                    <span className="text-white font-semibold text-sm">{formatDateTime(checkResult.endISO)}</span>
                  </div>
                </div>
                <div className="pt-2 text-xs text-amber-400 font-semibold">
                  Estimated Trip Duration: {checkResult.duration}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onProceedToBook) {
                      onProceedToBook({
                        startDate,
                        startTime,
                        endDate,
                        endTime,
                        startISO: checkResult.startISO,
                        endISO: checkResult.endISO,
                      });
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 touch-target"
                >
                  <span>Book this Slot Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-slate-400 text-center sm:text-right">
                  Pre-fills dates into booking form
                </p>
              </div>
            </div>
          ) : (
            /* NOT AVAILABLE / CONFLICT STATE */
            <div className="bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-500/30 flex-shrink-0">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-rose-400">
                    Slot Status
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    NOT AVAILABLE
                  </h3>
                </div>
              </div>

              {checkResult.error ? (
                <p className="text-sm text-rose-300 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 font-medium">
                  {checkResult.error}
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 font-medium">
                    This time overlaps with <strong className="text-rose-400">{checkResult.conflicts.length} confirmed booking(s)</strong>:
                  </p>

                  {checkResult.conflicts.map((conflict) => (
                    <div 
                      key={conflict.id}
                      className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base">
                          {conflict.customer_name}
                        </h4>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30">
                          Conflicting Trip
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block">Existing Start:</span>
                          <span className="text-white font-semibold">{formatDateTime(conflict.start_at)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Existing End:</span>
                          <span className="text-white font-semibold">{formatDateTime(conflict.end_at)}</span>
                        </div>
                      </div>

                      {(conflict.pickup_location || conflict.drop_location) && (
                        <p className="text-xs text-slate-300">
                          Route: <span className="font-medium text-white">{conflict.pickup_location || 'Pickup'} → {conflict.drop_location || 'Drop'}</span>
                        </p>
                      )}

                      {conflict.customer_phone && (
                        <div className="pt-1">
                          <a
                            href={`tel:${conflict.customer_phone}`}
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call existing customer: {conflict.customer_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                <p className="text-xs text-slate-400">
                  Try adjusting the start or end time above to find a non-overlapping window.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // Quick add 2 hours to start time
                    const curr = new Date(combineDateTimeToISO(startDate, startTime));
                    curr.setHours(curr.getHours() + 2);
                    setStartDate(toInputDate(curr));
                    setStartTime(toInputTime(curr));
                    const nextEnd = new Date(curr.getTime() + 2 * 60 * 60 * 1000);
                    setEndDate(toInputDate(nextEnd));
                    setEndTime(toInputTime(nextEnd));
                    setCheckResult(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition touch-target"
                >
                  Shift by +2 Hours
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

