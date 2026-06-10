import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from './Navbar';

export function AuthLayout() {
  const { user } = useAuth();

  // Si ya hay usuario, evitamos que vaya al login y lo mandamos al inicio
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-900 bg-brand-bg relative overflow-hidden">
        <Navbar />

        {/* Background shapes para un diseño más premium */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-100 opacity-50 blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-100 opacity-50 blur-3xl z-0 pointer-events-none"></div>

        <div className="flex-1 flex justify-center items-center py-12 relative z-10">
          <div className="w-full max-w-md px-4">
            <Outlet />
          </div>
        </div>
    </div>
  );
}
