import React, { useState } from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  Eye, 
  RefreshCw,
  Search,
  IndianRupee,
  X
} from 'lucide-react';
import { useBookings } from '../context/BookingContext';
import { formatDateTime, formatTime, getTripDuration } from '../utils/dateUtils';
import ConfirmDialog from '../components/ConfirmDialog';

export default function BookingRequests() {
  const { 
    bookingRequests, 
    loadingRequests, 
    fetchRequests, 
    approveBookingRequest, 
    rejectBookingRequest,
    checkAvailability 
  } = useBookings();

  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [viewingRequest, setViewingRequest] = useState(null);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);

  // Approval form state
  const [fare, setFare] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Rejection notes
  const [rejectNotes, setRejectNotes] = useState('');

  // Filtered requests
  const filteredRequests = bookingRequests.filter(req => {
    // 1. Status filter
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;

    // 2. Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        req.customer_name?.toLowerCase().includes(q) ||
        req.customer_phone?.toLowerCase().includes(q) ||
        req.pickup_location?.toLowerCase().includes(q) ||
        req.drop_location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Open Approval Modal
  const openApproveModal = (req) => {
    setActionError('');
    setActionSuccess('');
    setApprovingRequest(req);
    setFare('');
    setAdvanceAmount('0');
    setAdminNotes('');
  };

  // Submit Approval
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approvingRequest) return;
    setActionError('');
    setIsProcessing(true);

    try {
      await approveBookingRequest(
        approvingRequest.id,
        fare,
        advanceAmount,
        adminNotes
      );
      setActionSuccess('Booking approved and created successfully in calendar!');
      setTimeout(() => {
        setApprovingRequest(null);
        setActionSuccess('');
      }, 1200);
    } catch (err) {
      console.error('Approval failed:', err);
      setActionError(err.message || 'Could not approve booking.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Rejection
  const handleRejectConfirm = async () => {
    if (!rejectingRequest) return;
    setIsProcessing(true);
    setActionError('');

    try {
      await rejectBookingRequest(rejectingRequest.id, rejectNotes);
      setRejectingRequest(null);
      setRejectNotes('');
    } catch (err) {
      console.error('Rejection failed:', err);
      alert(err.message || 'Failed to reject request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const parsedFare = parseFloat(fare) || 0;
  const parsedAdvance = parseFloat(advanceAmount) || 0;
  const balanceDue = Math.max(0, parsedFare - parsedAdvance);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <Inbox className="w-3.5 h-3.5" />
            <span>Public Customer Inquiries</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Customer Booking Requests
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Review incoming online ride requests, quote fares, and convert to confirmed bookings.
          </p>
        </div>

        <button
          onClick={() => fetchRequests()}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition touch-target"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'pending', label: 'Pending', count: bookingRequests.filter(r => r.status === 'pending').length },
            { id: 'approved', label: 'Approved', count: bookingRequests.filter(r => r.status === 'approved').length },
            { id: 'rejected', label: 'Rejected', count: bookingRequests.filter(r => r.status === 'rejected').length },
            { id: 'all', label: 'All Requests', count: bookingRequests.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by customer, phone, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Requests List */}
      {loadingRequests ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading customer requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-lg">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No {statusFilter !== 'all' ? statusFilter : ''} Requests Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'Great job! You have no pending customer requests to review.'
              : 'There are no customer booking requests matching your current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => {
            // Check real-time availability for pending requests
            const availability = req.status === 'pending' 
              ? checkAvailability(req.start_at, req.end_at)
              : null;

            return (
              <div
                key={req.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-lg space-y-3 transition"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                      {req.customer_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">
                          {req.customer_name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          req.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          req.status === 'rejected' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Received on {formatDateTime(req.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={`tel:${req.customer_phone}`}
                      className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                      title="Call Customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => setViewingRequest(req)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setRejectingRequest(req)}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold border border-rose-500/20 transition touch-target"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openApproveModal(req)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 touch-target"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details snippet */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Route</span>
                    <div className="flex items-center gap-1.5 text-slate-200 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{req.pickup_location} → {req.drop_location}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Requested Journey Schedule</span>
                    <div className="flex items-center gap-1.5 text-slate-200 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{formatDateTime(req.start_at)}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Availability Status</span>
                    {req.status === 'pending' ? (
                      availability?.isAvailable ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Taxi is Free for this slot
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Time Overlaps with Confirmed Trip!
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 mt-0.5 block">
                        Reviewed: {req.reviewed_at ? formatDateTime(req.reviewed_at) : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>

                {req.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-slate-300">Customer Note:</strong> {req.notes}
                  </p>
                )}

                {req.admin_notes && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    <strong>Admin Note:</strong> {req.admin_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setApprovingRequest(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Approve Booking Request
                </h3>
                <p className="text-xs text-slate-400">
                  Quote fare &amp; convert request into confirmed booking
                </p>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Trip summary */}
            <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Passenger:</span>
                <span className="font-bold text-white">{approvingRequest.customer_name} ({approvingRequest.customer_phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Route:</span>
                <span className="font-semibold text-slate-200">{approvingRequest.pickup_location} → {approvingRequest.drop_location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Schedule:</span>
                <span className="font-semibold text-amber-400">{formatDateTime(approvingRequest.start_at)} – {formatDateTime(approvingRequest.end_at)}</span>
              </div>
            </div>

            <form onSubmit={handleApproveSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Agreed Total Fare (₹) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="text-slate-500 absolute left-3 top-3 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="10"
                      value={fare}
                      onChange={(e) => setFare(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Advance Received (₹)
                  </label>
                  <div className="relative">
                    <span className="text-slate-500 absolute left-3 top-3 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold uppercase">Balance to Collect:</span>
                <span className="text-base font-bold text-amber-400">
                  ₹{balanceDue.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin / Internal Driver Notes
                </label>
                <textarea
                  rows="2"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Spoke to customer via phone, agreed to meet at Gate 3."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setApprovingRequest(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isProcessing ? 'Verifying & Approving...' : 'Confirm Approval & Lock Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION CONFIRMATION DIALOG */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reject Request</h3>
                <p className="text-xs text-slate-400">Decline booking inquiry for {rejectingRequest.customer_name}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-300">
                Are you sure you want to reject this request? No booking will be created in your calendar.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Reason / Internal Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="e.g. Taxi already booked for family function / customer unreachable."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRejectConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting...' : 'Yes, Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingRequest(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-slate-800">
              Request Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Passenger</span>
                <span className="font-bold text-white text-sm">{viewingRequest.customer_name}</span>
                <span className="text-slate-300 block font-mono">{viewingRequest.customer_phone}</span>
              </div>

              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Route</span>
                <span className="font-semibold text-white">{viewingRequest.pickup_location} → {viewingRequest.drop_location}</span>
              </div>

              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Requested Timing</span>
                <span className="font-semibold text-amber-400">
                  {formatDateTime(viewingRequest.start_at)} to {formatDateTime(viewingRequest.end_at)}
                </span>
                <span className="text-slate-400 block mt-0.5">
                  Duration: {getTripDuration(viewingRequest.start_at, viewingRequest.end_at)}
                </span>
              </div>

              {viewingRequest.notes && (
                <div>
                  <span className="text-slate-400 block uppercase text-[10px]">Customer Notes</span>
                  <p className="text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mt-1">
                    {viewingRequest.notes}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Status</span>
                <span className="font-bold text-white uppercase">{viewingRequest.status}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
