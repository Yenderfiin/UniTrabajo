import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export function StudentRoute() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserType() {
      if (!user?.email) {
        if (isMounted) {
          setIsStudent(false);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('user_type')
        .eq('email', user.email)
        .single();

      if (isMounted) {
        setIsStudent(data?.user_type === 'Estudiante');
        setLoading(false);
      }
    }

    fetchUserType();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-4 text-slate-500">
        Verificando acceso...
      </div>
    );
  }

  if (!isStudent) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}