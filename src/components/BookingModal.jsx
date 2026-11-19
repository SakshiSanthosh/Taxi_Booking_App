import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { formatDateTime, getTripDuration } from '../utils/dateUtils';
import ConfirmDialog from './ConfirmDialog';

export default function BookingModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onCancelBooking,
  onCompleteBooking,
  onDeleteBooking,
}) {
  const [confirmAction, setConfirmAction] = useState(null); // 'cancel' | 'complete' | 'delete' | null

  if (!isOpen || !booking) return null;

  const fare = parseFloat(booking.fare) || 0;
  const advance = parseFloat(booking.advance_amount) || 0;
  const balance = Math.max(0, fare - advance);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Confirmed</span>;
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">Completed</span>;
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  // WhatsApp click handler
  const sanitizedPhone = booking.customer_phone?.replace(/[^0-9]/g, '');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
        <div 
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {booking.customer_name}
                </h2>
                {getStatusBadge(booking.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Booking ID: <span className="font-mono text-slate-300">{booking.id.slice(0, 8)}...</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Bar for Driver (Call & WhatsApp) */}
          {booking.customer_phone && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <a
                href={`tel:${booking.customer_phone}`}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition touch-target shadow-lg shadow-emerald-600/20"
              >
                <Phone className="w-4 h-4" />
                Call Customer
              </a>
              <a
                href={`https://wa.me/${sanitizedPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition touch-target"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                WhatsApp
              </a>
            </div>
          )}

          {/* Details Grid */}
          <div className="mt-5 space-y-4">
            {/* Route */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  <div className="w-0.5 h-8 bg-slate-700 my-1" />
                  <div className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Pickup Location</span>
                    <p className="text-sm font-medium text-white">{booking.pickup_location || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Drop Location</span>
                    <p className="text-sm font-medium text-white">{booking.drop_location || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Journey Schedule (Asia/Kolkata)
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Duration: {getTripDuration(booking.start_at, booking.end_at)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Start</span>
                  <span className="font-semibold text-slate-200">{formatDateTime(booking.start_at)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">End</span>
                  <span className="font-semibold text-slate-200">{formatDateTime(booking.end_at)}</span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center">
              <div className="p-2">
                <span className="text-xs text-slate-400 block">Total Fare</span>
                <span className="text-base font-bold text-white">₹{fare.toLocaleString()}</span>
              </div>
              <div className="p-2 border-x border-slate-800">
                <span className="text-xs text-slate-400 block">Advance</span>
                <span className="text-base font-bold text-emerald-400">₹{advance.toLocaleString()}</span>
              </div>
              <div className="p-2">
                <span className="text-xs text-slate-400 block">Due Balance</span>
                <span className={`text-base font-bold ${balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  ₹{balance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Driver Notes
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(booking);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition touch-target"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              {onDeleteBooking && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 text-xs font-semibold transition touch-target"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {booking.status === 'confirmed' && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmAction('cancel')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition touch-target"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction('complete')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition touch-target shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Completed
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === 'cancel'}
        title="Cancel this Booking?"
        message={`Are you sure you want to cancel the booking for ${booking.customer_name}? This will free the taxi's time slot for other customers.`}
        confirmLabel="Yes, Cancel Booking"
        isDestructive={true}
        onConfirm={async () => {
          setConfirmAction(null);
          await onCancelBooking(booking.id);
          onClose();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'complete'}
        title="Mark Trip as Completed?"
        message={`Confirm that the trip for ${booking.customer_name} has concluded successfully.`}
        confirmLabel="Mark as Completed"
        isDestructive={false}
        onConfirm={async () => {
          setConfirmAction(null);
          await onCompleteBooking(booking.id);
          onClose();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {onDeleteBooking && (
        <ConfirmDialog
          isOpen={confirmAction === 'delete'}
          title="Delete Booking Record?"
          message="This action will permanently remove this booking record. Are you sure?"
          confirmLabel="Delete Permanently"
          isDestructive={true}
          onConfirm={async () => {
            setConfirmAction(null);
            await onDeleteBooking(booking.id);
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
