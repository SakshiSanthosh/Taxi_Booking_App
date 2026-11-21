import React, { useState } from 'react';
import { Database, Key, CheckCircle, AlertCircle, X, ExternalLink, HelpCircle } from 'lucide-react';
import { getStoredConfig, saveCredentials, clearCredentials } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SetupModal({ isOpen, onClose }) {
  const { isDemoMode, enterDemoMode, refreshConfig } = useAuth();
  const currentConfig = getStoredConfig();

  const [url, setUrl] = useState(currentConfig.url || '');
  const [key, setKey] = useState(currentConfig.key || '');
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.startsWith('https://')) {
      setMessage({ type: 'error', text: 'Supabase URL must start with https://' });
      return;
    }
    if (!key.trim()) {
      setMessage({ type: 'error', text: 'Supabase Anon Public Key is required.' });
      return;
    }

    saveCredentials(url, key);
    refreshConfig();
    setMessage({ type: 'success', text: 'Credentials saved! Reloading application...' });
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleClear = () => {
    clearCredentials();
    refreshConfig();
    setUrl('');
    setKey('');
    setMessage({ type: 'info', text: 'Custom credentials cleared.' });
  };

  const handleUseDemo = () => {
    enterDemoMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Supabase Configuration</h2>
            <p className="text-xs text-slate-400 mt-0.5">Connect your PostgreSQL database & Supabase Auth</p>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3.5 rounded-xl text-sm flex items-center gap-2 ${
            message.type === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/25' :
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25' :
            'bg-blue-500/10 text-blue-300 border border-blue-500/25'
          }`}>
            {message.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Anon Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
              required
            />
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              Quick Setup Note:
            </p>
            <p>1. In your Supabase Dashboard, open SQL Editor and execute <span className="font-mono text-amber-300">supabase/schema.sql</span> included in this project.</p>
            <p>2. Copy your Project URL & Anon Public API Key from <span className="text-slate-300">Project Settings → API</span>.</p>
            <p>3. Or add them to <span className="font-mono text-amber-300">.env.local</span> (<span className="font-mono text-slate-300">VITE_SUPABASE_URL</span> &amp; <span className="font-mono text-slate-300">VITE_SUPABASE_ANON_KEY</span>).</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleUseDemo}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition"
            >
              Use Offline Demo Mode
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentConfig.url && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 text-xs font-medium transition"
                >
                  Clear Keys
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-amber-500/20"
              >
                Save &amp; Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

