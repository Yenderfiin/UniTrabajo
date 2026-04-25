import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AuthLayout() {
  const { user } = useAuth();

  // Si ya hay usuario, evitamos que vaya al login y lo mandamos al inicio
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex justify-center items-center text-slate-900 bg-brand-bg relative overflow-hidden">
        {/* Background shapes para un diseño más premium */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-100 opacity-50 blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-100 opacity-50 blur-3xl z-0 pointer-events-none"></div>

        <div className="w-full max-w-md px-4 relative z-10">
          <div className="text-center mb-8">
             <Link to="/" className="text-brand-blue font-bold text-3xl tracking-tighter cursor-pointer">UniTrabajo</Link>
          </div>
          <Outlet />
        </div>
    </div>
  );
}
