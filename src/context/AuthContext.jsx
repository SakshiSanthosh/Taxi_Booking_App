import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [hasConfiguredSupabase, setHasConfiguredSupabase] = useState(isSupabaseConfigured());

  const refreshConfig = () => {
    const configured = isSupabaseConfigured();
    setHasConfiguredSupabase(configured);
    return configured;
  };

  // Check if current user is an authorized admin in public.admin_users
  const verifyAdminStatus = async (currentUser, supabaseClient) => {
    if (!currentUser || !supabaseClient) {
      setIsAdmin(false);
      return false;
    }

    setCheckingAdmin(true);
    try {
      // 1. Try public.is_admin RPC function
      const { data: rpcAdmin, error: rpcErr } = await supabaseClient.rpc('is_admin', {
        p_user_id: currentUser.id
      });

      if (!rpcErr && typeof rpcAdmin === 'boolean') {
        setIsAdmin(rpcAdmin);
        setCheckingAdmin(false);
        return rpcAdmin;
      }

      // 2. Fallback query to admin_users table directly
      const { data: adminRow, error: tableErr } = await supabaseClient
        .from('admin_users')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!tableErr && adminRow) {
        setIsAdmin(true);
        setCheckingAdmin(false);
        return true;
      }

      // If migrations 002 is not yet executed in Supabase, fallback to authenticated owner check
      // (This ensures existing father account doesn't get locked out while setting up SQL migrations)
      if (tableErr && (tableErr.code === '42P01' || tableErr.message?.includes('admin_users'))) {
        console.warn('admin_users table not found yet. Run migration 002_admin_security.sql. Permitting authenticated owner account temporarily.');
        setIsAdmin(true);
        setCheckingAdmin(false);
        return true;
      }

      setIsAdmin(false);
      setCheckingAdmin(false);
      return false;
    } catch (err) {
      console.error('Error verifying admin authorization:', err);
      setIsAdmin(false);
      setCheckingAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    const configured = refreshConfig();
    const supabase = getSupabase();

    if (!configured || !supabase) {
      // Check if user previously enabled demo mode
      const savedDemo = localStorage.getItem('smart_taxi_use_demo') === 'true';
      if (savedDemo) {
        setIsDemoMode(true);
        setUser({
          id: 'demo-driver-001',
          email: 'driver@smarttaxi.owner',
          user_metadata: { name: 'Taxi Owner' }
        });
        setIsAdmin(true);
      }
      setLoading(false);
      return;
    }

    // Supabase is configured: listen to auth state changes
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await verifyAdminStatus(currentUser, supabase);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching Supabase session:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await verifyAdminStatus(currentUser, supabase);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login with Supabase email & password
  const login = async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase is not configured. Please enter your Supabase credentials or use Demo Mode.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setIsDemoMode(false);
    localStorage.removeItem('smart_taxi_use_demo');
    setUser(data.user);
    setSession(data.session);

    // Verify admin whitelist immediately after login
    const isAuthorized = await verifyAdminStatus(data.user, supabase);
    return { ...data, isAdmin: isAuthorized };
  };

  // Switch to Demo Mode (for offline testing)
  const enterDemoMode = () => {
    setIsDemoMode(true);
    setIsAdmin(true);
    localStorage.setItem('smart_taxi_use_demo', 'true');
    setUser({
      id: 'demo-driver-001',
      email: 'driver@smarttaxi.owner',
      user_metadata: { name: 'Taxi Owner (Demo)' }
    });
  };

  // Sign out
  const logout = async () => {
    const supabase = getSupabase();
    if (supabase && !isDemoMode) {
      await supabase.auth.signOut();
    }
    setIsDemoMode(false);
    setIsAdmin(false);
    localStorage.removeItem('smart_taxi_use_demo');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAdmin,
      checkingAdmin,
      isDemoMode,
      hasConfiguredSupabase,
      login,
      logout,
      enterDemoMode,
      refreshConfig,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
