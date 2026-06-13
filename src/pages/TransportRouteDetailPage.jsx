import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

function formatDateTime(value) {
  if (!value) return 'Fecha por definir';

  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function TransportRouteDetailPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [ride, setRide] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [currentUserDoc, setCurrentUserDoc] = useState(null);
  const [hasExistingReservation, setHasExistingReservation] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reservationMessage, setReservationMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchRideDetail() {
      if (!offerId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      // Obtener documento del usuario actual
      if (user?.email) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('document')
          .eq('email', user.email)
          .single();

        if (!userError && userData) {
          setCurrentUserDoc(userData.document);
        }
      }

      const { data: rideData, error: rideError } = await supabase
        .from('offers')
        .select(`
          id_offer,
          description,
          create_at,
          status,
          document_employer,
          users!document_employer ( document, frt_name, frt_last_name, email, user_type ),
          detail_travels ( origin, destination, departure_time, avaliable_seats, plate )
        `)
        .eq('id_offer', offerId)
        .eq('type_offer', 'Transporte')
        .maybeSingle();

      if (rideError) {
        setError('No fue posible cargar los detalles de la ruta.');
        setLoading(false);
        return;
      }

      if (!rideData || !rideData.detail_travels) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRide(rideData);

      // Verificar si el usuario ya tiene una reserva en esta ruta
      if (user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('document')
          .eq('email', user.email)
          .single();

        if (userData) {
          const { data: existingApp } = await supabase
            .from('aplications')
            .select('id_offer')
            .eq('id_offer', offerId)
            .eq('document', userData.document)
            .maybeSingle();

          if (existingApp) {
            setHasExistingReservation(true);
          }
        }
      }

      const driverDocument = rideData.document_employer || rideData.users?.document;
      const plate = rideData.detail_travels?.plate;

      const [vehicleResult, ratingsResult] = await Promise.all([
        plate
          ? supabase
              .from('vehicles')
              .select('type, plate, capacity')
              .eq('plate', plate)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        driverDocument
          ? supabase
              .from('ratings')
              .select('score')
              .eq('document_rated', driverDocument)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (vehicleResult.error) {
        setError('No fue posible cargar la información del vehículo.');
        setLoading(false);
        return;
      }

      setVehicle(vehicleResult.data || null);

      const ratingsData = ratingsResult.data || [];
      const count = ratingsData.length;
      const average = count > 0
        ? (ratingsData.reduce((sum, current) => sum + current.score, 0) / count).toFixed(1)
        : 0;

      setRating({ average: Number(average), count });
      setLoading(false);
    }

    fetchRideDetail();
  }, [offerId, user?.email]);

  const details = ride?.detail_travels || {};
  const driver = ride?.users || {};
  const driverName = driver.document ? `${driver.frt_name || ''} ${driver.frt_last_name || ''}`.trim() : 'Conductor no disponible';
  const hasRating = rating.count > 0;
  const isOwnRide = currentUserDoc && driver.document === currentUserDoc;
  const hasAvailableSeats = (details.avaliable_seats || 0) > 0;

  const handleReserve = async () => {
    if (!user?.email) {
      setReservationMessage({ type: 'error', text: 'Debes estar autenticado para reservar.' });
      return;
    }

    if (isOwnRide) {
      setReservationMessage({ type: 'error', text: 'No puedes reservar una ruta que tú mismo publicaste.' });
      return;
    }

    if (!hasAvailableSeats) {
      setReservationMessage({ type: 'error', text: 'No hay puestos disponibles en esta ruta.' });
      return;
    }

    if (hasExistingReservation) {
      setReservationMessage({ type: 'error', text: 'Ya tienes una reserva para esta ruta.' });
      return;
    }

    setReserving(true);
    setReservationMessage({ type: '', text: '' });

    try {
      // Crear la reserva
      const { error: appError } = await supabase.from('aplications').insert({
        id_offer: offerId,
        document: currentUserDoc,
        app_status: 'Pendiente'
      });

      if (appError) throw new Error('No se pudo crear la reserva.');

      // Actualizar puestos disponibles
      const newAvailableSeats = (details.avaliable_seats || 1) - 1;
      const { error: updateError } = await supabase
        .from('detail_travels')
        .update({ avaliable_seats: newAvailableSeats })
        .eq('id_offer', offerId);

      if (updateError) throw new Error('No se pudo actualizar los puestos disponibles.');

      // Crear notificación al conductor
      await supabase.from('notifications').insert({
        user_document: ride.document_employer,
        type: 'new_travel_reservation',
        message: `Alguien ha reservado un puesto en tu ruta de ${details.origin} a ${details.destination}.`
      });

      // Actualizar el estado local
      setRide(prev => ({
        ...prev,
        detail_travels: { ...prev.detail_travels, avaliable_seats: newAvailableSeats }
      }));

      setHasExistingReservation(true);
      setReservationMessage({ type: 'success', text: '¡Reserva confirmada! Tu puesto ha sido asegurado. El conductor podrá contactarte en breve.' });

      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => setReservationMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('Error en la reserva:', err);
      setReservationMessage({ type: 'error', text: err.message || 'No se pudo procesar tu reserva. Intenta nuevamente.' });
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Cargando detalles de la ruta...</div>;
  }

  if (notFound) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Ruta no disponible</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">No encontramos esta ruta de transporte</h1>
        <p className="mt-3 text-sm text-slate-600">
          La ruta pudo haber sido eliminada o ya no está disponible para consulta.
        </p>
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="primary" onClick={() => navigate('/app/transporte')}>
            Volver al listado
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="outline" onClick={() => navigate('/app/transporte')}>
            Volver al listado
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">Detalle de ruta</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{details.origin || 'Origen'} a {details.destination || 'Destino'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revisa la información completa antes de decidir si deseas postularte.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => navigate('/app/transporte')}>
          Volver al listado
        </Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Información del viaje</p>
              <h2 className="text-2xl font-bold text-slate-900">
                {details.origin || 'Origen no disponible'} {' '}
                <span className="text-slate-400">-</span> {' '}
                {details.destination || 'Destino no disponible'}
              </h2>
              <p className="text-sm text-slate-500">Publicada el {formatDateTime(ride?.create_at)}</p>
            </div>

            <div className={`rounded-2xl px-4 py-3 text-sm ${
              hasAvailableSeats 
                ? 'bg-blue-50 text-brand-blue' 
                : 'bg-rose-50 text-rose-700'
            }`}>
              <p className="font-semibold">Puestos disponibles</p>
              <p className="text-2xl font-bold">{details.avaliable_seats || 0}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Salida</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{formatDateTime(details.departure_time)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vehículo</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {vehicle ? `${vehicle.type || 'Vehiculo'} - ${vehicle.plate || 'Sin placa'} - ${vehicle.capacity || 0} puesto(s)` : 'Sin informacion de vehiculo'}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Descripción</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {ride?.description || 'No se registró una descripción para esta ruta.'}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Conductor</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">{driverName}</h3>
            <p className="mt-1 text-sm text-slate-500">{driver.email || 'Correo no disponible'}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-800">Documento:</span> {driver.document || 'No registrado'}</p>
              <p><span className="font-medium text-slate-800">Tipo de usuario:</span> {driver.user_type || 'No disponible'}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-700">Calificación</p>
              {hasRating ? (
                <p className="mt-1 text-2xl font-bold text-yellow-800">
                  {rating.average} / 5.0
                  <span className="ml-2 text-sm font-medium text-yellow-700">({rating.count} {rating.count === 1 ? 'valoración' : 'valoraciones'})</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-yellow-800">Este conductor todavía no tiene calificaciones registradas.</p>
              )}
            </div>
          </Card>

          <Card className="p-5 bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">Antes de postularte</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Verifica origen, destino, hora de salida y capacidad disponible. Si la ruta sigue activa, podrás decidir con más contexto si te conviene unirte.
            </p>

            {reservationMessage.text && (
              <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                reservationMessage.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}>
                {reservationMessage.text}
              </div>
            )}

            {!isOwnRide && (
              <Button
                type="button"
                variant="primary"
                disabled={!hasAvailableSeats || hasExistingReservation || reserving || !user?.email}
                onClick={handleReserve}
                className="mt-4 w-full"
              >
                {reserving ? 'Procesando...' : hasExistingReservation ? 'Ya reservaste esta ruta' : !hasAvailableSeats ? 'Sin puestos disponibles' : !user?.email ? 'Inicia sesión para reservar' : 'Reservar puesto'}
              </Button>
            )}

            {isOwnRide && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-700">Esta es tu ruta. No puedes reservar un puesto.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}