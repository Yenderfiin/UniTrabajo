import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute() {
  const { user } = useAuth();

  // Si no está logeado, mandarlo al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
