import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or browser runtime storage
function getCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const storageUrl = typeof window !== 'undefined' ? localStorage.getItem('smart_taxi_supabase_url') : null;
  const storageKey = typeof window !== 'undefined' ? localStorage.getItem('smart_taxi_supabase_anon_key') : null;

  const url = storageUrl || envUrl || '';
  const key = storageKey || envKey || '';

  const isConfigured = 
    Boolean(url) && 
    Boolean(key) && 
    url.startsWith('https://') && 
    !url.includes('your-project-id');

  return { url, key, isConfigured };
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, key, isConfigured } = getCredentials();
  
  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance || supabaseInstance.supabaseUrl !== url) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
  }

  return supabaseInstance;
}

export function isSupabaseConfigured() {
  return getCredentials().isConfigured;
}

export function getStoredConfig() {
  return getCredentials();
}

export function saveCredentials(url, key) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('smart_taxi_supabase_url', url.trim());
    localStorage.setItem('smart_taxi_supabase_anon_key', key.trim());
    supabaseInstance = null; // force recreate
  }
}

export function clearCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smart_taxi_supabase_url');
    localStorage.removeItem('smart_taxi_supabase_anon_key');
    supabaseInstance = null;
  }
}

export const supabase = getSupabase();
