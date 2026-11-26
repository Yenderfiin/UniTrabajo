import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { normalizeEmail, isInstitutionalEmail } from '../utils/helpers';

const INSTITUTIONAL_DOMAIN = 'edu.co';

export function ProfilePage() {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    frt_name: '',
    scd_name: '',
    frt_last_name: '',
    scd_last_name: '',
    phne_number: '',
    email: '',
    user_type: '',
    document: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // true cuando el usuario existe en Auth pero no en la tabla users
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rating, setRating] = useState({ average: 0, count: 0 });

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle(); // Usamos maybeSingle para evitar error si no hay fila
          
        if (error) throw error;
        
        if (data) {
          setFormData({
            frt_name: data.frt_name || '',
            scd_name: data.scd_name || '',
            frt_last_name: data.frt_last_name || '',
            scd_last_name: data.scd_last_name || '',
            phne_number: data.phne_number || '',
            email: data.email || '',
            user_type: data.user_type || '',
            document: data.document || '',
            description: data.description || ''
          });

          // Fetch user ratings
          const { data: ratingsData } = await supabase
            .from('ratings')
            .select('score')
            .eq('document_rated', data.document);

          if (ratingsData) {
            const count = ratingsData.length;
            const average = count > 0 
              ? (ratingsData.reduce((sum, r) => sum + r.score, 0) / count).toFixed(1) 
              : 0;
            setRating({ average: Number(average), count });
          }
        } else {
          setErrorMsg('No se encontró el perfil en la base de datos. Por favor, completa tus datos.');
          // Pre-llenar con lo que tengamos de Auth
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            document: user.user_metadata?.document || '',
            frt_name: user.user_metadata?.full_name?.split(' ')[0] || '',
            frt_last_name: user.user_metadata?.full_name?.split(' ')[1] || '',
            user_type: 'Estudiante' // Valor por defecto
          }));
          setIsNewProfile(true);
          setIsEditing(true); // Forzar modo edición para que puedan crearlo
        }
      } catch (error) {
        console.error('Error loading profile:', error.message);
        setErrorMsg(`Error al cargar: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setMessage(null);
    
    // Validación de correo institucional si es estudiante
    if (formData.user_type === 'Estudiante' && !isInstitutionalEmail(formData.email)) {
      setErrorMsg(`Los estudiantes necesitan un correo institucional .${INSTITUTIONAL_DOMAIN}. Si eres usuario externo, cambia el tipo de usuario.`);
      return;
    }

    if (isNewProfile && !/^\d{6,12}$/.test(formData.document.trim())) {
      setErrorMsg('El documento debe tener entre 6 y 12 dígitos, sin puntos ni espacios.');
      return;
    }

    setSaving(true);

    try {
      // 1. Upsert en tabla 'users' (crea si no existe, actualiza si existe)
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          document: formData.document.trim(), // Necesario como llave principal
          frt_name: formData.frt_name,
          scd_name: formData.scd_name || null,
          frt_last_name: formData.frt_last_name,
          scd_last_name: formData.scd_last_name || null,
          phne_number: formData.phne_number,
          // El correo es la llave que une Auth con users; siempre se guarda el de la sesión
          email: normalizeEmail(user.email),
          user_type: formData.user_type,
          status: 'A', // Campo obligatorio en la BD
          // Solo hay una universidad por el momento; los externos no tienen universidad
          id_university: formData.user_type === 'Estudiante' ? 1 : null,
          description: formData.description || null
        }, { onConflict: 'document' });

      if (dbError) throw dbError;

      // Antes se permitía cambiar el correo aquí: la fila de users quedaba con el
      // correo nuevo mientras Auth seguía con el viejo hasta confirmarlo, y el
      // perfil dejaba de encontrarse. Ahora el correo es de solo lectura.
      setMessage('Tu información ha sido actualizada exitosamente.');
      setIsNewProfile(false);
      setIsEditing(false); // Salir del modo edición al guardar con éxito
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMsg(error.message || 'Ocurrió un error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  const isStudent = formData.user_type === 'Estudiante';

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mi Perfil</h1>
            {formData.document && (
              <div className="flex items-center bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-200" title="Tu calificación basada en valoraciones de otros usuarios">
                <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-bold text-yellow-700">{rating.average}</span>
                <span className="text-xs text-yellow-600 ml-1">({rating.count} {rating.count === 1 ? 'valoración' : 'valoraciones'})</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">Administra tu información personal y datos de contacto.</p>
        </div>
        {!isEditing && (
          <Button 
            onClick={() => setIsEditing(true)} 
            variant="outline" 
            className="mt-4 sm:mt-0"
          >
            Actualizar Datos
          </Button>
        )}
      </div>

      {message && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-center border border-green-100">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-center border border-red-100">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 border-0">
        <form onSubmit={handleUpdate} className="space-y-6">
          
          <div className="border-b border-slate-100 pb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Información Básica</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Primer Nombre</label>
                <input 
                  type="text" 
                  name="frt_name" 
                  required 
                  disabled={!isEditing}
                  value={formData.frt_name} 
                  onChange={handleChange} 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-shadow ${isEditing ? 'bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Segundo Nombre</label>
                <input 
                  type="text" 
                  name="scd_name" 
                  disabled={!isEditing}
                  value={formData.scd_name} 
                  onChange={handleChange} 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-shadow ${isEditing ? 'bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Primer Apellido</label>
                <input 
                  type="text" 
                  name="frt_last_name" 
                  required 
                  disabled={!isEditing}
                  value={formData.frt_last_name} 
                  onChange={handleChange} 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-shadow ${isEditing ? 'bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Segundo Apellido</label>
                <input 
                  type="text" 
                  name="scd_last_name" 
                  disabled={!isEditing}
                  value={formData.scd_last_name} 
                  onChange={handleChange} 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-shadow ${isEditing ? 'bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`} 
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos de Contacto</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Teléfono</label>
                <input 
                  type="text" 
                  name="phne_number" 
                  required 
                  disabled={!isEditing}
                  value={formData.phne_number} 
                  onChange={handleChange} 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-shadow ${isEditing ? 'bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Correo Electrónico
                  {isStudent && <span className="ml-1.5 normal-case font-normal text-slate-400">({INSTITUTIONAL_DOMAIN})</span>}
                </label>
                <input 
                  type="email" 
                  name="email" 
                  readOnly
                  disabled
                  value={formData.email} 
                  title="El correo es tu usuario de acceso y no se puede cambiar desde el perfil"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" 
                />
              </div>
            </div>
            
            <div className="mt-6 flex bg-slate-50 p-4 rounded-lg border border-slate-200">
              <svg className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-slate-600 font-medium">Información estática</p>
                
                {/* Permite editar documento si está vacío (creación de perfil) */}
                {(isNewProfile && isEditing) ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Documento</label>
                      <input type="text" name="document" required value={formData.document} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Tipo de Usuario</label>
                      <select name="user_type" value={formData.user_type} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                        <option value="Estudiante">Estudiante</option>
                        <option value="Externo">Externo</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    El tipo de usuario ({formData.user_type || 'No especificado'}) y documento de identidad ({formData.document || 'No especificado'}) no pueden ser modificados tras el registro.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Perfil Profesional</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Descripción y Habilidades</label>
              <textarea 
                name="description" 
                rows="4"
                disabled={!isEditing}
                value={formData.description} 
                onChange={handleChange} 
                placeholder="Escribe un poco sobre ti, tus fortalezas, experiencia y las habilidades que ofreces..."
                className={`w-full border rounded-lg px-4 py-3 text-sm transition-shadow resize-y ${isEditing ? 'bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`} 
              />
              <p className="mt-1.5 text-xs text-slate-500">Menciona tus habilidades clave aquí para que otros usuarios puedan encontrarlas fácilmente.</p>
            </div>
          </div>



          {isEditing && (
            <div className="pt-6 border-t border-slate-100 flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                className="px-8 py-2.5 shadow-md shadow-brand-blue/20" 
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar Cambios'}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
