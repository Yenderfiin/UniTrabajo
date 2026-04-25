import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Navbar({ toggleSidebar }) {
  const { user, signOut } = useAuth();
  
  // Get initial of user's email or name
  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';

  return (
    <nav className="sticky top-0 z-40 bg-brand-surface shadow-sm border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-6">
        <span className="text-brand-blue font-bold text-2xl tracking-tighter cursor-pointer">UniTrabajo</span>
        
        <div className="hidden md:flex space-x-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) => 
              `px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-slate-500 hover:text-slate-900'}`
            }
          >
            Micro-trabajos
          </NavLink>
          <NavLink
            to="/transporte"
            className={({ isActive }) => 
              `px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-slate-500 hover:text-slate-900'}`
            }
          >
            Transporte Compartido
          </NavLink>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold uppercase">
          {userInitial}
        </div>

        {/* Desktop Logout Button */}
        <button 
          onClick={signOut}
          className="hidden md:block text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          Cerrar Sesión
        </button>

        {/* Mobile / Sidebar Menu toggle */}
        <button 
          onClick={toggleSidebar}
          className="text-slate-500 hover:text-slate-900 p-2 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
