export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Hace unos minutos';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatPayment = (amount) => {
  if (!amount) return 'A convenir';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
};

export const getCategoryIcon = (category) => {
  const icons = {
    'Limpieza': '🧹',
    'Mantenimiento': '🔧',
    'Asesoría': '📚',
    'Tecnología': '💻',
    'Mensajería': '📦',
    'Ayuda con tareas': '✏️',
    'Otro': '📋',
  };
  return icons[category] || '💼';
};

export const getCategoryColor = (category) => {
  const colors = {
    'Limpieza': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', ring: 'ring-cyan-400' },
    'Mantenimiento': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-400' },
    'Asesoría': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', ring: 'ring-violet-400' },
    'Tecnología': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', ring: 'ring-blue-400' },
    'Mensajería': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', ring: 'ring-orange-400' },
    'Ayuda con tareas': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', ring: 'ring-rose-400' },
    'Otro': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', ring: 'ring-slate-400' },
  };
  return colors[category] || colors['Otro'];
};

export const getEmployerName = (job) => {
  const employer = job.users;
  return employer ? `${employer.frt_name} ${employer.frt_last_name}` : 'Usuario Anónimo';
};

export const getInitials = (name) => {
  return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
};

export const parseDescription = (fullDesc) => {
  if (!fullDesc) return { title: '', description: '', location: '', date: '' };
  
  // Tratar de hacer matching con expresiones regulares
  const titleMatch = fullDesc.match(/^Título:\s*(.*?)(?:\n\n|\r\n\r\n|$)/m);
  const locationMatch = fullDesc.match(/📍 Ubicación:\s*(.*?)(?:\n|\r|$)/m);
  const dateMatch = fullDesc.match(/📅 Fecha:\s*(.*?)(?:\n|\r|$)/m);
  
  let description = fullDesc;
  let title = '';
  let location = '';
  let date = '';
  
  if (titleMatch) {
    title = titleMatch[1];
    description = description.replace(titleMatch[0], '');
  }
  
  if (locationMatch) {
    location = locationMatch[1];
    description = description.replace(locationMatch[0], '');
  }
  
  if (dateMatch) {
    date = dateMatch[1];
    description = description.replace(dateMatch[0], '');
  }
  
  // Limpiar espacios en blanco al inicio y al final
  description = description.trim();
  
  return { title, description, location, date };
};

export const buildDescription = (title, description, location, date) => {
  return `Título: ${title}\n\n${description}\n\n📍 Ubicación: ${location}\n📅 Fecha: ${date}`;
};

// Categorías base del formulario de publicación. Los datos pueden traer otras
// (por ejemplo las de carga masiva), por eso los filtros las agregan al vuelo.
export const JOB_CATEGORIES = [
  'Limpieza',
  'Mantenimiento',
  'Asesoría',
  'Tecnología',
  'Mensajería',
  'Ayuda con tareas',
  'Otro',
];

// Tipos de oferta que se muestran como micro-trabajo (Transporte quedó fuera).
export const MICROJOB_TYPES = ['Trabajo', 'Tutoría', 'Mensajería', 'Servicio'];

// Estados de una vacante que aún recibe postulaciones. 'Activa' viene de los
// datos de prueba; la aplicación publica con 'Pendiente'.
export const OPEN_OFFER_STATUSES = ['Pendiente', 'Activa'];

export const isOfferOpen = (status) => OPEN_OFFER_STATUSES.includes(status);

// En la tabla aplications conviven 'Aceptado'/'Aceptada' y 'Rechazado'/'Rechazada'.
// La aplicación escribe la forma femenina y lee ambas.
export const APP_STATUS = { PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada' };

export const isAppAccepted = (status) => ['aceptada', 'aceptado'].includes((status || '').toLowerCase());
export const isAppRejected = (status) => ['rechazada', 'rechazado'].includes((status || '').toLowerCase());

// Fecha local en formato YYYY-MM-DD. toISOString() devuelve la fecha en UTC y en
// Colombia (UTC-5) eso corre el día después de las 7 p. m.
export const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Compara cadenas YYYY-MM-DD; new Date('YYYY-MM-DD') se interpreta en UTC y
// hacía que el día de hoy pareciera "anterior a hoy".
export const isPastDate = (dateStr) => Boolean(dateStr) && dateStr < getLocalDateString();

export const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// Acepta cualquier dominio institucional colombiano (ufpso.edu.co, unal.edu.co...).
export const isInstitutionalEmail = (email) => /^[^\s@]+@([a-z0-9-]+\.)+edu\.co$/.test(normalizeEmail(email));
