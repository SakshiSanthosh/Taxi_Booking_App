import { createClient } from '@supabase/supabase-js';

// Clean and normalize Supabase project URL (strips trailing slashes and unintended /rest/v1 paths)
function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  let cleanUrl = String(rawUrl).trim().replace(/\/+$/, '');
  cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '');
  return cleanUrl;
}

// Retrieve credentials from environment (or runtime storage fallback)
function getCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  // Support both VITE_SUPABASE_PUBLISHABLE_KEY and legacy VITE_SUPABASE_ANON_KEY
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const storageUrl = typeof window !== 'undefined' ? localStorage.getItem('smart_taxi_supabase_url') : null;
  const storageKey = typeof window !== 'undefined' ? localStorage.getItem('smart_taxi_supabase_anon_key') : null;

  const rawUrl = storageUrl || envUrl || '';
  const key = (storageKey || envKey || '').trim();
  const url = normalizeSupabaseUrl(rawUrl);

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
    const cleanUrl = normalizeSupabaseUrl(url);
    localStorage.setItem('smart_taxi_supabase_url', cleanUrl);
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

// Default exported client instance
export const supabase = getSupabase();
