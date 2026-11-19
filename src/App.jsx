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

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [pageParams, setPageParams] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white tracking-tight">Smart Taxi Manager</h2>
        <p className="text-xs text-slate-400 mt-1">Starting dispatch dashboard...</p>
      </div>
    );
  }

  // If not logged in, show Login page
  if (!user) {
    return <Login />;
  }

  // Navigation handler with state passing
  const handleNavigate = (pageId, params = null) => {
    setPageParams(params);
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout activePage={activePage} setActivePage={handleNavigate}>
      {activePage === 'dashboard' && (
        <Dashboard onNavigate={handleNavigate} />
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
