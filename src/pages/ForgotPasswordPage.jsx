import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage('Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu correo electrónico.');
    }
    setLoading(false);
  };

  return (
    <Card className="p-8 shadow-2xl border-0 ring-1 ring-slate-200 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Recuperar contraseña</h2>
      <p className="text-sm text-slate-500 mb-6">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
      
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

      <form onSubmit={handleResetPassword} className="space-y-4">
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
        
        <Button 
          type="submit" 
          variant="primary" 
          className="w-full mt-2" 
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-6">
        <Link to="/login" className="text-brand-blue font-semibold hover:underline">Volver a inicio de sesión</Link>
      </div>
    </Card>
  );
}
