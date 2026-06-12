import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate, formatPayment, getCategoryIcon, getCategoryColor, parseDescription } from '../utils/helpers';

export function MyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchMyApplications = async () => {
    setLoading(true);
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener documento del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('document')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        throw new Error('No se pudo encontrar la información de perfil del usuario.');
      }

      // 2. Obtener postulaciones junto con las ofertas y detalles de trabajo
      const { data, error } = await supabase
        .from('aplications')
        .select(`
          id_offer,
          document,
          app_status,
          offers (
            id_offer,
            description,
            create_at,
            status,
            job_details ( category, payment, hours )
          )
        `)
        .eq('document', userData.document);

      if (error) throw error;

      // 3. Ordenar postulaciones por fecha de creación de la oferta (más reciente primero)
      const sorted = (data || []).sort((a, b) => {
        const dateA = new Date(a.offers?.create_at || 0);
        const dateB = new Date(b.offers?.create_at || 0);
        return dateB - dateA;
      });

      setApplications(sorted);
    } catch (err) {
      console.error('Error al cargar postulaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusInfo = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'aceptado' || s === 'aceptada') {
      return {
        text: 'Aceptada',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (s === 'rechazado' || s === 'rechazada') {
      return {
        text: 'Rechazada',
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500'
      };
    }
    return {
      text: 'Pendiente',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando tus postulaciones...</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Aún no te has postulado</h2>
        <p className="text-slate-500 text-sm mb-6">Aquí aparecerán todas las vacantes de trabajo a las que te hayas postulado dentro de la comunidad universitaria.</p>
        <Button variant="primary" onClick={() => window.location.href = '/app'}>
          Ver bolsa de empleo
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Mis Postulaciones</h2>
        <p className="text-sm text-slate-500">Realiza seguimiento y consulta el estado de las vacantes a las que te has postulado.</p>
      </div>

      <div className="space-y-4">
        {applications.map((app, index) => {
          const offer = app.offers || {};
          const details = offer.job_details || {};
          const catColor = getCategoryColor(details.category);
          const statusInfo = getStatusInfo(app.app_status);
          const parsed = parseDescription(offer.description);

          return (
            <Card
              key={`${app.id_offer}-${index}`}
              className="p-5 group cursor-pointer hover:shadow-md hover:border-brand-blue/30 transition-all duration-300"
              onClick={() => setSelectedApp(app)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shrink-0 shadow-sm font-bold text-base">
                  {getCategoryIcon(details.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-blue transition-colors text-base truncate">
                        {parsed.title || details.category || 'Trabajo General'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Oferta publicada {formatDate(offer.create_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`}></span>
                      {statusInfo.text}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                    {parsed.description || offer.description}
                  </p>

                  <div className="flex flex-wrap items-center mt-4 gap-3 text-xs">
                    {details.category && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border} font-medium`}>
                        {details.category}
                      </span>
                    )}
                    {details.hours && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                        {details.hours}h estimadas
                      </span>
                    )}
                    <span className="shrink-0 inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      {formatPayment(details.payment)}
                    </span>
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-brand-blue hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedApp(app)}
                    >
                      Ver detalle de postulación
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Modal: Detalle de Postulación ── */}
      {selectedApp && (() => {
        const app = selectedApp;
        const offer = app.offers || {};
        const details = offer.job_details || {};
        const catColor = getCategoryColor(details.category);
        const statusInfo = getStatusInfo(app.app_status);
        const parsed = parseDescription(offer.description);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedApp(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'slideUp 0.3s ease-out' }}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-brand-blue to-blue-600 px-6 py-5 rounded-t-2xl">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">{getCategoryIcon(details.category)}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {parsed.title || details.category || 'Trabajo General'}
                    </h2>
                    <p className="text-blue-100 text-sm">Postulación de vacante</p>
                  </div>
                </div>
              </div>

              {/* Info cards */}
              <div className="px-6 -mt-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Remuneración</p>
                    <p className="text-sm font-bold text-emerald-600">{formatPayment(details.payment)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Duración</p>
                    <p className="text-sm font-bold text-slate-800">{details.hours ? `${details.hours}h` : 'Flexible'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm flex flex-col justify-center items-center">
                    <p className="text-xs text-slate-500 mb-0.5">Estado</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Categoría */}
                {details.category && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categoría</h4>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                      {getCategoryIcon(details.category)} {details.category}
                    </span>
                  </div>
                )}

                {/* Ubicación y fecha */}
                {(parsed.location || parsed.date) && (
                  <div className="grid grid-cols-2 gap-4">
                    {parsed.location && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ubicación</h4>
                        <p className="text-sm text-slate-700 flex items-center gap-1.5">
                          <span>📍</span> {parsed.location}
                        </p>
                      </div>
                    )}
                    {parsed.date && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha Programada</h4>
                        <p className="text-sm text-slate-700 flex items-center gap-1.5">
                          <span>📅</span> {parsed.date}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Descripción completa */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descripción de la Vacante</h4>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {parsed.description || offer.description}
                    </p>
                  </div>
                </div>

                {/* Fecha publicación */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fecha de publicación</h4>
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(offer.create_at).toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <Button variant="outline" className="w-full" onClick={() => setSelectedApp(null)}>
                  Cerrar Detalle
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
