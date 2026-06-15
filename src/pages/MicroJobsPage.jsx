import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  formatDate,
  formatPayment,
  getCategoryIcon,
  getCategoryColor,
  getEmployerName,
  getInitials
} from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'Todas',
  'Limpieza',
  'Mantenimiento',
  'Asesoría',
  'Tecnología',
  'Mensajería',
  'Ayuda con tareas',
  'Otro'
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Más recientes' },
  { value: 'date_asc', label: 'Más antiguas' },
  { value: 'payment_desc', label: 'Mayor pago' },
  { value: 'payment_asc', label: 'Menor pago' },
];

export function MicroJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  const [userType, setUserType] = useState(null);
  const [myApplications, setMyApplications] = useState([]);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState('date_desc');

  // Modal publicar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    payment: '',
    date: '',
    location: '',
    hours: ''
  });

  // Modal detalle
  const [selectedJob, setSelectedJob] = useState(null);
  const navigate = useNavigate();

  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id_offer,
        description,
        create_at,
        status,
        document_employer,
        users!document_employer ( frt_name, frt_last_name ),
        job_details ( category, payment, hours )
      `)
      .in('type_offer', ['Trabajo', 'Tutoría', 'Mensajería'])
      .eq('status', 'Pendiente')
      .order('create_at', { ascending: false });

    if (data) {
      setJobs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function fetchUserDoc() {
      if (user?.email) {
        const { data } = await supabase
          .from('users')
          .select('document, user_type')
          .eq('email', user.email)
          .single();
        if (data) {
          setUserDoc(data.document);
          setUserType(data.user_type);

          // Fetch user's applications
          const { data: appsData } = await supabase
            .from('aplications')
            .select('id_offer')
            .eq('document', data.document);

          if (appsData) {
            setMyApplications(appsData.map(a => a.id_offer));
          }
        }
      }
    }
    fetchUserDoc();
    fetchJobs();
  }, [user]);

  // Filtrado y ordenamiento
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Filtro por categoría
    if (activeCategory !== 'Todas') {
      result = result.filter(job => {
        const details = job.job_details || {};
        return details.category === activeCategory;
      });
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(job => {
        const details = job.job_details || {};
        const employer = job.users;
        const employerName = employer ? `${employer.frt_name} ${employer.frt_last_name}` : '';
        return (
          (job.description || '').toLowerCase().includes(q) ||
          (details.category || '').toLowerCase().includes(q) ||
          employerName.toLowerCase().includes(q)
        );
      });
    }

    // Ordenamiento
    result.sort((a, b) => {
      const detailsA = a.job_details || {};
      const detailsB = b.job_details || {};
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.create_at) - new Date(a.create_at);
        case 'date_asc':
          return new Date(a.create_at) - new Date(b.create_at);
        case 'payment_desc':
          return (detailsB.payment || 0) - (detailsA.payment || 0);
        case 'payment_asc':
          return (detailsA.payment || 0) - (detailsB.payment || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, searchQuery, activeCategory, sortBy]);

  // Conteo por categoría
  const categoryCounts = useMemo(() => {
    const counts = { Todas: jobs.length };
    CATEGORIES.forEach(cat => {
      if (cat !== 'Todas') {
        counts[cat] = jobs.filter(j => (j.job_details || {}).category === cat).length;
      }
    });
    return counts;
  }, [jobs]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePublishJob = async (e) => {
    e.preventDefault();
    if (!userDoc) {
      setErrorMsg('Debes completar tu perfil antes de publicar un trabajo.');
      return;
    }

    // Validar que la fecha no sea anterior a hoy
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setErrorMsg('La fecha del servicio no puede ser anterior a hoy.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const fullDescription = `Título: ${formData.title}\n\n${formData.description}\n\n📍 Ubicación: ${formData.location}\n📅 Fecha: ${formData.date}`;
      const idOffer = `OFR-${Math.floor(10000 + Math.random() * 90000)}`;

      const { error: offerError } = await supabase.from('offers').insert({
        id_offer: idOffer,
        type_offer: 'Trabajo',
        description: fullDescription,
        status: 'Pendiente',
        document_employer: userDoc,
        document_employee: userDoc
      });

      if (offerError) throw offerError;

      const { error: detailsError } = await supabase.from('job_details').insert({
        id_offer: idOffer,
        category: formData.category,
        payment: Number(formData.payment),
        hours: formData.hours ? Number(formData.hours) : null
      });

      if (detailsError) throw detailsError;

      // Limpiar y cerrar
      setIsModalOpen(false);
      setFormData({ title: '', description: '', category: '', payment: '', date: '', location: '', hours: '' });

      // Recargar trabajos
      fetchJobs();
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Error al publicar el trabajo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isApplying, setIsApplying] = useState(false);

  const handleApplyJob = async (job) => {
    if (!userDoc || userType !== 'Estudiante') return;
    if (job.document_employer === userDoc) return; // No puede postularse a su propia vacante
    
    // HU-054: Validar que la vacante no esté cerrada
    if (job.status !== 'Pendiente') {
      alert('No puedes postularte a una vacante que no está disponible.');
      return;
    }

    setIsApplying(true);
    try {
      // 1. Insert application
      const { error: appError } = await supabase.from('aplications').insert({
        id_offer: job.id_offer,
        document: userDoc,
        app_status: 'Pendiente'
      });

      if (appError) {
        if (appError.code === '23505') {
          alert('Ya te has postulado a este trabajo.');
          setMyApplications(prev => [...prev, job.id_offer]);
        } else {
          throw appError;
        }
      } else {
        setMyApplications(prev => [...prev, job.id_offer]);

        // 2. Insert notification for employer
        // Find employer document. offers table has document_employer
        const { data: offerData } = await supabase
          .from('offers')
          .select('document_employer')
          .eq('id_offer', job.id_offer)
          .single();

        if (offerData?.document_employer) {
          await supabase.from('notifications').insert({
            user_document: offerData.document_employer,
            type: 'new_application',
            message: `Alguien se ha postulado a tu vacante de "${job.job_details?.category || 'Trabajo General'}".`
          });
        }

        alert('¡Te has postulado exitosamente!');
      }
    } catch (error) {
      console.error(error);
      alert('Error al postularte. ' + (error.message || ''));
    } finally {
      setIsApplying(false);
    }
  };



  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
      {/* ── Columna Izquierda: Filtro por categorías ── */}
      <div className="hidden lg:block lg:col-span-1">
        <div className="sticky top-20 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-brand-blue to-blue-600">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Categorías
              </h3>
            </div>
            <div className="p-2">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 mb-0.5
                      ${isActive
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{cat === 'Todas' ? '🌐' : getCategoryIcon(cat)}</span>
                      <span className="font-medium">{cat}</span>
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Enlaces rápidos: Mis Vacantes y Mis Postulaciones */}
          <div className="space-y-2">
            <button
              onClick={() => navigate('/app/mis-vacantes')}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mis Vacantes
            </button>
            <button
              onClick={() => navigate('/app/mis-postulaciones')}
              className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Mis Postulaciones
            </button>
          </div>
        </div>
      </div>

      {/* ── Columna Central: Contenido principal ── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Barra de búsqueda y publicar */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar vacantes por título, categoría..."
                id="search-jobs-input"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
                  transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)} className="shrink-0 gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Publicar
            </Button>
          </div>
        </Card>

        {/* Filtros móvil + ordenar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Categorías horizontales en móvil */}
          <div className="lg:hidden flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 pb-1">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border
                      ${isActive
                        ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue hover:text-brand-blue'
                      }`}
                  >
                    {cat === 'Todas' ? '🌐' : getCategoryIcon(cat)} {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              id="sort-jobs-select"
              className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados info */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            {loading ? 'Cargando...' : (
              <>
                <span className="font-semibold text-slate-700">{filteredJobs.length}</span>
                {' '}vacante{filteredJobs.length !== 1 ? 's' : ''} encontrada{filteredJobs.length !== 1 ? 's' : ''}
                {activeCategory !== 'Todas' && (
                  <span className="ml-1">
                    en <span className="font-semibold text-brand-blue">{activeCategory}</span>
                  </span>
                )}
                {searchQuery && (
                  <span className="ml-1">
                    para "<span className="font-semibold">{searchQuery}</span>"
                  </span>
                )}
              </>
            )}
          </p>
          {(activeCategory !== 'Todas' || searchQuery) && (
            <button
              onClick={() => { setActiveCategory('Todas'); setSearchQuery(''); }}
              className="text-xs text-brand-blue hover:underline font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Lista de vacantes */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-full mt-3"></div>
                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-semibold text-slate-700 mb-1">No se encontraron vacantes</h3>
            <p className="text-sm text-slate-500 mb-4">
              {searchQuery || activeCategory !== 'Todas'
                ? 'Intenta ajustar tus filtros o buscar con otros términos.'
                : 'Aún no hay micro-trabajos publicados. ¡Sé el primero!'}
            </p>
            {(searchQuery || activeCategory !== 'Todas') && (
              <Button
                variant="outline"
                onClick={() => { setActiveCategory('Todas'); setSearchQuery(''); }}
                className="text-xs"
              >
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          filteredJobs.map(job => {
            const employerName = getEmployerName(job);
            const details = job.job_details || {};
            const catColor = getCategoryColor(details.category);

            return (
              <Card
                key={job.id_offer}
                className="p-0 group cursor-pointer hover:shadow-lg hover:border-brand-blue/30 transition-all duration-300"
                onClick={() => setSelectedJob(job)}
                id={`job-card-${job.id_offer}`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-blue to-blue-500 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white font-bold text-sm">{getInitials(employerName)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                            {details.category || 'Trabajo General'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {employerName} · {formatDate(job.create_at)}
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200`}>
                          {formatPayment(details.payment)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-wrap mb-3">
                    {job.description}
                  </p>

                  {/* Tags y meta info */}
                  <div className="flex flex-wrap items-center gap-2">
                    {details.category && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                        {getCategoryIcon(details.category)} {details.category}
                      </span>
                    )}
                    {details.hours && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {details.hours}h estimadas
                      </span>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                      }}
                    >
                      Ver detalle
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {userType === 'Estudiante' && job.document_employer !== userDoc && (
                    <div className="mt-4 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="primary"
                        onClick={() => handleApplyJob(job)}
                        disabled={isApplying || myApplications.includes(job.id_offer)}
                      >
                        {myApplications.includes(job.id_offer) ? 'Ya postulado' : 'Aplicar al trabajo'}
                      </Button>
                    </div>
                  )}
                  {userType === 'Estudiante' && job.document_employer === userDoc && (
                    <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tu vacante publicada
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Columna Derecha: Resumen ── */}
      <div className="hidden lg:block lg:col-span-1">
        <div className="sticky top-20 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Resumen
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Vacantes activas</span>
                <span className="text-sm font-bold text-slate-800">{jobs.length}</span>
              </div>
              <div className="h-px bg-slate-100"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Categorías con ofertas</span>
                <span className="text-sm font-bold text-slate-800">
                  {Object.values(categoryCounts).filter((v, i) => i > 0 && v > 0).length}
                </span>
              </div>
              <div className="h-px bg-slate-100"></div>
              {jobs.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">Categoría popular</span>
                  <div className="mt-1">
                    {(() => {
                      const topCat = Object.entries(categoryCounts)
                        .filter(([k]) => k !== 'Todas')
                        .sort((a, b) => b[1] - a[1])[0];
                      if (!topCat || topCat[1] === 0) return null;
                      return (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue bg-blue-50 px-2 py-1 rounded-full">
                          {getCategoryIcon(topCat[0])} {topCat[0]}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-2">💡 Consejo</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Usa los filtros de categoría y la barra de búsqueda para encontrar rápidamente oportunidades que se ajusten a tu disponibilidad.
            </p>
          </Card>
        </div>
      </div>

      {/* ── Modal: Detalle de Vacante ── */}
      {selectedJob && (() => {
        const job = selectedJob;
        const employerName = getEmployerName(job);
        const details = job.job_details || {};
        const catColor = getCategoryColor(details.category);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedJob(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'slideUp 0.3s ease-out' }}
            >
              {/* Header con gradiente */}
              <div className="relative bg-gradient-to-r from-brand-blue to-blue-600 px-6 py-5 rounded-t-2xl">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-bold text-lg">{getInitials(employerName)}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {details.category || 'Trabajo General'}
                    </h2>
                    <p className="text-blue-100 text-sm">Publicado por {employerName}</p>
                  </div>
                </div>
              </div>

              {/* Info cards */}
              <div className="px-6 -mt-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Pago</p>
                    <p className="text-sm font-bold text-emerald-600">{formatPayment(details.payment)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Duración</p>
                    <p className="text-sm font-bold text-slate-800">{details.hours ? `${details.hours}h` : 'Flexible'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Estado</p>
                    <p className="text-sm font-bold text-brand-blue">{job.status}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Categoría badge */}
                {details.category && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categoría</h4>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                      {getCategoryIcon(details.category)} {details.category}
                    </span>
                  </div>
                )}

                {/* Descripción completa */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descripción completa</h4>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {job.description}
                    </p>
                  </div>
                </div>

                {/* Fecha publicación */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fecha de publicación</h4>
                  <p className="text-sm text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(job.create_at).toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{formatDate(job.create_at)}</span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedJob(null)}>
                  Regresar al listado
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={async () => {
                    // Iniciar conversación defensiva
                    try {
                      if (!userDoc) {
                        alert('Necesitas completar tu perfil antes de iniciar una conversación.');
                        return;
                      }

                      const employerDoc = job.document_employer;
                      const participantA = employerDoc;
                      const participantB = userDoc;

                      // Intentar buscar conversación existente en tabla 'conversations'
                      const { data: existing, error: selErr } = await supabase
                        .from('conversations')
                        .select('*')
                        .or(`(participant_a.eq.${participantA},participant_b.eq.${participantB}),(participant_a.eq.${participantB},participant_b.eq.${participantA})`)
                        .eq('id_offer', job.id_offer)
                        .limit(1);

                      if (selErr && selErr.code === '42883') {
                        // Table not found or function error - fallback
                      }

                      if (existing && existing.length > 0) {
                        const conv = existing[0];
                        navigate(`/app/mensajes?conversation=${conv.id}`);
                        return;
                      }

                      // Insert new conversation if table exists
                      const newConv = {
                        id: `CONV-${Math.floor(100000 + Math.random() * 900000)}`,
                        id_offer: job.id_offer,
                        participant_a: participantA,
                        participant_b: participantB,
                        created_at: new Date().toISOString()
                      };

                      const { data: insertData, error: insertErr } = await supabase
                        .from('conversations')
                        .insert(newConv)
                        .select()
                        .limit(1);

                      if (insertErr) {
                        // If table doesn't exist or insert fails, fallback to notify
                        await supabase.from('notifications').insert({
                          user_document: employerDoc,
                          type: 'new_message',
                          message: `${user?.user_metadata?.full_name || user?.email || 'Un usuario'} desea iniciar una conversación sobre tu oferta ${job.id_offer}`
                        });
                        // Redirect to messages module (will show offer-based conversations if applicable)
                        navigate('/app/mensajes');
                        return;
                      }

                      const created = Array.isArray(insertData) ? insertData[0] : insertData;
                      navigate(`/app/mensajes?conversation=${created.id || created.id_conversation || newConv.id}`);
                    } catch (err) {
                      console.error('Error iniciando conversación:', err);
                      alert('No fue posible iniciar la conversación. Intenta más tarde.');
                    }
                  }}
                >
                  Enviar mensaje
                </Button>
                {userType === 'Estudiante' && job.document_employer !== userDoc && (
                  <Button
                    variant="primary"
                    className="flex-1 gap-1.5"
                    disabled={isApplying || myApplications.includes(job.id_offer)}
                    onClick={() => handleApplyJob(job)}
                  >
                    {isApplying ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    ) : myApplications.includes(job.id_offer) ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {myApplications.includes(job.id_offer) ? 'Ya postulado' : isApplying ? 'Postulando...' : 'Postularme'}
                  </Button>
                )}
                {userType === 'Estudiante' && job.document_employer === userDoc && (
                  <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tu vacante publicada
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Publicar Vacante ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-800">Publicar Micro-trabajo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePublishJob} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título de la vacante *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ej. Limpieza profunda de apartamento"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Asesoría">Asesoría</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Mensajería">Mensajería</option>
                  <option value="Ayuda con tareas">Ayuda con tareas</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción detallada *</label>
                <textarea
                  name="description"
                  required
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe qué se necesita hacer exactamente..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none resize-y transition-all"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pago Ofrecido ($) *</label>
                  <input
                    type="number"
                    name="payment"
                    required
                    min="1000"
                    value={formData.payment}
                    onChange={handleInputChange}
                    placeholder="Ej. 50000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horas estimadas</label>
                  <input
                    type="number"
                    name="hours"
                    min="1"
                    value={formData.hours}
                    onChange={handleInputChange}
                    placeholder="Ej. 2"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del servicio *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    min={getTodayDate()}
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación *</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ej. Edificio A, Piso 3"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Publicando...' : 'Publicar Vacante'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animación CSS inline */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
