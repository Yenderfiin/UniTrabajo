import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function RatingsHistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentUserDoc, setCurrentUserDoc] = useState('');
  const [receivedRatings, setReceivedRatings] = useState([]);
  const [givenRatings, setGivenRatings] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [averageScore, setAverageScore] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  // Cargar documento del usuario autenticado
  useEffect(() => {
    async function fetchUserDocument() {
      if (!user?.email) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('document')
          .eq('email', user.email)
          .single();

        if (error) throw error;
        setCurrentUserDoc(data.document);
      } catch (err) {
        console.error('[HU-062] Error cargando documento del usuario:', err);
      }
    }

    fetchUserDocument();
  }, [user]);

  // Cargar historial de calificaciones
  useEffect(() => {
    if (!currentUserDoc) return;

    const loadRatingsHistory = async () => {
      setLoading(true);
      try {
        // 1. Obtener calificaciones RECIBIDAS (donde document_rated = currentUserDoc)
        const { data: received, error: receivedError } = await supabase
          .from('ratings')
          .select(`
            id_offer,
            score,
            comment,
            document_rater,
            offers (
              type_offer,
              description,
              create_at
            ),
            users!ratings_document_rater_fkey (
              frt_name,
              scd_name,
              frt_last_name,
              scd_last_name
            )
          `)
          .eq('document_rated', currentUserDoc);

        if (receivedError) throw receivedError;

        // 2. Obtener calificaciones EMITIDAS (donde document_rater = currentUserDoc)
        const { data: given, error: givenError } = await supabase
          .from('ratings')
          .select(`
            id_offer,
            score,
            comment,
            document_rated,
            offers (
              type_offer,
              description,
              create_at
            ),
            users!ratings_document_rated_fkey (
              frt_name,
              scd_name,
              frt_last_name,
              scd_last_name
            )
          `)
          .eq('document_rater', currentUserDoc);

        if (givenError) throw givenError;

        // Ordenar ambas listas por fecha de oferta (descendente)
        const sortByOfferDate = (ratings) => {
          return [...ratings].sort((a, b) => {
            const dateA = new Date(a.offers?.create_at || 0);
            const dateB = new Date(b.offers?.create_at || 0);
            return dateB - dateA;
          });
        };

        const sortedReceived = sortByOfferDate(received || []);
        const sortedGiven = sortByOfferDate(given || []);

        setReceivedRatings(sortedReceived);
        setGivenRatings(sortedGiven);

        // Calcular promedio y conteo de calificaciones recibidas
        if (sortedReceived && sortedReceived.length > 0) {
          const sum = sortedReceived.reduce((acc, r) => acc + r.score, 0);
          const avg = (sum / sortedReceived.length).toFixed(1);
          setAverageScore(Number(avg));
          setRatingCount(sortedReceived.length);
        }
      } catch (err) {
        console.error('[HU-062] Error cargando historial de calificaciones:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRatingsHistory();
  }, [currentUserDoc]);

  const getRatingsList = () => {
    return activeTab === 'received' ? receivedRatings : givenRatings;
  };

  const getOtherPersonName = (rating) => {
    const users = activeTab === 'received' ? rating.users : rating.users;
    if (!users) return 'Usuario desconocido';
    return `${users.frt_name || ''} ${users.scd_name ? users.scd_name + ' ' : ''}${users.frt_last_name || ''} ${users.scd_last_name || ''}`.trim() || 'Usuario anónimo';
  };

  const getOfferType = (rating) => {
    const typeOffer = rating.offers?.type_offer;
    if (typeOffer === 'Transporte') {
      return { label: 'Ruta de Transporte', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: 'Vacante de Trabajo', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  };

  const renderStars = (score) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < score ? 'text-yellow-500' : 'text-slate-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando historial de calificaciones...</p>
        </div>
      </div>
    );
  }

  const ratingsList = getRatingsList();
  const hasNoRatings = receivedRatings.length === 0 && givenRatings.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Historial de Calificaciones</h1>
        <p className="text-sm text-slate-500 mt-1">Visualiza todas las calificaciones que has recibido y emitido en UniTrabajo.</p>
      </div>

      {/* Resumen de puntuación (solo si tiene calificaciones recibidas) */}
      {receivedRatings.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm text-slate-600 font-medium">Tu Puntuación General</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-4xl font-bold text-yellow-600">{averageScore}</div>
                <div className="space-y-2">
                  <div className="flex gap-1">{renderStars(Math.round(averageScore))}</div>
                  <p className="text-xs text-slate-600">Basado en {ratingCount} calificación{ratingCount !== 1 ? 'es' : ''}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-yellow-500">★</div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'received'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Calificaciones Recibidas ({receivedRatings.length})
        </button>
        <button
          onClick={() => setActiveTab('given')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'given'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Calificaciones Emitidas ({givenRatings.length})
        </button>
      </div>

      {/* Contenido vacío */}
      {hasNoRatings ? (
        <Card className="p-12 text-center bg-white border border-slate-100 rounded-2xl">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sin calificaciones aún</h2>
          <p className="text-slate-500 text-sm">
            {activeTab === 'received'
              ? 'Aún no has recibido calificaciones. Completa vacantes o viajes para que otros usuarios te califiquen.'
              : 'Aún no has emitido calificaciones. Finaliza vacantes o viajes para calificar a otros usuarios.'}
          </p>
        </Card>
      ) : ratingsList.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-100 rounded-2xl">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sin calificaciones en esta sección</h2>
          <p className="text-slate-500 text-sm">
            {activeTab === 'received'
              ? 'No has recibido calificaciones aún.'
              : 'No has emitido calificaciones aún.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {ratingsList.map((rating, index) => {
            const offerType = getOfferType(rating);
            const ratingDate = rating.offers?.create_at
              ? new Date(rating.offers.create_at).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : 'Fecha desconocida';
            const personName = getOtherPersonName(rating);

            return (
              <Card key={`${rating.id_offer}-${index}`} className="p-5 hover:shadow-md transition-all border-slate-200">
                <div className="space-y-4">
                  {/* Encabezado */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-base">{personName}</h3>
                      <p className="text-xs text-slate-500 mt-1">{ratingDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${offerType.color}`}>
                        {offerType.label === 'Ruta de Transporte' ? '🚗' : '💼'} {offerType.label}
                      </span>
                    </div>
                  </div>

                  {/* Puntuación */}
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100 w-fit">
                    <div className="flex gap-0.5">{renderStars(rating.score)}</div>
                    <span className="text-sm font-semibold text-yellow-700 ml-1">{rating.score}/5</span>
                  </div>

                  {/* Comentario */}
                  {rating.comment && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{rating.comment}</p>
                    </div>
                  )}

                  {/* Contexto */}
                  {rating.offers?.description && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Descripción del servicio</p>
                      <p className="text-sm text-slate-600 line-clamp-2">{rating.offers.description}</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
