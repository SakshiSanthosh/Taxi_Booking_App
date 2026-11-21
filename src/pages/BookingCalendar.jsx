import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Phone, 
  PlusCircle, 
  DollarSign, 
  User, 
  CheckCircle2, 
  XCircle, 
  Sparkles 
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useBookings } from '../context/BookingContext';
import { 
  TIMEZONE, 
  formatDate, 
  formatTime, 
  formatDateTime,
  getTripDuration 
} from '../utils/dateUtils';
import BookingModal from '../components/BookingModal';

export default function BookingCalendar({ onNavigate }) {
  const { bookings, cancelBooking, completeBooking, deleteBooking } = useBookings();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Calendar matrix days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Group bookings by day string (YYYY-MM-DD in IST)
  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!b.start_at) return;
      // Convert to IST day
      const istDate = toZonedTime(new Date(b.start_at), TIMEZONE);
      const dayKey = format(istDate, 'yyyy-MM-dd');
      if (!map[dayKey]) {
        map[dayKey] = [];
      }
      map[dayKey].push(b);
    });
    return map;
  }, [bookings]);

  // Bookings for currently selected date
  const selectedDayKey = format(toZonedTime(selectedDate, TIMEZONE), 'yyyy-MM-dd');
  const dayBookings = bookingsByDay[selectedDayKey] || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Schedule Overview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Monthly Booking Calendar
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse schedule by date and inspect trip times.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-slate-300">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-slate-300">Cancelled</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (Col 1 & 2) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-950 hover:bg-slate-800 transition touch-target flex items-center justify-center"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-950 hover:bg-slate-800 transition touch-target flex items-center justify-center"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayItems = bookingsByDay[dayKey] || [];
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={dayKey}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-2xl border transition cursor-pointer flex flex-col justify-between select-none ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/20'
                      : isTodayDate
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : isCurrentMonth
                      ? 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/50'
                      : 'border-transparent bg-slate-950/20 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-lg w-6 h-6 flex items-center justify-center ${
                        isTodayDate
                          ? 'bg-amber-500 text-slate-950'
                          : isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : isCurrentMonth
                          ? 'text-slate-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Day Booking Badges / Dots */}
                  <div className="mt-1 space-y-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${
                          item.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'completed'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300 line-through'
                        }`}
                        title={`${item.customer_name} (${formatTime(item.start_at)})`}
                      >
                        <span className="hidden sm:inline font-bold mr-1">{formatTime(item.start_at)}</span>
                        {item.customer_name}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-bold px-1">
                        +{dayItems.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Inspector (Col 3) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                  Schedule Details
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">
                  {formatDate(selectedDate)}
                </h4>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {dayBookings.length} {dayBookings.length === 1 ? 'Trip' : 'Trips'}
              </span>
            </div>

            {dayBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CalendarIcon className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-sm font-medium text-slate-400">No bookings on this day.</p>
                <p className="text-xs text-slate-500">Your car is free for new trips.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {dayBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/50 transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-white text-sm">
                        {b.customer_name}
                      </h5>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        b.status === 'completed' ? 'bg-blue-500/15 text-blue-400' :
                        'bg-rose-500/15 text-rose-400 line-through'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(b.start_at)} – {formatTime(b.end_at)}</span>
                    </div>

                    {(b.pickup_location || b.drop_location) && (
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{b.pickup_location || 'Pickup'} → {b.drop_location || 'Drop'}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-400">Fare: <strong className="text-white">₹{b.fare}</strong></span>
                      {b.customer_phone && (
                        <a
                          href={`tel:${b.customer_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => {
                onNavigate('add-booking', {
                  startDate: format(selectedDate, 'yyyy-MM-dd'),
                  endDate: format(selectedDate, 'yyyy-MM-dd'),
                });
              }}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 touch-target"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Book Trip on {formatDate(selectedDate)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      <BookingModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onEdit={(booking) => {
          onNavigate('edit-booking', booking);
        }}
        onCancelBooking={async (id) => {
          await cancelBooking(id);
        }}
        onCompleteBooking={async (id) => {
          await completeBooking(id);
        }}
        onDeleteBooking={async (id) => {
          await deleteBooking(id);
        }}
      />
    </div>
  );
}

