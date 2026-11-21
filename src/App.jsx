import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Availability from './pages/Availability';
import AddBooking from './pages/AddBooking';
import BookingCalendar from './pages/BookingCalendar';
import BookingHistory from './pages/BookingHistory';
import BookingRequests from './pages/BookingRequests';
import CustomerBooking from './pages/CustomerBooking';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

function AppContent() {
  const { user, loading, isAdmin, checkingAdmin, logout } = useAuth();
  
  // High level view: 'admin' (driver dispatch) or 'customer' (public booking page)
  const [currentView, setCurrentView] = useState(() => {
    // If URL contains ?view=customer, open customer page directly
    if (typeof window !== 'undefined' && window.location.search.includes('view=customer')) {
      return 'customer';
    }
    return 'admin';
  });

  const [activePage, setActivePage] = useState('dashboard');
  const [pageParams, setPageParams] = useState(null);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white tracking-tight">Smart Taxi Manager</h2>
        <p className="text-xs text-slate-400 mt-1">Starting dispatch dashboard...</p>
      </div>
    );
  }

  // If viewing Public Customer Portal
  if (currentView === 'customer') {
    return (
      <CustomerBooking 
        onGoToAdminLogin={() => {
          setCurrentView('admin');
        }}
      />
    );
  }

  // If not logged in as Admin, show Admin Login page
  if (!user) {
    return (
      <Login 
        onGoToCustomerPage={() => {
          setCurrentView('customer');
        }} 
      />
    );
  }

  // If authenticated user is NOT in admin_users (Access Denied)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Denied: Not an Administrator</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account (<span className="text-amber-400 font-mono">{user.email}</span>) is authenticated, but has not been added to the <span className="font-mono text-slate-200">public.admin_users</span> whitelist table.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left">
            <strong>Fix:</strong> Insert your user ID into <span className="font-mono text-amber-300">public.admin_users</span> in Supabase SQL Editor:
            <pre className="mt-1 p-2 bg-slate-900 rounded font-mono text-[10px] text-slate-300 overflow-x-auto select-all">
              INSERT INTO public.admin_users (user_id, role) VALUES (&apos;{user.id}&apos;, &apos;owner&apos;);
            </pre>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setCurrentView('customer')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Customer Booking Page
            </button>
            <button
              onClick={logout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Navigation handler with state passing
  const handleNavigate = (pageId, params = null) => {
    setPageParams(params);
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={handleNavigate}
      onOpenCustomerView={() => setCurrentView('customer')}
    >
      {activePage === 'dashboard' && (
        <Dashboard onNavigate={handleNavigate} />
      )}

      {activePage === 'requests' && (
        <BookingRequests />
      )}

      {activePage === 'availability' && (
        <Availability 
          initialDates={pageParams}
          onProceedToBook={(dates) => {
            handleNavigate('add-booking', dates);
          }}
        />
      )}

      {activePage === 'add-booking' && (
        <AddBooking 
          initialData={pageParams}
          isEditing={false}
          onBack={() => handleNavigate('dashboard')}
          onSuccess={() => handleNavigate('dashboard')}
        />
      )}

      {activePage === 'edit-booking' && (
        <AddBooking 
          initialData={pageParams}
          isEditing={true}
          onBack={() => handleNavigate('history')}
          onSuccess={() => handleNavigate('history')}
        />
      )}

      {activePage === 'calendar' && (
        <BookingCalendar onNavigate={handleNavigate} />
      )}

      {activePage === 'history' && (
        <BookingHistory onNavigate={handleNavigate} />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <AppContent />
      </BookingProvider>
    </AuthProvider>
  );
}
