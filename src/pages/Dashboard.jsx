import React, { useState } from 'react';
import { 
  CalendarCheck, 
  PlusCircle, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  Car, 
  AlertCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useBookings } from '../context/BookingContext';
import { formatDateTime, formatTime, getTripDuration } from '../utils/dateUtils';
import NotificationBanner from '../components/NotificationBanner';
import BookingModal from '../components/BookingModal';

export default function Dashboard({ onNavigate }) {
  const { 
    bookings, 
    loading, 
    metrics, 
    cancelBooking, 
    completeBooking, 
    deleteBooking 
  } = useBookings();

  const [selectedBooking, setSelectedBooking] = useState(null);

  const nextTrip = metrics.nextTrip;

  return (
    <div className="space-y-6">
      {/* Notifications & Reminders Banner */}
      <NotificationBanner onSelectBooking={(b) => setSelectedBooking(b)} />

      {/* Hero / Quick Actions Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <Car className="w-3.5 h-3.5" />
            <span>Smart Taxi Manager</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Driver Dispatch Desk
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Check availability or record incoming phone bookings immediately.
          </p>
        </div>

        {/* Big Quick Action Buttons for Driver on mobile/tablet */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('availability')}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-sm transition shadow-lg touch-target"
          >
            <CalendarCheck className="w-5 h-5 text-amber-400" />
            <span>Check Availability</span>
          </button>
          <button
            onClick={() => onNavigate('add-booking')}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/25 touch-target"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Add New Booking</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Bookings */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Today&apos;s Trips
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {metrics.todayBookings.length}
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Scheduled for today
          </p>
        </div>

        {/* Tomorrow's Bookings */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tomorrow
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {metrics.tomorrowBookings.length}
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Calendar className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Rides booked for tomorrow
          </p>
        </div>

        {/* Total Upcoming Bookings */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Upcoming Rides
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {metrics.upcoming.length}
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Future confirmed trips
          </p>
        </div>

        {/* Completed Trips */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Completed Trips
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {metrics.completedCount}
            </span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Finished journeys
          </p>
        </div>
      </div>

      {/* Next Scheduled Trip Highlight Banner */}
      {nextTrip ? (
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                  Next Scheduled Trip
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {nextTrip.customer_name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {nextTrip.customer_phone && (
                <a
                  href={`tel:${nextTrip.customer_phone}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 touch-target"
                >
                  <Phone className="w-4 h-4" />
                  Call Customer
                </a>
              )}
              <button
                onClick={() => setSelectedBooking(nextTrip)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition touch-target"
              >
                View Details
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Start Time</span>
              <span className="font-semibold text-white">{formatDateTime(nextTrip.start_at)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Route</span>
              <span className="font-semibold text-slate-200">
                {nextTrip.pickup_location || 'Pickup'} → {nextTrip.drop_location || 'Drop'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Fare &amp; Advance</span>
              <span className="font-semibold text-amber-400">
                ₹{nextTrip.fare} (Adv: ₹{nextTrip.advance_amount})
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-lg">
          <Car className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No Upcoming Trips Scheduled</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Your taxi is completely free. Use the Quick Check or Add Booking button when a customer calls.
          </p>
        </div>
      )}

      {/* Upcoming Bookings List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Upcoming Bookings</h3>
            <p className="text-xs text-slate-400">Sorted chronologically by departure date</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading trips...</p>
          </div>
        ) : metrics.upcoming.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <p className="text-sm">No future confirmed bookings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.upcoming.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1 sm:mt-0 flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">
                        {booking.customer_name}
                      </h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">
                        Confirmed
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {formatDateTime(booking.start_at)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {booking.pickup_location || 'Pickup'} → {booking.drop_location || 'Drop'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-sm font-bold text-white block">₹{booking.fare}</span>
                    <span className="text-[11px] text-slate-400">
                      Adv: ₹{booking.advance_amount}
                    </span>
                  </div>

                  {booking.customer_phone && (
                    <a
                      href={`tel:${booking.customer_phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition"
                      title="Call customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
