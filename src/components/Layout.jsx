import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CalendarCheck, 
  Calendar as CalendarIcon, 
  History, 
  LogOut, 
  Car, 
  ShieldCheck, 
  Settings, 
  Menu, 
  X,
  PhoneCall,
  Clock,
  Inbox,
  ExternalLink,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingContext';
import SetupModal from './SetupModal';

export default function Layout({ activePage, setActivePage, onOpenCustomerView, children }) {
  const { user, logout, isDemoMode, hasConfiguredSupabase } = useAuth();
  const { metrics } = useBookings();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = metrics?.pendingRequestsCount || 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'requests', 
      label: 'Customer Requests', 
      icon: Inbox, 
      badge: pendingCount > 0 ? String(pendingCount) : null,
      isAlert: pendingCount > 0 
    },
    { id: 'availability', label: 'Check Availability', icon: CalendarCheck, badge: 'Key' },
    { id: 'add-booking', label: 'Add Booking', icon: PlusCircle },
    { id: 'calendar', label: 'Monthly Calendar', icon: CalendarIcon },
    { id: 'history', label: 'Booking History', icon: History },
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-900 border-r border-slate-800 p-5 sticky top-0 h-screen select-none">
        {/* App Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Smart Taxi
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              1 Car • Admin Desk
            </div>
          </div>
        </div>

        {/* Public Customer Page Shortcut Button */}
        {onOpenCustomerView && (
          <button
            onClick={onOpenCustomerView}
            className="mb-4 w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs text-amber-400 hover:text-amber-300 font-semibold transition group"
            title="Open customer booking page"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Public Booking Page</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
          </button>
        )}

        {/* Database Status Tag */}
        <div className="mb-4 px-3 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">Storage</span>
            <span className={`font-semibold flex items-center gap-1 ${hasConfiguredSupabase ? 'text-emerald-400' : 'text-amber-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {hasConfiguredSupabase ? 'Supabase Cloud' : 'Demo / Local'}
            </span>
          </div>
          <button
            onClick={() => setIsSetupOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Configure Supabase"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition touch-target ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                    item.isAlert
                      ? isActive ? 'bg-slate-950 text-amber-400 font-black' : 'bg-rose-500 text-white animate-pulse'
                      : isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Driver Profile & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-slate-950/40 text-xs flex items-center justify-between">
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Logged in Driver</span>
              <span className="font-semibold text-slate-200 truncate block">
                {user?.email || 'driver@smarttaxi.owner'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Smart Taxi</h1>
              <p className="text-[11px] text-amber-400 font-medium">1 Car • Asia/Kolkata</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCustomerView && (
              <button
                onClick={onOpenCustomerView}
                className="p-2 text-amber-400 hover:text-white rounded-xl bg-slate-800 touch-target flex items-center justify-center"
                title="Public Booking Page"
              >
                <Globe className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSetupOpen(true)}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800 touch-target flex items-center justify-center"
              title="Database Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-rose-400 hover:text-rose-300 rounded-xl bg-slate-800 touch-target flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Supabase Notice Banner if not configured yet */}
        {!hasConfiguredSupabase && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
              <span>
                <strong>Demo Mode Active:</strong> Add your Supabase credentials in <span className="underline cursor-pointer" onClick={() => setIsSetupOpen(true)}>Settings</span> to enable cloud synchronization.
              </span>
            </div>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition flex-shrink-0"
            >
              Connect
            </button>
          </div>
        )}

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition flex-1 touch-target ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-amber-400' : ''}`} />
                {item.badge && item.isAlert && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[65px]">
                {item.id === 'requests' ? 'Requests' : item.id === 'availability' ? 'Check' : item.id === 'add-booking' ? 'Add' : item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Supabase Setup Modal */}
      <SetupModal isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} />
    </div>
  );
}
