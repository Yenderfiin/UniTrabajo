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
