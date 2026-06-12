import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsPanel } from '../ui/NotificationsPanel';

export function Navbar({ toggleSidebar }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Detectar si estamos en la landing page para usar el tema oscuro
  const isLandingPage = location.pathname === '/';
  
  // Get initial of user's email or name
  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  // 1. ESTADO AUTENTICADO
  if (user) {
    return (
      <nav className="sticky top-0 z-40 bg-brand-surface shadow-sm border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-6">
          <Link to="/app" className="text-brand-blue font-bold text-2xl tracking-tighter cursor-pointer">
            UniTrabajo
          </Link>
          
          <div className="hidden md:flex space-x-1">
            <NavLink
              to="/app"
              end
              className={({ isActive }) => 
                `px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-slate-500 hover:text-slate-900'}`
              }
            >
              Micro-trabajos
            </NavLink>
            <NavLink
              to="/app/mensajes"
              className={({ isActive }) => 
                `px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-slate-500 hover:text-slate-900'}`
              }
            >
              Mensajes
            </NavLink>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              data-notifications-trigger
              onClick={toggleNotifications}
              className={`relative p-2 rounded-lg transition-all duration-200 cursor-pointer
                ${isNotificationsOpen 
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              id="notifications-bell-btn"
              aria-label="Notificaciones"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Unread badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Panel */}
            <NotificationsPanel
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onUnreadCountChange={setUnreadCount}
            />
          </div>

          {/* User avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold uppercase">
            {userInitial}
          </div>

          {/* Desktop Logout Button */}
          <button 
            onClick={signOut}
            className="hidden md:block text-sm font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Cerrar Sesión
          </button>

          {/* Mobile / Sidebar Menu toggle */}
          <button 
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-slate-900 p-2 focus:outline-none cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
    );
  }

  // 2. ESTADO PÚBLICO (VISITANTE)
  return (
    <nav className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
      isLandingPage 
        ? 'bg-slate-900/80 border-slate-800 text-white backdrop-blur-md' 
        : 'bg-white/80 border-slate-200 text-slate-900 backdrop-blur-md'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className={`font-black text-2xl tracking-tighter ${
            isLandingPage 
              ? 'text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400' 
              : 'text-brand-blue'
          }`}>
            UniTrabajo
          </span>
        </Link>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Link 
            to="/login" 
            className={`text-sm font-bold px-4 py-2 transition-colors ${
              isLandingPage ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Iniciar Sesión
          </Link>
          <Link 
            to="/register" 
            className={`text-sm font-bold px-4 py-2 rounded-full transition-all duration-200 ${
              isLandingPage 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-brand-blue hover:bg-brand-blue-hover text-white'
            }`}
          >
            Registrarse
          </Link>
        </div>

        {/* Hamburger Mobile Menu Toggle */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={toggleMobileMenu} 
            className={`p-2 focus:outline-none rounded-md ${
              isLandingPage ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <svg className="h-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className={`md:hidden px-4 pt-2 pb-4 border-t transition-all duration-200 ${
          isLandingPage 
            ? 'bg-slate-900 border-slate-800 text-slate-300' 
            : 'bg-white border-slate-200 text-slate-600'
        }`}>
          <div className="flex flex-col space-y-3">
            <Link 
              to="/login" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-bold py-2 ${
                isLandingPage ? 'hover:text-white' : 'hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </Link>
            <Link 
              to="/register" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-bold py-2.5 px-4 rounded-full text-center ${
                isLandingPage 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-brand-blue hover:bg-brand-blue-hover text-white'
              }`}
            >
              Registrarse
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
