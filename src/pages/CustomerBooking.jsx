import React, { useState, useEffect } from 'react';
import { 
  Car, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  Send, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  RefreshCw,
  Info
} from 'lucide-react';
import { useBookings } from '../context/BookingContext';
import { 
  combineDateTimeToISO, 
  toInputDate, 
  toInputTime, 
  formatDateTime,
  getTripDuration 
} from '../utils/dateUtils';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognizer, 
  parseSpeechBooking 
} from '../utils/voiceParser';

export default function CustomerBooking({ onGoToAdminLogin }) {
  const { submitCustomerRequest } = useBookings();

  // Helper defaults
  const defaultStartDate = () => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d;
  };
  const defaultEndDate = () => {
    const d = new Date(Date.now() + 5 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d;
  };

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [startDate, setStartDate] = useState(toInputDate(defaultStartDate()));
  const [startTime, setStartTime] = useState(toInputTime(defaultStartDate()));
  const [endDate, setEndDate] = useState(toInputDate(defaultEndDate()));
  const [endTime, setEndTime] = useState(toInputTime(defaultEndDate()));
  const [notes, setNotes] = useState('');

  // Anti-spam Honeypot & rate-limit
  const [honeypot, setHoneypot] = useState('');
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState(null);

  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [recognizer, setRecognizer] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState('');

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;

    const rec = createSpeechRecognizer({
      onResult: ({ text }) => {
        setSpeechTranscript(text);
        const parsed = parseSpeechBooking(text);

        // Auto-fill extracted values
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
        if (parsed.pickupLocation) setPickupLocation(parsed.pickupLocation);
        if (parsed.dropLocation) setDropLocation(parsed.dropLocation);
        if (parsed.startDate) setStartDate(parsed.startDate);
        if (parsed.startTime) setStartTime(parsed.startTime);
        if (parsed.endDate) setEndDate(parsed.endDate);
        if (parsed.endTime) setEndTime(parsed.endTime);
        if (parsed.notes && !notes) setNotes(parsed.notes);

        setVoiceNotice('Smart Voice: Booking fields auto-filled! Please review and submit.');
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        setVoiceNotice('Microphone access paused. You can also type your details below.');
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    setRecognizer(rec);
  }, [notes]);

  const toggleVoiceRecording = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech Recognition is not supported by your current browser. You can still type your details in the form!');
      return;
    }

    if (isListening) {
      recognizer?.stop();
      setIsListening(false);
    } else {
      setSpeechTranscript('');
      setVoiceNotice('Listening... Speak naturally (e.g. "My name is Rajesh, phone 9876543210, pickup Airport to Bandra tomorrow at 10 AM to 1 PM")');
      try {
        recognizer?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Honeypot anti-spam check
    if (honeypot) {
      console.warn('Bot detected via honeypot.');
      return;
    }

    // Rate-limiting: prevent duplicate submissions within 15 seconds
    const now = Date.now();
    if (now - lastSubmissionTime < 15000) {
      setErrorMessage('Please wait a few seconds before submitting another request.');
      return;
    }

    // Validation
    if (!customerName.trim()) {
      setErrorMessage('Please provide your name.');
      return;
    }

    const cleanPhone = customerPhone.replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number so our driver can contact you.');
      return;
    }

    if (!pickupLocation.trim() || !dropLocation.trim()) {
      setErrorMessage('Please specify both pickup and destination locations.');
      return;
    }

    const startISO = combineDateTimeToISO(startDate, startTime);
    const endISO = combineDateTimeToISO(endDate, endTime);

    if (new Date(endISO) <= new Date(startISO)) {
      setErrorMessage('Expected drop/end time must be after pickup start time.');
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await submitCustomerRequest({
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        pickup_location: pickupLocation.trim(),
        drop_location: dropLocation.trim(),
        start_at: startISO,
        end_at: endISO,
        notes: notes.trim(),
      });

      setLastSubmissionTime(now);
      setSubmittedRequest({
        ...saved,
        startISO,
        endISO,
      });
    } catch (err) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Unable to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedStartISO = combineDateTimeToISO(startDate, startTime);
  const calculatedEndISO = combineDateTimeToISO(endDate, endTime);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Background radial gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/25">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Smart Taxi Service
            </h1>
            <p className="text-[11px] text-amber-400 font-medium">Direct Driver Booking</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToAdminLogin}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition touch-target"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Driver Login</span>
        </button>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {submittedRequest ? (
          /* SUCCESS CONFIRMATION SCREEN */
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                Booking Request Sent
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Thank You, {customerName}!
              </h2>
              <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
                Your taxi booking request has been delivered directly to the driver for confirmation.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 text-left text-xs sm:text-sm space-y-3 max-w-md mx-auto">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Request Reference:</span>
                <span className="font-mono font-bold text-amber-400">
                  {submittedRequest.id ? String(submittedRequest.id).slice(0, 8).toUpperCase() : 'SENT'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Route:</span>
                <span className="font-semibold text-white">
                  {pickupLocation} → {dropLocation}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Pickup Date &amp; Time:</span>
                <span className="font-semibold text-white">
                  {formatDateTime(submittedRequest.startISO)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 text-xs">
                  Pending Driver Confirmation
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400 max-w-md mx-auto">
              The driver will review car availability and will call you at <strong className="text-white">{customerPhone}</strong> to confirm your trip and provide your fare quote.
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmittedRequest(null);
                setCustomerName('');
                setCustomerPhone('');
                setPickupLocation('');
                setDropLocation('');
                setNotes('');
              }}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              Book Another Ride
            </button>
          </div>
        ) : (
          /* BOOKING REQUEST FORM */
          <div className="space-y-6">
            {/* Header Hero */}
            <div className="text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Direct Ride Request</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Book Your Taxi
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Single-driver personal service. No middlemen.
                </p>
              </div>

              {/* Voice Dictation Button ("Say it out loud") */}
              {isSpeechRecognitionSupported() && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition shadow-lg touch-target ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/40 ring-4 ring-rose-500/20'
                      : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/20 hover:scale-[1.02]'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Tap to Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Speak to Book (Voice AI)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Voice Feedback Banner */}
            {voiceNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span className="flex-1">{voiceNotice}</span>
              </div>
            )}

            {speechTranscript && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Heard you say:</span>
                &quot;{speechTranscript}&quot;
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot field (hidden from genuine users) */}
                <input
                  type="text"
                  name="taxi_website_security"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex="-1"
                  autoComplete="off"
                  className="hidden"
                />

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Your Full Name <span className="text-rose-400">*</span>
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Mobile Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Route */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Pickup Location <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="e.g. Mumbai Airport T2"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Destination / Drop <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={dropLocation}
                        onChange={(e) => setDropLocation(e.target.value)}
                        placeholder="e.g. Pune Shivaji Nagar"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Timing */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Journey Timing (IST)
                    </span>
                    {calculatedStartISO && calculatedEndISO && new Date(calculatedEndISO) > new Date(calculatedStartISO) && (
                      <span className="text-xs text-slate-400">
                        Duration: <strong className="text-amber-400">{getTripDuration(calculatedStartISO, calculatedEndISO)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pickup Start */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pickup Date &amp; Time
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                          required
                        />
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    </div>

                    {/* Expected End */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Expected Drop Date &amp; Time
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                          required
                        />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Special Notes or Luggage Details
                  </label>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Flight 6E-205, 3 large bags, need child seat..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 disabled:opacity-50 touch-target"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span>Submit Booking Request</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2.5 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Free request. No immediate payment required. Driver confirms fare by call.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Smart Taxi Manager • Single Owner-Driver Taxi Service • Asia/Kolkata
      </footer>
    </div>
  );
}
