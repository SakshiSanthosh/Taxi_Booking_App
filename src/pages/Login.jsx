import React, { useState } from 'react';
import { 
  Car, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Settings, 
  Sparkles,
  Globe,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SetupModal from '../components/SetupModal';

export default function Login({ onGoToCustomerPage }) {
  const { login, enterDemoMode, hasConfiguredSupabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.isAdmin === false) {
        setErrorMessage('Access Denied: This account is authenticated but not registered in public.admin_users.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 mb-4 ring-8 ring-amber-500/10">
            <Car className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Smart Taxi Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Single-Driver Dispatch &amp; Availability Portal
          </p>
        </div>

        {/* Public Customer Booking Switch Pill */}
        {onGoToCustomerPage && (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={onGoToCustomerPage}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 text-xs font-bold border border-slate-800 shadow-lg transition touch-target"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Are you a passenger? Book a Taxi here</span>
            </button>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Owner &amp; Driver Sign In</h2>
              <p className="text-xs text-slate-400">Restricted administrative access only</p>
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="p-2 text-slate-400 hover:text-amber-400 rounded-xl hover:bg-slate-800 transition"
              title="Configure Supabase"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Owner Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@smarttaxi.owner"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 touch-target"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Owner Protection Note */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Private single-user system. Public sign-up is disabled.
            </p>
          </div>

          {/* Quick Demo Access (for evaluation / offline testing) */}
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button
              type="button"
              onClick={enterDemoMode}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Demo Driver Account</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Inspect all admin features, requests, and calendar in demo mode.
            </p>
          </div>
        </div>

        {/* Supabase status indicator */}
        <div className="text-center mt-6">
          <button
            onClick={() => setShowSetup(true)}
            className="text-xs text-slate-400 hover:text-white underline inline-flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            {hasConfiguredSupabase ? 'Supabase connected' : 'Configure Supabase credentials'}
          </button>
        </div>
      </div>

      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
    </div>
  );
}
