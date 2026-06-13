import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function TransportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const destinationOptions = ['Universidad sede Algodonal', 'Universidad sede Primavera'];
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userDoc, setUserDoc] = useState('');
  const [currentUserDoc, setCurrentUserDoc] = useState('');
  const [userVehicle, setUserVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');
  const [publishForm, setPublishForm] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    seats: '',
    notes: ''
  });
  const [reservationStates, setReservationStates] = useState({});
  const [userReservations, setUserReservations] = useState(new Set());

  const vehicleCapacity = Number(userVehicle?.capacity || 0);
  const canPublishRoute = Boolean(userDoc && userVehicle);

  const handleReserveFromList = async (ride) => {
    const offerId = ride.id_offer;

    if (!user?.email) {
      setReservationStates(prev => ({
        ...prev,
        [offerId]: { reserving: false, message: { type: 'error', text: 'Debes estar autenticado para reservar.' } }
      }));
      return;
    }

    const details = ride.detail_travels || {};
    const driverDoc = ride.document_employer;
    const hasAvailableSeats = (details.avaliable_seats || 0) > 0;
    const isOwnRide = currentUserDoc && driverDoc === currentUserDoc;

    if (isOwnRide) {
      setReservationStates(prev => ({
        ...prev,
        [offerId]: { reserving: false, message: { type: 'error', text: 'No puedes reservar una ruta que tú mismo publicaste.' } }
      }));
      return;
    }

    if (!hasAvailableSeats) {
      setReservationStates(prev => ({
        ...prev,
        [offerId]: { reserving: false, message: { type: 'error', text: 'No hay puestos disponibles en esta ruta.' } }
      }));
      return;
    }

    setReservationStates(prev => ({
      ...prev,
      [offerId]: { reserving: true, message: { type: '', text: '' } }
    }));

    try {
      // Verificar si ya tiene una reserva
      if (userReservations.has(offerId)) {
        setReservationStates(prev => ({
          ...prev,
          [offerId]: { reserving: false, message: { type: 'error', text: 'Ya tienes una reserva para esta ruta.' } }
        }));
        return;
      }

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
        user_document: driverDoc,
        type: 'new_travel_reservation',
        message: `Alguien ha reservado un puesto en tu ruta de ${details.origin} a ${details.destination}.`
      });

      // Actualizar la lista de viajes con los puestos reducidos
      setRides(prevRides =>
        prevRides.map(r =>
          r.id_offer === offerId
            ? {
                ...r,
                detail_travels: { ...r.detail_travels, avaliable_seats: newAvailableSeats }
              }
            : r
        )
      );

      // Agregar a reservas del usuario
      setUserReservations(prev => new Set([...prev, offerId]));

      setReservationStates(prev => ({
        ...prev,
        [offerId]: {
          reserving: false,
          message: { type: 'success', text: '¡Reserva confirmada! Tu puesto ha sido asegurado.' }
        }
      }));

      // Limpiar el mensaje después de 4 segundos
      setTimeout(() => {
        setReservationStates(prev => ({
          ...prev,
          [offerId]: { reserving: false, message: { type: '', text: '' } }
        }));
      }, 4000);
    } catch (err) {
      console.error('Error en la reserva:', err);
      setReservationStates(prev => ({
        ...prev,
        [offerId]: {
          reserving: false,
          message: { type: 'error', text: err.message || 'No se pudo procesar tu reserva. Intenta nuevamente.' }
        }
      }));
    }
  };

  const fetchRides = async () => {
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
        detail_travels ( origin, destination, departure_time, avaliable_seats )
      `)
      .eq('type_offer', 'Transporte')
      .eq('status', 'Pendiente')
      .order('create_at', { ascending: false });

    if (error) {
      console.error('Error loading transport rides:', error);
    }

    if (data) {
      setRides(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRides();
  }, []);

  useEffect(() => {
    async function fetchUserContext() {
      if (!user?.email) {
        setUserDoc('');
        setCurrentUserDoc('');
        setUserVehicle(null);
        setUserReservations(new Set());
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('document, user_type')
          .eq('email', user.email)
          .maybeSingle();

        if (userError) throw userError;

        const userDocument = userData?.document || '';
        setUserDoc(userDocument);
        setCurrentUserDoc(userDocument);

        if (userDocument) {
          const { data: vehicleData, error: vehicleError } = await supabase
            .from('vehicles')
            .select('type, plate, capacity')
            .eq('document', userDocument)
            .maybeSingle();

          if (vehicleError) throw vehicleError;

          setUserVehicle(vehicleData || null);

          // Cargar reservas existentes del usuario
          const { data: existingReservations, error: reservError } = await supabase
            .from('aplications')
            .select('id_offer')
            .eq('document', userDocument);

          if (!reservError && existingReservations) {
            const reservationSet = new Set(existingReservations.map(r => r.id_offer));
            setUserReservations(reservationSet);
          }
        } else {
          setUserVehicle(null);
          setUserReservations(new Set());
        }
      } catch (error) {
        console.error('Error loading transport profile:', error);
        setUserDoc('');
        setCurrentUserDoc('');
        setUserVehicle(null);
        setUserReservations(new Set());
      } finally {
        setProfileLoading(false);
      }
    }

    fetchUserContext();
  }, [user]);

  const handlePublishInputChange = (event) => {
    const { name, value } = event.target;
    setPublishForm((current) => ({ ...current, [name]: value }));
  };

  const handleOpenPublishModal = () => {
    if (!canPublishRoute) {
      setPublishError('Debes tener tu perfil completo y un vehículo registrado para publicar una ruta.');
      return;
    }

    setPublishError('');
    setPublishSuccess('');
    setIsPublishModalOpen(true);
  };

  const handlePublishRoute = async (event) => {
    event.preventDefault();

    if (!canPublishRoute) {
      setPublishError('Debes registrar un vehículo antes de publicar una ruta.');
      return;
    }

    const seats = Number(publishForm.seats);

    if (!publishForm.origin.trim() || !publishForm.destination.trim() || !publishForm.departureTime || !seats) {
      setPublishError('Completa origen, destino, fecha y hora, y puestos disponibles.');
      return;
    }

    if (seats > vehicleCapacity) {
      setPublishError(`La cantidad de puestos no puede superar la capacidad registrada de tu vehículo (${vehicleCapacity}).`);
      return;
    }

    setIsPublishing(true);
    setPublishError('');
    setPublishSuccess('');

    const idOffer = `OFR-${Math.floor(10000 + Math.random() * 90000)}`;
    const description = publishForm.notes.trim()
      ? `Ruta compartida: ${publishForm.origin.trim()} a ${publishForm.destination.trim()}. ${publishForm.notes.trim()}`
      : `Ruta compartida de ${publishForm.origin.trim()} a ${publishForm.destination.trim()} con ${seats} puesto(s) disponibles.`;

    try {
      const { error: offerError } = await supabase.from('offers').insert({
        id_offer: idOffer,
        type_offer: 'Transporte',
        description,
        status: 'Pendiente',
        document_employer: userDoc,
        document_employee: userDoc
      });

      if (offerError) throw offerError;

      const { error: travelError } = await supabase.from('detail_travels').insert({
        id_offer: idOffer,
        origin: publishForm.origin.trim(),
        destination: publishForm.destination.trim(),
        departure_time: new Date(publishForm.departureTime).toISOString(),
        avaliable_seats: seats,
        plate: userVehicle.plate
      });

      if (travelError) {
        await supabase.from('offers').delete().eq('id_offer', idOffer);
        throw travelError;
      }

      setPublishSuccess('La ruta fue publicada correctamente y ya está disponible para otros usuarios.');
      setIsPublishModalOpen(false);
      setPublishForm({
        origin: '',
        destination: '',
        departureTime: '',
        seats: '',
        notes: ''
      });
      await fetchRides();
    } catch (error) {
      console.error('Error publishing transport route:', error);
      setPublishError(error.message || 'No fue posible publicar la ruta.');
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredRides = useMemo(() => {
    let result = [...rides];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((ride) => {
        const details = ride.detail_travels || {};
        const driver = ride.users;
        const driverName = driver ? `${driver.frt_name || ''} ${driver.frt_last_name || ''}` : '';

        return (
          (ride.description || '').toLowerCase().includes(q) ||
          (details.origin || '').toLowerCase().includes(q) ||
          (details.destination || '').toLowerCase().includes(q) ||
          driverName.toLowerCase().includes(q)
        );
      });
    }

    if (originFilter.trim()) {
      const originQuery = originFilter.toLowerCase();
      result = result.filter((ride) => {
        const details = ride.detail_travels || {};
        return (details.origin || '').toLowerCase().includes(originQuery);
      });
    }

    if (destinationFilter.trim()) {
      const destinationQuery = destinationFilter.toLowerCase();
      result = result.filter((ride) => {
        const details = ride.detail_travels || {};
        return (details.destination || '').toLowerCase().includes(destinationQuery);
      });
    }

    if (travelDate) {
      result = result.filter((ride) => {
        const details = ride.detail_travels || {};
        if (!details.departure_time) return false;
        return new Date(details.departure_time).toISOString().slice(0, 10) === travelDate;
      });
    }

    if (minSeats) {
      const seatsThreshold = Number(minSeats);
      result = result.filter((ride) => {
        const details = ride.detail_travels || {};
        return Number(details.avaliable_seats || 0) >= seatsThreshold;
      });
    }

    result.sort((a, b) => {
      const detailsA = a.detail_travels || {};
      const detailsB = b.detail_travels || {};

      switch (sortBy) {
        case 'date_asc':
          return new Date(detailsA.departure_time || 0) - new Date(detailsB.departure_time || 0);
        case 'date_desc':
        default:
          return new Date(detailsB.departure_time || 0) - new Date(detailsA.departure_time || 0);
      }
    });

    return result;
  }, [rides, searchQuery, originFilter, destinationFilter, travelDate, minSeats, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setOriginFilter('');
    setDestinationFilter('');
    setTravelDate('');
    setMinSeats('');
    setSortBy('date_desc');
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">Módulo de movilidad</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transporte Compartido</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Encuentra y gestiona ofertas de transporte universitario entre estudiantes de forma rápida y segura.
          </p>
        </div>
    
      </section>

      {(publishError || publishSuccess) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${publishSuccess
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {publishSuccess || publishError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="hidden lg:block lg:col-span-1">
          <Card className="p-4 sticky top-20">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 mb-2"></div>
              <h3 className="font-semibold text-slate-800">Mi Perfil</h3>
              <p className="text-sm text-slate-500">{profileLoading ? 'Verificando perfil...' : userVehicle ? `${userVehicle.type} registrado` : 'Sin vehículo registrado'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 space-y-2">
              <p className="font-medium text-slate-800">{profileLoading ? 'Cargando información de transporte...' : canPublishRoute ? `Capacidad máxima: ${vehicleCapacity} puesto(s)` : 'Registra un vehículo en tu perfil para publicar rutas.'}</p>
              {!profileLoading && userVehicle && (
                <p className="text-xs text-slate-500">
                  {userVehicle.type} · Placa {userVehicle.plate}
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={handleOpenPublishModal} disabled={profileLoading || !canPublishRoute}>
              Ofrecer Viaje
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 bg-white border border-slate-200 shadow-sm">
             <div className="space-y-4">
               <div className="flex flex-col gap-1">
                 <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Búsqueda y filtros</p>
                 <h2 className="text-lg font-semibold text-slate-900">Encuentra transporte compatible más rápido</h2>
                 <p className="text-sm text-slate-500">Busca por ruta, conductor o descripción y refina los resultados con filtros pensados para crecer con nuevas opciones.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                 <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                   Búsqueda general
                   <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Ruta, conductor o palabra clave"
                     className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                   />
                 </label>

                 <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                   Origen
                   <input
                     type="text"
                     value={originFilter}
                     onChange={(e) => setOriginFilter(e.target.value)}
                     placeholder="Campus, barrio, estación"
                     className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                   />
                 </label>

                 <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                   Destino
                   <input
                     type="text"
                     value={destinationFilter}
                     onChange={(e) => setDestinationFilter(e.target.value)}
                     placeholder="Campus, barrio, estación"
                     className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                   />
                 </label>

                 <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                   Fecha de salida
                   <input
                     type="date"
                     value={travelDate}
                     onChange={(e) => setTravelDate(e.target.value)}
                     className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                   />
                 </label>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                   Asientos mínimos
                   <select
                     value={minSeats}
                     onChange={(e) => setMinSeats(e.target.value)}
                     className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                   >
                     <option value="">Cualquiera</option>
                     <option value="1">1</option>
                     <option value="2">2 </option>
                     <option value="3">3</option>
                   
                   </select>
                 </label>

                 <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
                   Ordenar por
                   <select
                     value={sortBy}
                     onChange={(e) => setSortBy(e.target.value)}
                     className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                   >
                     <option value="date_desc">Más recientes</option>
                     <option value="date_asc">Más antiguas</option>
                   </select>
                 </label>

                 <div className="flex items-end">
                   <Button variant="outline" className="w-full md:w-auto" onClick={clearFilters}>
                     Limpiar filtros
                   </Button>
                 </div>
               </div>
             </div>
          </Card>

          {loading ? (
            <div className="text-center py-10 text-slate-500">Buscando viajes...</div>
          ) : filteredRides.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 mb-2">No se encontraron viajes con los filtros actuales.</p>
              <p className="text-xs text-slate-400">Prueba a ampliar la búsqueda o limpiar los filtros para ver todas las ofertas disponibles.</p>
            </div>
          ) : (
            filteredRides.map(ride => {
              const user = ride.users;
              const details = ride.detail_travels || {}; // Relación de uno a uno en la BD
              const driverName = user ? `${user.frt_name} ${user.frt_last_name}` : 'Conductor';
              const departureTime = details.departure_time ? new Date(details.departure_time).toLocaleString() : 'Fecha por definir';
              const reservationState = reservationStates[ride.id_offer] || { reserving: false, message: { type: '', text: '' } };
              const hasAvailableSeats = (details.avaliable_seats || 0) > 0;
              const isOwnRide = currentUserDoc && ride.document_employer === currentUserDoc;

              return (
            <Card key={ride.id_offer} className="p-0 hover:shadow-md transition-shadow">
              <div className="p-4 flex space-x-3">
                 <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                   <span className="text-sky-600 font-bold">{driverName.charAt(0)}</span>
                 </div>
                 <div className="flex-1">
                   <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900">{details.origin || '?'} ➔ {details.destination || '?'}</h4>
                        <p className="text-sm text-slate-500 font-medium">{departureTime}</p>
                        <p className={`text-xs mt-0.5 ${hasAvailableSeats ? 'text-slate-400' : 'text-rose-600 font-medium'}`}>Conductor: {driverName} • Asientos disp: {details.avaliable_seats || 0}</p>
                      </div>
                   </div>
                   <p className="text-sm text-slate-700 mt-2 line-clamp-2">{ride.description}</p>
                   
                   {reservationState.message.text && (
                     <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                       reservationState.message.type === 'success'
                         ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                         : 'border border-rose-200 bg-rose-50 text-rose-700'
                     }`}>
                       {reservationState.message.text}
                     </div>
                   )}

                    <div className="mt-3 flex space-x-2">
                      {!isOwnRide ? (
                        <Button
                          variant="primary"
                          disabled={!hasAvailableSeats || reservationState.reserving || userReservations.has(ride.id_offer)}
                          onClick={() => handleReserveFromList(ride)}
                        >
                          {reservationState.reserving ? 'Procesando...' : userReservations.has(ride.id_offer) ? 'Reservado' : !hasAvailableSeats ? 'Sin puestos' : 'Reservar Asiento'}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="opacity-60">
                          Tu ruta
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/app/transporte/${ride.id_offer}`)}
                      >
                        Consultar detalles
                      </Button>
                    </div>
                 </div>
              </div>
            </Card>
          )}))}
        </div>

        <div className="hidden lg:block lg:col-span-1">
           <Card className="p-4 bg-blue-50 border-blue-100 sticky top-20">
              <h3 className="font-semibold text-brand-blue flex items-center mb-2">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Conduce Seguro
              </h3>
              <p className="text-sm text-slate-700">
                Todos nuestros conductores pasan por un proceso de verificación de identidad. No compartas datos personales o bancarios en chats.
              </p>
           </Card>
        </div>
      </div>

      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-6 rounded-t-2xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Publicar ruta</p>
                <h2 className="text-2xl font-bold text-slate-900">Comparte tu viaje con otros usuarios</h2>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-slate-400 transition-colors hover:text-slate-600" type="button">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePublishRoute} className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Vehículo registrado</p>
                <p className="mt-1">
                  {profileLoading
                    ? 'Cargando datos de tu perfil...'
                    : canPublishRoute
                      ? `${userVehicle.type} · ${userVehicle.plate} · Capacidad ${vehicleCapacity} puesto(s)`
                      : 'No tienes un vehículo registrado para publicar rutas.'}
                </p>
              </div>

              {publishError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {publishError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Origen
                  <input
                    type="text"
                    name="origin"
                    value={publishForm.origin}
                    onChange={handlePublishInputChange}
                    placeholder="Campus, barrio o dirección de salida"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Destino
                  <select
                    name="destination"
                    value={publishForm.destination}
                    onChange={handlePublishInputChange}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    required
                  >
                    <option value="">Selecciona una sede</option>
                    {destinationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Fecha y hora de salida
                  <input
                    type="datetime-local"
                    name="departureTime"
                    value={publishForm.departureTime}
                    onChange={handlePublishInputChange}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Puestos disponibles
                  <input
                    type="number"
                    name="seats"
                    min="1"
                    max={vehicleCapacity || undefined}
                    value={publishForm.seats}
                    onChange={handlePublishInputChange}
                    placeholder={vehicleCapacity ? `Máximo ${vehicleCapacity}` : 'Registra un vehículo'}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    required
                    disabled={!canPublishRoute}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Observaciones opcionales
                <textarea
                  name="notes"
                  value={publishForm.notes}
                  onChange={handlePublishInputChange}
                  rows="4"
                  placeholder="Aclaraciones sobre puntos de encuentro, equipaje, horarios o contacto."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsPublishModalOpen(false)} disabled={isPublishing}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={isPublishing || profileLoading || !canPublishRoute}>
                  {isPublishing ? 'Publicando...' : 'Publicar ruta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
