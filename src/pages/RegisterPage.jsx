import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { normalizeEmail, isInstitutionalEmail } from '../utils/helpers';

const INSTITUTIONAL_DOMAIN = 'edu.co';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    document: '',
    frt_name: '',
    scd_name: '',
    frt_last_name: '',
    scd_last_name: '',
    phne_number: '',
    user_type: 'Estudiante',
    id_university: '',
    email: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  // Autorización previa e informada (Ley 1581 de 2012, art. 9; Decreto 1377 de 2013, art. 5)
  const [acceptsDataPolicy, setAcceptsDataPolicy] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadUniversities() {
      const { data } = await supabase.from('universities').select('*');
      if (data) setUniversities(data);
    }
    loadUniversities();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Supabase Auth guarda el correo en minúsculas; la tabla users debe coincidir
    // porque toda la aplicación busca el perfil con .eq('email', user.email).
    const email = normalizeEmail(formData.email);
    const doc = formData.document.trim();

    // Validación: correo institucional (solo para Estudiantes)
    const isStudent = formData.user_type === 'Estudiante';
    if (isStudent && !isInstitutionalEmail(email)) {
      setErrorMsg(`El correo debe ser institucional (por ejemplo usuario@ufpso.${INSTITUTIONAL_DOMAIN}).`);
      return;
    }

    if (!/^\d{6,12}$/.test(doc)) {
      setErrorMsg('El documento debe tener entre 6 y 12 dígitos, sin puntos ni espacios.');
      return;
    }

    if (!/^(3\d{9}|60\d{8})$/.test(formData.phne_number.trim())) {
      setErrorMsg('El teléfono debe tener 10 dígitos: celular que empiece por 3 o fijo que empiece por 60.');
      return;
    }

    if (isStudent && !formData.id_university) {
      setErrorMsg('Selecciona tu universidad.');
      return;
    }

    // Validación: confirmación de contraseña
    if (formData.password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor, verifícalas.');
      return;
    }

    if (!acceptsDataPolicy) {
      setErrorMsg('Debes autorizar el tratamiento de tus datos personales para crear la cuenta.');
      return;
    }

    // Validación: longitud mínima de contraseña
    if (formData.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    // 0. Verificar que el documento no exista antes de crear la cuenta en Auth.
    //    Si el insert en users fallaba después del signUp, quedaba una cuenta huérfana.
    //    La función documento_registrado (sql/047) responde sin exponer la tabla;
    //    mientras no exista, se consulta users directamente.
    let docTaken = false;
    const { data: rpcTaken, error: rpcError } = await supabase.rpc('documento_registrado', { doc });
    if (!rpcError) {
      docTaken = rpcTaken === true;
    } else {
      const { data: row } = await supabase
        .from('users')
        .select('document')
        .eq('document', doc)
        .maybeSingle();
      docTaken = Boolean(row);
    }
    if (docTaken) {
      setErrorMsg('Ya existe una cuenta registrada con este documento.');
      setLoading(false);
      return;
    }

    // 1. Auth Signup (guardamos el documento en la metadata)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          document: doc,
          full_name: `${formData.frt_name} ${formData.frt_last_name}`,
          // Prueba de la autorización (Decreto 1377 de 2013, art. 8)
          data_policy_accepted_at: new Date().toISOString()
        }
      }
    });

    if (authError) {
      // Mensaje de error en español para correo ya existente
      if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('user already')) {
        setErrorMsg('Ya existe una cuenta registrada con este correo electrónico.');
      } else {
        setErrorMsg(authError.message);
      }
      setLoading(false);
      return;
    }

    // 2. Insert into public users table
    const { error: dbError } = await supabase.from('users').insert([{
      document: doc,
      frt_name: formData.frt_name.trim(),
      scd_name: formData.scd_name.trim() || null,
      frt_last_name: formData.frt_last_name.trim(),
      scd_last_name: formData.scd_last_name.trim() || null,
      phne_number: formData.phne_number.trim(),
      user_type: formData.user_type,
      status: 'A',
      id_university: isStudent ? parseInt(formData.id_university, 10) : null,
      email
    }]);

    function getErrorMessage(dbError) {
      const messages = {
        "23505": "Documento o correo ya en uso",
        "23503": "El registro relacionado no existe.",
        "23502": "Hay campos obligatorios vacíos.",
        "23514": "El valor no cumple las reglas del campo.",
        "22001": "El texto es demasiado largo para este campo.",
        "22P02": "Formato de dato inválido.",
        "42501": "No tienes permisos para hacer esta operación.",
        "PGRST116": "Se esperaba un solo registro, pero no se encontró o hubo más de uno."
      };

      return messages[dbError.code] || "Error guardando perfil en BD.";
    }

    if (dbError) {
      setErrorMsg(getErrorMessage(dbError));
      setLoading(false);
      return;
    }

    navigate('/app');
  };

  // Derivar si el email tiene dominio incorrecto (solo aplica a Estudiantes)
  const isStudent = formData.user_type === 'Estudiante';
  const emailHasWrongDomain = isStudent && formData.email.includes('@') && formData.email.includes('.') && !isInstitutionalEmail(formData.email);
  const passwordMismatch = confirmPassword.length > 0 && formData.password !== confirmPassword;

  return (
    <Card className="p-8 shadow-2xl border-0 ring-1 ring-slate-200">
      <Link
        to="/"
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-5 group"
      >
        <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
        </svg>
        Volver al inicio
      </Link>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Crear Cuenta</h2>
      <p className="text-sm text-slate-500 mb-6">Completa tus datos para unirte a UniTrabajo.</p>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 break-words">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Document */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Documento de Identidad</label>
          <input type="text" name="document" required value={formData.document} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>

        {/* Nombres y Apellidos en grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Primer Nombre</label>
            <input type="text" name="frt_name" required value={formData.frt_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Primer Apellido</label>
            <input type="text" name="frt_last_name" required value={formData.frt_last_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Segundo Nombre</label>
            <input type="text" name="scd_name" value={formData.scd_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Segundo Apellido</label>
            <input type="text" name="scd_last_name" value={formData.scd_last_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
        </div>

        {/* Teléfono y Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
            <input type="text" name="phne_number" required value={formData.phne_number} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Usuario</label>
            <select name="user_type" value={formData.user_type} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
              <option value="Estudiante">Estudiante</option>
              <option value="Externo">Externo</option>
            </select>
          </div>
        </div>

        {/* Universidad - solo para Estudiantes */}
        {isStudent && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Universidad</label>
            <select name="id_university" required={isStudent} value={formData.id_university} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
              <option value="">Selecciona tu universidad</option>
              {universities.map(u => (
                <option key={u.id_university} value={u.id_university}>{u.name}</option>
              ))}
              {universities.length === 0 && <option value="" disabled>No se pudieron cargar las universidades</option>}
            </select>
          </div>
        )}

        {/* Correo Electrónico */}
        <div className="border-t border-slate-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isStudent ? 'Correo Institucional' : 'Correo Electrónico'}
              {isStudent && (
                <span className="ml-1.5 font-normal text-slate-400">({INSTITUTIONAL_DOMAIN})</span>
              )}
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder={isStudent ? `usuario@ufpso.${INSTITUTIONAL_DOMAIN}` : 'tu@correo.com'}
              className={`w-full bg-slate-50 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors ${emailHasWrongDomain ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
            />
            {emailHasWrongDomain && (
              <p className="mt-1 text-xs text-red-500">
                El correo debe ser de un dominio institucional .{INSTITUTIONAL_DOMAIN}
              </p>
            )}
          </div>
        </div>

        {/* Contraseña y Confirmación */}
        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Mín. 6 caracteres"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className={`w-full bg-slate-50 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors ${passwordMismatch ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
            />
            {passwordMismatch && (
              <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
          <input
            type="checkbox"
            checked={acceptsDataPolicy}
            onChange={(e) => setAcceptsDataPolicy(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
          />
          <span>
            Autorizo a UniTrabajo a tratar mis datos personales (documento, nombres, teléfono y correo) para
            publicar y gestionar vacantes, postulaciones, mensajes y calificaciones, según la Ley 1581 de 2012.
            Puedo consultar, actualizar o pedir la supresión de mis datos escribiendo a soporte.
          </span>
        </label>

        <Button type="submit" variant="primary" className="w-full mt-4" disabled={loading}>
          {loading ? 'Procesando...' : 'Registrarse'}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta? <Link to="/login" className="text-brand-blue font-semibold hover:underline">Inicia sesión</Link>
      </div>
    </Card>
  );
}
