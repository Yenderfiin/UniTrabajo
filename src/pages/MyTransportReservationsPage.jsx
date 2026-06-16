import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate, formatPayment } from '../utils/helpers';

export function MyTransportReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Estados para calificar conductor (HU-060)
  const [isRatingDriverModalOpen, setIsRatingDriverModalOpen] = useState(false);
  const [ratingDriverReservation, setRatingDriverReservation] = useState(null);
  const [ratedDriver, setRatedDriver] = useState(null);
  const [isSubmittingDriverRating, setIsSubmittingDriverRating] = useState(false);
  const [driverRatingMsg, setDriverRatingMsg] = useState(null);
  const [driverRatingFormData, setDriverRatingFormData] = useState({
    score: 5,
    comment: ''
  });
  const [existingDriverRating, setExistingDriverRating] = useState(null);

  const fetchMyReservations = async () => {
    setLoading(true);
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener documento del usuario (pasajero)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('document')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        throw new Error('No se pudo encontrar la información de perfil.');
      }

      // 2. Obtener reservas del usuario en rutas de transporte
      const { data, error } = await supabase
        .from('aplications')
        .select(`
          id_offer,
          document,
          app_status,
          created_at,
          offers (
            id_offer,
            description,
            create_at,
            status,
            type_offer,
            document_employer,
            document_employee,
            detail_travels (
              origin,
              destination,
              departure_time,
              avaliable_seats,
              plate
            ),
            job_details ( category, payment, hours )
          )
        `)
        .eq('document', userData.document)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar solo rutas de transporte (type_offer = 'Transporte')
      const transportReservations = (data || []).filter(app => app.offers?.type_offer === 'Transporte');

      setReservations(transportReservations);
    } catch (err) {
      console.error('[HU-060] Error al cargar reservas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // HU-060: Abrir modal para calificar conductor
  const handleOpenDriverRating = async (reservation, e) => {
    if (e) e.stopPropagation();

    const offer = reservation.offers || {};

    // Validaciones
    if (reservation.app_status !== 'Aceptado' && reservation.app_status !== 'Aceptada') {
      alert('Solo puedes calificar conductores en reservas aceptadas.');
      return;
    }

    if (offer.status !== 'Finalizada') {
      alert('La ruta debe estar en estado "Finalizada" para calificar al conductor.');
      return;
    }

    if (!offer.document_employer) {
      alert('No hay información del conductor registrada.');
      return;
    }

    setRatingDriverReservation(reservation);
    setDriverRatingFormData({ score: 5, comment: '' });
    setDriverRatingMsg(null);
    setIsRatingDriverModalOpen(true);
    setSelectedReservation(null);

    // Cargar datos del conductor
    try {
      const { data: driverData, error: driverError } = await supabase
        .from('users')
        .select('document, frt_name, scd_name, frt_last_name, scd_last_name')
        .eq('document', offer.document_employer)
        .single();

      if (driverError) {
        console.error('[HU-060] Error al cargar datos del conductor:', driverError);
        setRatedDriver(null);
      } else if (driverData) {
        setRatedDriver(driverData);
      }
    } catch (err) {
      console.error('[HU-060] Error al cargar conductor:', err);
    }

    // Verificar si ya existe una calificación
    try {
      const { data: existingRatingData, error: ratingError } = await supabase
        .from('ratings')
        .select('*')
        .eq('id_offer', reservation.id_offer)
        .eq('document_rater', reservation.document)
        .eq('document_rated', offer.document_employer)
        .maybeSingle();

      if (ratingError) {
        console.error('[HU-060] Error al verificar calificación existente:', ratingError);
      } else if (existingRatingData) {
        setExistingDriverRating(existingRatingData);
        setDriverRatingFormData({
          score: existingRatingData.score,
          comment: existingRatingData.comment || ''
        });
        setDriverRatingMsg({
          type: 'info',
          text: `Ya calificaste a este conductor con ${existingRatingData.score} estrella${existingRatingData.score > 1 ? 's' : ''}.`
        });
      }
    } catch (err) {
      console.error('[HU-060] Error al cargar calificación existente:', err);
    }
  };

  // HU-060: Enviar calificación del conductor
  const handleSubmitDriverRating = async () => {
    if (!ratingDriverReservation) return;
    setIsSubmittingDriverRating(true);
    setDriverRatingMsg(null);

    try {
      const reservation = ratingDriverReservation;
      const offer = reservation.offers || {};
      const passengerDoc = reservation.document;
      const driverDoc = offer.document_employer;
      const offerId = reservation.id_offer;

      // Validar: solo el pasajero aceptado puede calificar
      const { data: validateData } = await supabase
        .from('aplications')
        .select('app_status')
        .eq('id_offer', offerId)
        .eq('document', passengerDoc)
        .maybeSingle();

      if (!validateData || validateData.app_status !== 'Aceptado') {
        throw new Error('Solo pasajeros aceptados pueden calificar.');
      }

      // Si ya existe calificación, eliminar primero
      if (existingDriverRating) {
        const { error: deleteError } = await supabase
          .from('ratings')
          .delete()
          .eq('id_offer', offerId)
          .eq('document_rater', passengerDoc)
          .eq('document_rated', driverDoc);

        if (deleteError) throw deleteError;
      }

      // Insertar la nueva calificación
      const { error: insertError } = await supabase
        .from('ratings')
        .insert({
          id_offer: offerId,
          document_rater: passengerDoc,
          document_rated: driverDoc,
          score: Number(driverRatingFormData.score),
          comment: driverRatingFormData.comment || null
        });

      if (insertError) throw insertError;

      // Notificar al conductor
      await supabase.from('notifications').insert({
        user_document: driverDoc,
        type: 'driver_rated',
        message: `Te han calificado con ${driverRatingFormData.score} estrella${driverRatingFormData.score > 1 ? 's' : ''} como conductor.`
      });

      setDriverRatingMsg({
        type: 'success',
        text: `¡Calificación registrada exitosamente! Le diste ${driverRatingFormData.score} estrella${driverRatingFormData.score > 1 ? 's' : ''} al conductor.`
      });
      setExistingDriverRating(null);
      setTimeout(() => {
        setIsRatingDriverModalOpen(false);
        setRatedDriver(null);
        fetchMyReservations();
      }, 2000);
    } catch (error) {
      console.error('[HU-060] Error al calificar:', error);
      setDriverRatingMsg({
        type: 'error',
        text: error.message || 'Error al registrar la calificación.'
      });
    } finally {
      setIsSubmittingDriverRating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando tus reservas...</p>
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="text-5xl mb-4">🚗</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Aún no tienes reservas</h2>
        <p className="text-slate-500 text-sm mb-6">Aquí aparecerán todas las rutas de transporte compartido a las que te hayas sumado.</p>
        <Button variant="primary" onClick={() => window.location.href = '/app/transporte'}>
          Ver rutas disponibles
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Mis Reservas de Transporte</h2>
        <p className="text-sm text-slate-500">Consulta y valora tus reservas en rutas de transporte compartido.</p>
      </div>

      <div className="space-y-4">
        {reservations.map((reservation, index) => {
          const offer = reservation.offers || {};
          const travel = offer.detail_travels || {};
          const statusColor =
            reservation.app_status === 'Aceptado' || reservation.app_status === 'Aceptada'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

          return (
            <Card
              key={`${reservation.id_offer}-${index}`}
              className="p-5 group cursor-pointer hover:shadow-md hover:border-brand-blue/30 transition-all duration-300"
              onClick={() => setSelectedReservation(reservation)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 text-white shrink-0 shadow-sm font-bold text-base">
                  🚗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-blue transition-colors text-base">
                        {travel.origin || 'Origen'} → {travel.destination || 'Destino'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Reservado {formatDate(reservation.created_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusColor}`}>
                      {reservation.app_status || 'Pendiente'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center mt-4 gap-3 text-xs">
                    {travel.departure_time && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                        📅 {new Date(travel.departure_time).toLocaleDateString('es-CO')}
                      </span>
                    )}
                    {travel.departure_time && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                        🕐 {new Date(travel.departure_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {offer.status === 'Finalizada' && (reservation.app_status === 'Aceptado' || reservation.app_status === 'Aceptada') && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium px-2 py-1 rounded-md hover:bg-yellow-50 transition-colors hover:cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDriverRating(reservation, e);
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Calificar
                      </button>
                    )}
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-brand-blue hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedReservation(reservation)}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Modal: Calificar Conductor (HU-060) ── */}
      {isRatingDriverModalOpen && ratingDriverReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !isSubmittingDriverRating && (setIsRatingDriverModalOpen(false), setRatedDriver(null))}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-5 rounded-t-2xl">
              <button
                onClick={() => {
                  setIsRatingDriverModalOpen(false);
                  setRatedDriver(null);
                }}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                disabled={isSubmittingDriverRating}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xl">🚗</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Calificar Conductor</h2>
                  <p className="text-yellow-100 text-sm">
                    {ratingDriverReservation.offers?.detail_travels?.origin || 'Ruta'} → {ratingDriverReservation.offers?.detail_travels?.destination}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Información del conductor */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold shrink-0">
                  {ratedDriver?.frt_name ? ratedDriver.frt_name.substring(0, 1).toUpperCase() : 'D'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {ratedDriver
                      ? `${ratedDriver.frt_name || ''} ${ratedDriver.scd_name ? ratedDriver.scd_name + ' ' : ''}${ratedDriver.frt_last_name || ''} ${ratedDriver.scd_last_name || ''}`.trim()
                      : 'Conductor'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{ratingDriverReservation.offers?.document_employer}</p>
                </div>
              </div>

              {/* Mensaje informativo */}
              {driverRatingMsg && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border text-sm
                    ${
                      driverRatingMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : driverRatingMsg.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}
                >
                  <svg
                    className="w-5 h-5 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {driverRatingMsg.type === 'success' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : driverRatingMsg.type === 'error' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <span>{driverRatingMsg.text}</span>
                </div>
              )}

              {/* Puntuación con estrellas */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Puntuación (1 a 5 estrellas)
                </label>
                <div className="flex items-center justify-center gap-3 p-5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={isSubmittingDriverRating}
                      onClick={() => setDriverRatingFormData({ ...driverRatingFormData, score: star })}
                      className={`transition-all transform hover:scale-110 disabled:opacity-50
                        ${
                          star <= driverRatingFormData.score
                            ? 'text-yellow-500 scale-110'
                            : 'text-slate-300 hover:text-yellow-400'
                        }`}
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Has seleccionado <span className="font-bold text-amber-600">{driverRatingFormData.score}</span> estrella{driverRatingFormData.score > 1 ? 's' : ''}
                </p>
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comentario (opcional)
                </label>
                <textarea
                  rows="3"
                  maxLength="500"
                  disabled={isSubmittingDriverRating}
                  value={driverRatingFormData.comment}
                  onChange={(e) => setDriverRatingFormData({ ...driverRatingFormData, comment: e.target.value })}
                  placeholder="Comparte tu experiencia en el viaje (máx. 500 caracteres)..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {driverRatingFormData.comment.length}/500 caracteres
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsRatingDriverModalOpen(false);
                  setRatedDriver(null);
                }}
                disabled={isSubmittingDriverRating}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isSubmittingDriverRating || driverRatingMsg?.type === 'success'}
                onClick={handleSubmitDriverRating}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isSubmittingDriverRating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Guardar Calificación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
