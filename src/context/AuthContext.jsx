import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [hasConfiguredSupabase, setHasConfiguredSupabase] = useState(isSupabaseConfigured());

  const refreshConfig = () => {
    const configured = isSupabaseConfigured();
    setHasConfiguredSupabase(configured);
    return configured;
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
      }
      setLoading(false);
      return;
    }

    // Supabase is configured: listen to auth state changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching Supabase session:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    return data;
  };

  // Switch to Demo Mode (for testing without Supabase credentials)
  const enterDemoMode = () => {
    setIsDemoMode(true);
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
    localStorage.removeItem('smart_taxi_use_demo');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
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
