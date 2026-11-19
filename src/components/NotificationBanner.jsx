import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, Info, ChevronRight, X } from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  playAlertSound, 
  showNotification,
  isNotificationSupported 
} from '../utils/notificationUtils';
import { useBookings } from '../context/BookingContext';
import { formatTime } from '../utils/dateUtils';

export default function NotificationBanner({ onSelectBooking }) {
  const { metrics } = useBookings();
  const [permission, setPermission] = useState('default');
  const [isDismissed, setIsDismissed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      playAlertSound('chime');
      showNotification('Smart Taxi Manager', {
        body: 'Trip notifications enabled! You will receive timely alerts for upcoming rides.'
      });
    }
  };

  const nextImminent = metrics.imminentTrips?.[0];

  return (
    <div className="space-y-3">
      {/* Imminent Trip Alert (High Priority) */}
      {nextImminent && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-l-4 border-amber-500 bg-slate-900/90 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                Trip Starting Soon • {formatTime(nextImminent.start_at)}
              </span>
              <h4 className="text-base font-bold text-white">
                {nextImminent.customer_name} ({nextImminent.pickup_location || 'Pickup'})
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => playAlertSound('urgent')}
              title="Test Sound"
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectBooking && onSelectBooking(nextImminent)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-lg shadow-amber-500/20"
            >
              View Trip
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Browser Notification Permission Banner */}
      {!isDismissed && permission !== 'granted' && isNotificationSupported() && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Enable trip reminder alerts
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Receive instant alerts for rides starting today and upcoming bookings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-xs text-slate-400 hover:text-slate-200 underline px-1"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Explanation Accordion */}
      {showExplanation && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            About Browser Notifications:
          </p>
          Web notifications pop up while your browser or mobile browser tab is active in the background. If the browser is completely quit, system push notifications require an external Web Push / Service Worker server. Keep this tab open on your phone or desktop to get audio chimes and countdown alerts!
        </div>
      )}
    </div>
  );
}
