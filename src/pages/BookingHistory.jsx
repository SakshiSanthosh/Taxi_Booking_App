import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  MoreVertical,
  PlusCircle,
  X
} from 'lucide-react';
import { useBookings } from '../context/BookingContext';
import { formatDateTime, formatDate, formatTime, getTripDuration } from '../utils/dateUtils';
import BookingModal from '../components/BookingModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function BookingHistory({ onNavigate }) {
  const { 
    bookings, 
    loading, 
    cancelBooking, 
    completeBooking, 
    deleteBooking 
  } = useBookings();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'completed' | 'cancelled'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'upcoming' | 'past' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'fare_desc'

  // Selected Booking Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState(null);

  // Filtered & Sorted Bookings
  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    const now = new Date();

    // 1. Search (Name, Phone, or Location)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(b => 
        b.customer_name?.toLowerCase().includes(q) ||
        b.customer_phone?.toLowerCase().includes(q) ||
        b.pickup_location?.toLowerCase().includes(q) ||
        b.drop_location?.toLowerCase().includes(q)
      );
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      list = list.filter(b => b.status === statusFilter);
    }

    // 3. Date filter
    if (dateFilter === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      list = list.filter(b => b.start_at?.slice(0, 10) === todayStr);
    } else if (dateFilter === 'upcoming') {
      list = list.filter(b => new Date(b.end_at) >= now);
    } else if (dateFilter === 'past') {
      list = list.filter(b => new Date(b.end_at) < now);
    } else if (dateFilter === 'custom' && customDate) {
      list = list.filter(b => b.start_at?.slice(0, 10) === customDate);
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.start_at) - new Date(b.start_at);
      } else if (sortBy === 'date_desc') {
        return new Date(b.start_at) - new Date(a.start_at);
      } else if (sortBy === 'fare_desc') {
        return (b.fare || 0) - (a.fare || 0);
      }
      return 0;
    });

    return list;
  }, [bookings, searchTerm, statusFilter, dateFilter, customDate, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Records &amp; Audit</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Booking History
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, edit, or update status of all customer rides.
          </p>
        </div>

        <button
          onClick={() => onNavigate('add-booking')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/25 touch-target"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Booking</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, pickup or drop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 transition"
            >
              <option value="date_desc">Sort: Newest Trip First</option>
              <option value="date_asc">Sort: Earliest Trip First</option>
              <option value="fare_desc">Sort: Highest Fare First</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Date:</span>
            {[
              { id: 'all', label: 'Any Date' },
              { id: 'today', label: 'Today' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'past', label: 'Past' },
              { id: 'custom', label: 'Specific Day' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  dateFilter === d.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {d.label}
              </button>
            ))}

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bookings Count Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>Showing {filteredBookings.length} of {bookings.length} total bookings</span>
      </div>

      {/* Bookings Table / Card List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-lg">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Bookings Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Try clearing or relaxing your search query and filters.'
              : 'You have not recorded any taxi bookings yet. Click Add New Booking to record your first phone trip.'}
          </p>
          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
                setCustomDate('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const fare = parseFloat(booking.fare) || 0;
            const advance = parseFloat(booking.advance_amount) || 0;
            const balance = Math.max(0, fare - advance);

            return (
              <div
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 transition cursor-pointer shadow-lg space-y-4"
              >
                {/* Top Row: Name, Status & Badges */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                      {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">
                          {booking.customer_name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          booking.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          booking.status === 'completed' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          'bg-rose-500/15 text-rose-400 border border-rose-500/30 line-through'
                        }`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                      {booking.customer_phone && (
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {booking.customer_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for Driver */}
                  <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                    {booking.customer_phone && (
                      <a
                        href={`tel:${booking.customer_phone}`}
                        className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                        title="Call Customer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onNavigate('edit-booking', booking)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Edit Booking"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {booking.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => setConfirmCancelId(booking.id)}
                          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition"
                          title="Cancel Trip"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmCompleteId(booking.id)}
                          className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 transition"
                          title="Mark Completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  {/* Schedule */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] block">Journey Schedule</span>
                    <span className="font-semibold text-slate-200 block">
                      {formatDateTime(booking.start_at)}
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      Duration: {getTripDuration(booking.start_at, booking.end_at)}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] block">Route</span>
                    <div className="flex items-center gap-1.5 text-slate-200 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{booking.pickup_location || 'Pickup'} → {booking.drop_location || 'Drop'}</span>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="space-y-1 sm:text-right">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] block">Payment</span>
                    <div className="font-bold text-white text-sm">
                      ₹{fare.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Adv: ₹{advance.toLocaleString()} • Due: <strong className={balance > 0 ? 'text-amber-400' : 'text-slate-400'}>₹{balance.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Confirmation Dialogs for Quick Action in History list */}
      <ConfirmDialog
        isOpen={Boolean(confirmCancelId)}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This will immediately free the car's slot for other customers."
        confirmLabel="Yes, Cancel Booking"
        isDestructive={true}
        onConfirm={async () => {
          const id = confirmCancelId;
          setConfirmCancelId(null);
          await cancelBooking(id);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmCompleteId)}
        title="Mark Trip as Completed"
        message="Has this ride been successfully completed?"
        confirmLabel="Mark as Completed"
        isDestructive={false}
        onConfirm={async () => {
          const id = confirmCompleteId;
          setConfirmCompleteId(null);
          await completeBooking(id);
        }}
        onCancel={() => setConfirmCompleteId(null)}
      />
    </div>
  );
}
