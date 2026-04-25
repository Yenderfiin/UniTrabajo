import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link, useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <Card className="p-8 shadow-2xl border-0 ring-1 ring-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido de vuelta</h2>
      <p className="text-sm text-slate-500 mb-6">Ingresa tus credenciales para acceder a tu cuenta.</p>
      
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
          <input 
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">Contraseña</label>
            <Link to="/forgot-password" className="text-xs text-brand-blue hover:underline font-medium">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
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
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-6">
        ¿No tienes una cuenta? <Link to="/register" className="text-brand-blue font-semibold hover:underline">Regístrate aquí</Link>
      </div>
    </Card>
  );
}
