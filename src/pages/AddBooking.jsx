import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  IndianRupee, 
  FileText, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useBookings } from '../context/BookingContext';
import { 
  combineDateTimeToISO, 
  toInputDate, 
  toInputTime, 
  formatDateTime,
  getTripDuration 
} from '../utils/dateUtils';
import ConfirmDialog from '../components/ConfirmDialog';

export default function AddBooking({ onBack, onSuccess, initialData = null, isEditing = false }) {
  const { addBooking, updateBooking, checkAvailability } = useBookings();

  // Helper defaults
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

  // Form State
  const [customerName, setCustomerName] = useState(initialData?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customer_phone || '');
  const [pickupLocation, setPickupLocation] = useState(initialData?.pickup_location || '');
  const [dropLocation, setDropLocation] = useState(initialData?.drop_location || '');
  
  const [startDate, setStartDate] = useState(
    initialData?.start_at ? toInputDate(initialData.start_at) : initialData?.startDate || toInputDate(defaultStartDate())
  );
  const [startTime, setStartTime] = useState(
    initialData?.start_at ? toInputTime(initialData.start_at) : initialData?.startTime || toInputTime(defaultStartDate())
  );
  
  const [endDate, setEndDate] = useState(
    initialData?.end_at ? toInputDate(initialData.end_at) : initialData?.endDate || toInputDate(defaultEndDate())
  );
  const [endTime, setEndTime] = useState(
    initialData?.end_at ? toInputTime(initialData.end_at) : initialData?.endTime || toInputTime(defaultEndDate())
  );

  const [fare, setFare] = useState(initialData?.fare ? String(initialData.fare) : '');
  const [advanceAmount, setAdvanceAmount] = useState(initialData?.advance_amount ? String(initialData.advance_amount) : '0');
  const [status, setStatus] = useState(initialData?.status || 'confirmed');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-calculated balance
  const parsedFare = parseFloat(fare) || 0;
  const parsedAdvance = parseFloat(advanceAmount) || 0;
  const balanceDue = Math.max(0, parsedFare - parsedAdvance);

  // Validate inputs before opening confirmation modal
  const handleReview = (e) => {
    e.preventDefault();
    setErrorBanner('');

    if (!customerName.trim()) {
      setErrorBanner('Customer Name is required.');
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setErrorBanner('Please select both start and end date/time.');
      return;
    }

    const startISO = combineDateTimeToISO(startDate, startTime);
    const endISO = combineDateTimeToISO(endDate, endTime);

    if (new Date(endISO) <= new Date(startISO)) {
      setErrorBanner('Journey End date and time must be after Start date and time.');
      return;
    }

    if (parsedAdvance > parsedFare && parsedFare > 0) {
      setErrorBanner('Advance amount cannot exceed total fare.');
      return;
    }

    // Pre-check availability
    const excludeId = isEditing && initialData?.id ? initialData.id : null;
    const availability = checkAvailability(startISO, endISO, excludeId);

    if (status === 'confirmed' && !availability.isAvailable) {
      if (availability.conflicts?.length > 0) {
        const c = availability.conflicts[0];
        setErrorBanner(`Conflict: Time overlaps with confirmed booking for ${c.customer_name} (${formatDateTime(c.start_at)} - ${formatDateTime(c.end_at)}).`);
      } else {
        setErrorBanner(availability.error || 'Requested time slot is not available.');
      }
      return;
    }

    // Passed pre-validation -> show review confirmation modal
    setShowConfirmModal(true);
  };

  // Final submission execution
  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorBanner('');

    try {
      const startISO = combineDateTimeToISO(startDate, startTime);
      const endISO = combineDateTimeToISO(endDate, endTime);

      const bookingPayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        pickup_location: pickupLocation.trim() || null,
        drop_location: dropLocation.trim() || null,
        start_at: startISO,
        end_at: endISO,
        fare: parsedFare,
        advance_amount: parsedAdvance,
        status: status,
        notes: notes.trim() || null,
      };

      if (isEditing && initialData?.id) {
        await updateBooking(initialData.id, bookingPayload);
        setSuccessBanner('Booking updated successfully!');
      } else {
        await addBooking(bookingPayload);
        setSuccessBanner('New booking successfully saved!');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err) {
      console.error('Error saving booking:', err);
      setErrorBanner(err.message || 'Failed to save booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedStartISO = combineDateTimeToISO(startDate, startTime);
  const calculatedEndISO = combineDateTimeToISO(endDate, endTime);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            {isEditing ? <Edit3 className="w-7 h-7 text-amber-400" /> : <PlusCircle className="w-7 h-7 text-amber-400" />}
            <span>{isEditing ? 'Edit Booking' : 'Add New Booking'}</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isEditing ? 'Modify existing trip details or time slot' : 'Enter customer and journey details to reserve your taxi'}
          </p>
        </div>
      </div>

      {/* Error / Success Feedback Banners */}
      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <span className="font-bold block">Booking Error</span>
            <span>{errorBanner}</span>
          </div>
        </div>
      )}

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <div className="flex-1">
            <span className="font-bold block">Success</span>
            <span>{successBanner}</span>
          </div>
        </div>
      )}

      {/* Main Booking Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleReview} className="space-y-6">
          {/* Section 1: Customer Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Route */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Trip Route
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g. Mumbai Airport Terminal 2"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Drop Location
                </label>
                <input
                  type="text"
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  placeholder="e.g. Pune Station"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Journey Schedule */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Journey Schedule (Asia/Kolkata IST)
              </h3>
              {calculatedStartISO && calculatedEndISO && new Date(calculatedEndISO) > new Date(calculatedStartISO) && (
                <span className="text-xs text-amber-400 font-medium">
                  Trip Duration: {getTripDuration(calculatedStartISO, calculatedEndISO)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Journey Start
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Time (IST)</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* End */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Journey End
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Time (IST)</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Fare & Payments */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Fare &amp; Payment Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Total Fare (₹)
                </label>
                <div className="relative">
                  <span className="text-slate-500 absolute left-3.5 top-3.5 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                    placeholder="2500"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Advance Amount (₹)
                </label>
                <div className="relative">
                  <span className="text-slate-500 absolute left-3.5 top-3.5 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="500"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Balance to Collect</span>
                <span className="text-xl font-bold text-amber-400 mt-0.5">
                  ₹{balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Status (if editing) & Notes */}
          <div className="pt-2 border-t border-slate-800/80">
            {isEditing && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Booking Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400 transition"
                >
                  <option value="confirmed">Confirmed (Blocks Slot)</option>
                  <option value="completed">Completed (Frees Slot)</option>
                  <option value="cancelled">Cancelled (Frees Slot)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                placeholder="e.g. Flight AI-214 arriving at 6:40 PM. Requested AC sedan with infant car seat."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition resize-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-sm transition touch-target"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/25 disabled:opacity-50 touch-target"
            >
              {isEditing ? 'Review & Update Booking' : 'Review & Confirm Booking'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Step Dialog (Requirement 7) */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        title={isEditing ? 'Confirm Booking Update' : 'Finalize Taxi Booking'}
        message={`Confirm reservation for ${customerName} from ${formatDateTime(calculatedStartISO)} to ${formatDateTime(calculatedEndISO)}? Total fare: ₹${parsedFare}.`}
        confirmLabel={isEditing ? 'Save Changes' : 'Confirm & Save Booking'}
        isDestructive={false}
        onConfirm={executeSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
