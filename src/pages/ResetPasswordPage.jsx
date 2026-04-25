import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage('Contraseña actualizada correctamente. Redirigiendo...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <Card className="p-8 shadow-2xl border-0 ring-1 ring-slate-200 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Nueva contraseña</h2>
      
      {!session ? (
        <div className="text-center">
          <div className="bg-amber-50 text-amber-700 p-4 rounded-md text-sm mb-6 text-left">
            <p className="font-semibold mb-1">No hay una sesión activa.</p>
            <p>Para cambiar tu contraseña, debes acceder utilizando el enlace que enviamos a tu correo electrónico.</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
            Ir a Iniciar Sesión
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-6">Ingresa tu nueva contraseña para actualizarla.</p>
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {errorMsg}
            </div>
          )}
          
          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="••••••••"
              />
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-2" 
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
