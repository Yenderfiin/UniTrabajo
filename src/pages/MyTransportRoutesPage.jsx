import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function MyTransportRoutesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserDoc, setCurrentUserDoc] = useState('');
  const [sortBy, setSortBy] = useState('publication_desc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editForm, setEditForm] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    seats: ''
  });
  const [userVehicle, setUserVehicle] = useState(null);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosingRoute, setIsClosingRoute] = useState(false);
  const [viewingApplicationsRouteId, setViewingApplicationsRouteId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [passengerProfile, setPassengerProfile] = useState(null);
  const [loadingPassengerProfile, setLoadingPassengerProfile] = useState(false);

  // Estados para finalizar ruta (HU-057)
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizingRoute, setFinalizingRoute] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState(null);

  // Estados para calificar pasajero (HU-061)
  const [isRatingPassengerModalOpen, setIsRatingPassengerModalOpen] = useState(false);
  const [ratingPassenger, setRatingPassenger] = useState(null);
  const [ratingPassengerRoute, setRatingPassengerRoute] = useState(null);
  const [isSubmittingPassengerRating, setIsSubmittingPassengerRating] = useState(false);
  const [passengerRatingMsg, setPassengerRatingMsg] = useState(null);
  const [passengerRatingFormData, setPassengerRatingFormData] = useState({
    score: 5,
    comment: ''
  });
  const [existingPassengerRating, setExistingPassengerRating] = useState(null);

  // Función para obtener la fecha y hora actual en formato YYYY-MM-DDTHH:mm
  const getNowDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  // Cargar el documento del usuario autenticado
  useEffect(() => {
    async function fetchUserDocument() {
      if (!user?.email) {
        setCurrentUserDoc('');
        setLoading(false);
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('document')
          .eq('email', user.email)
          .maybeSingle();

        if (error) throw error;

        setCurrentUserDoc(userData?.document || '');
      } catch (error) {
        console.error('Error fetching user document:', error);
        setCurrentUserDoc('');
      }
    }

    fetchUserDocument();
  }, [user]);

  // Cargar el vehículo del usuario para validar capacidad
  useEffect(() => {
    async function fetchUserVehicle() {
      if (!currentUserDoc) {
        setUserVehicle(null);
        return;
      }

      setIsLoadingVehicle(true);

      try {
        const { data: vehicleData, error } = await supabase
          .from('vehicles')
          .select('type, plate, capacity')
          .eq('document', currentUserDoc)
          .maybeSingle();

        if (error) throw error;

        setUserVehicle(vehicleData || null);
      } catch (error) {
        console.error('Error fetching user vehicle:', error);
        setUserVehicle(null);
      } finally {
        setIsLoadingVehicle(false);
      }
    }

    fetchUserVehicle();
  }, [currentUserDoc]);

  // Cargar las rutas del usuario
  useEffect(() => {
    async function fetchUserRoutes() {
      if (!currentUserDoc) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            id_offer,
            description,
            create_at,
            status,
            document_employer,
            detail_travels ( origin, destination, departure_time, avaliable_seats )
          `)
          .eq('type_offer', 'Transporte')
          .eq('document_employer', currentUserDoc)
          .order('create_at', { ascending: false });

        if (error) throw error;

        setRoutes(data || []);
      } catch (error) {
        console.error('Error fetching user routes:', error);
        setMessage({ type: 'error', text: 'No se pudieron cargar tus rutas.' });
      } finally {
        setLoading(false);
      }
    }

    fetchUserRoutes();
  }, [currentUserDoc]);

  // Ordenar rutas
  const sortedRoutes = [...routes].sort((a, b) => {
    const detailsA = a.detail_travels || {};
    const detailsB = b.detail_travels || {};

    switch (sortBy) {
      case 'publication_asc':
        return new Date(a.create_at || 0) - new Date(b.create_at || 0);
      case 'publication_desc':
        return new Date(b.create_at || 0) - new Date(a.create_at || 0);
      case 'departure_asc':
        return new Date(detailsA.departure_time || 0) - new Date(detailsB.departure_time || 0);
      case 'departure_desc':
        return new Date(detailsB.departure_time || 0) - new Date(detailsA.departure_time || 0);
      default:
        return 0;
    }
  });

  const handleDeleteRoute = async (routeId) => {
    setIsDeleting(true);
    setMessage(null);

    try {
      // 1. Eliminar primero todas las solicitudes (aplications) de esta ruta
      const { error: appDeleteError } = await supabase
        .from('aplications')
        .delete()
        .eq('id_offer', routeId);

      if (appDeleteError) {
        console.error('Error deleting applications:', appDeleteError);
        // Continuamos de todas formas si no hay solicitudes
      }

      // 2. Eliminar los detalles de la ruta (detail_travels)
      const { error: detailError } = await supabase
        .from('detail_travels')
        .delete()
        .eq('id_offer', routeId);

      if (detailError) {
        console.error('Error deleting detail_travels:', detailError);
        throw new Error('No se pudo eliminar los detalles de la ruta.');
      }

      // 3. Finalmente, eliminar la oferta
      const { error: offerError } = await supabase
        .from('offers')
        .delete()
        .eq('id_offer', routeId);

      if (offerError) {
        console.error('Error deleting offer:', offerError);
        throw new Error('No se pudo eliminar la ruta.');
      }

      // Actualizar el estado local
      setRoutes(prevRoutes => prevRoutes.filter(r => r.id_offer !== routeId));
      setDeleteConfirm(null);
      setMessage({ type: 'success', text: 'Ruta eliminada correctamente.' });

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting route:', error);
      setMessage({ type: 'error', text: error.message || 'No se pudo eliminar la ruta.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseRoute = async (routeId) => {
    setIsClosingRoute(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: 'Cerrada' })
        .eq('id_offer', routeId);

      if (error) throw error;

      setRoutes(prevRoutes =>
        prevRoutes.map(route =>
          route.id_offer === routeId
            ? { ...route, status: 'Cerrada' }
            : route
        )
      );

      setMessage({ type: 'success', text: 'La ruta fue cerrada correctamente y ya no acepta nuevas solicitudes.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      console.error('Error closing route:', error);
      setMessage({ type: 'error', text: error.message || 'No se pudo cerrar la ruta.' });
    } finally {
      setIsClosingRoute(false);
    }
  };

  // HU-057: Finalizar ruta publicada
  const handleOpenFinalize = (route) => {
    setFinalizingRoute(route);
    setFinalizeMsg(null);
    setIsFinalizeModalOpen(true);
  };

  const handleConfirmFinalize = async () => {
    if (!finalizingRoute) return;
    setIsFinalizing(true);
    setFinalizeMsg(null);

    try {
      // 1. Actualizar el estado de la ruta a 'Finalizada'
      const { error } = await supabase
        .from('offers')
        .update({ status: 'Finalizada' })
        .eq('id_offer', finalizingRoute.id_offer);

      if (error) throw error;

      // 2. Obtener todos los pasajeros aceptados en esta ruta
      const { data: acceptedPassengers, error: passengerError } = await supabase
        .from('aplications')
        .select('document')
        .eq('id_offer', finalizingRoute.id_offer)
        .eq('app_status', 'Aceptada');

      if (passengerError) {
        console.error('Error fetching passengers:', passengerError);
      } else if (acceptedPassengers && acceptedPassengers.length > 0) {
        // 3. Notificar a los pasajeros aceptados
        const notifications = acceptedPassengers.map(passenger => ({
          user_document: passenger.document,
          type: 'travel_finalized',
          message: `El viaje de ${finalizingRoute.detail_travels?.origin || 'transporte compartido'} a ${finalizingRoute.detail_travels?.destination || 'destino'} ha sido finalizado. Ya puedes proceder con la evaluación mutua.`
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // Actualizar estado local
      setRoutes(prevRoutes =>
        prevRoutes.map(route =>
          route.id_offer === finalizingRoute.id_offer
            ? { ...route, status: 'Finalizada' }
            : route
        )
      );

      setIsFinalizeModalOpen(false);
      setFinalizingRoute(null);
      setFinalizeMsg({ type: 'success', text: '¡Ruta finalizada exitosamente! El proceso de calificación está habilitado.' });
      
      // Mostrar mensaje de éxito por 3 segundos
      setTimeout(() => setFinalizeMsg(null), 3000);
    } catch (error) {
      console.error('Error finalizing route:', error);
      setFinalizeMsg({ type: 'error', text: error.message || 'Error al finalizar la ruta.' });
    } finally {
      setIsFinalizing(false);
    }
  };

  // HU-061: Abrir modal para calificar pasajero
  const handleOpenPassengerRating = async (passenger, route, e) => {
    if (e) e.stopPropagation();

    // Validaciones
    if (route.status !== 'Finalizada') {
      alert('La ruta debe estar en estado "Finalizada" para calificar pasajeros.');
      return;
    }

    if (!passenger?.document) {
      alert('No hay información del pasajero registrada.');
      return;
    }

    setRatingPassenger(passenger);
    setRatingPassengerRoute(route);
    setPassengerRatingFormData({ score: 5, comment: '' });
    setPassengerRatingMsg(null);
    setIsRatingPassengerModalOpen(true);

    // Cargar datos del pasajero
    try {
      const { data: passengerData, error: passengerError } = await supabase
        .from('users')
        .select('document, frt_name, scd_name, frt_last_name, scd_last_name')
        .eq('document', passenger.document)
        .single();

      if (passengerError) {
        console.error('[HU-061] Error al cargar datos del pasajero:', passengerError);
      } else if (passengerData) {
        setRatingPassenger(passengerData);
      }
    } catch (err) {
      console.error('[HU-061] Error al cargar pasajero:', err);
    }

    // Verificar si ya existe una calificación
    try {
      const { data: existingRatingData, error: ratingError } = await supabase
        .from('ratings')
        .select('*')
        .eq('id_offer', route.id_offer)
        .eq('document_rater', currentUserDoc)
        .eq('document_rated', passenger.document)
        .maybeSingle();

      if (ratingError) {
        console.error('[HU-061] Error al verificar calificación existente:', ratingError);
      } else if (existingRatingData) {
        setExistingPassengerRating(existingRatingData);
        setPassengerRatingFormData({
          score: existingRatingData.score,
          comment: existingRatingData.comment || ''
        });
        setPassengerRatingMsg({
          type: 'info',
          text: `Ya calificaste a este pasajero con ${existingRatingData.score} estrella${existingRatingData.score > 1 ? 's' : ''}.`
        });
      }
    } catch (err) {
      console.error('[HU-061] Error al cargar calificación existente:', err);
    }
  };

  // HU-061: Enviar calificación del pasajero
  const handleSubmitPassengerRating = async () => {
    if (!ratingPassenger || !ratingPassengerRoute) return;
    setIsSubmittingPassengerRating(true);
    setPassengerRatingMsg(null);

    try {
      const driverDoc = currentUserDoc;
      const passengerDoc = ratingPassenger.document;
      const offerId = ratingPassengerRoute.id_offer;

      // Validar: solo el conductor propietario puede calificar
      const { data: validateData } = await supabase
        .from('offers')
        .select('document_employer, status')
        .eq('id_offer', offerId)
        .maybeSingle();

      if (!validateData || validateData.document_employer !== driverDoc) {
        throw new Error('Solo el conductor propietario puede calificar pasajeros.');
      }

      if (validateData.status !== 'Finalizada') {
        throw new Error('La ruta debe estar en estado "Finalizada" para calificar.');
      }

      // Si ya existe calificación, eliminar primero
      if (existingPassengerRating) {
        const { error: deleteError } = await supabase
          .from('ratings')
          .delete()
          .eq('id_offer', offerId)
          .eq('document_rater', driverDoc)
          .eq('document_rated', passengerDoc);

        if (deleteError) throw deleteError;
      }

      // Insertar la nueva calificación
      const { error: insertError } = await supabase
        .from('ratings')
        .insert({
          id_offer: offerId,
          document_rater: driverDoc,
          document_rated: passengerDoc,
          score: Number(passengerRatingFormData.score),
          comment: passengerRatingFormData.comment || null
        });

      if (insertError) throw insertError;

      // Notificar al pasajero
      await supabase.from('notifications').insert({
        user_document: passengerDoc,
        type: 'passenger_rated',
        message: `Te han calificado con ${passengerRatingFormData.score} estrella${passengerRatingFormData.score > 1 ? 's' : ''} como pasajero.`
      });

      setPassengerRatingMsg({
        type: 'success',
        text: `¡Calificación registrada exitosamente! Le diste ${passengerRatingFormData.score} estrella${passengerRatingFormData.score > 1 ? 's' : ''} al pasajero.`
      });
      setExistingPassengerRating(null);
      setTimeout(() => {
        setIsRatingPassengerModalOpen(false);
        setRatingPassenger(null);
        setRatingPassengerRoute(null);
        fetchMyRoutes();
      }, 2000);
    } catch (error) {
      console.error('[HU-061] Error al calificar:', error);
      setPassengerRatingMsg({
        type: 'error',
        text: error.message || 'Error al registrar la calificación.'
      });
    } finally {
      setIsSubmittingPassengerRating(false);
    }
  };

  const handleEditRoute = (route) => {
    const details = route.detail_travels || {};
    
    // Convertir datetime a formato que el input acepte (YYYY-MM-DDTHH:mm)
    let formattedDateTime = '';
    if (details.departure_time) {
      const date = new Date(details.departure_time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setEditForm({
      origin: details.origin || '',
      destination: details.destination || '',
      departureTime: formattedDateTime,
      seats: details.avaliable_seats || ''
    });
    setEditingRouteId(route.id_offer);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveRoute = async (routeId) => {
    setMessage(null);

    // Validaciones
    if (!editForm.origin.trim() || !editForm.destination.trim() || !editForm.departureTime || !editForm.seats) {
      setMessage({ type: 'error', text: 'Completa todos los campos.' });
      return;
    }

    // Validar que la fecha y hora no sean anteriores a ahora
    const selectedDateTime = new Date(editForm.departureTime);
    const now = new Date();
    
    if (selectedDateTime <= now) {
      setMessage({ type: 'error', text: 'La fecha y hora de salida no pueden ser anteriores a la fecha y hora actual.' });
      return;
    }

    const seats = Number(editForm.seats);
    const vehicleCapacity = Number(userVehicle?.capacity || 0);

    if (seats <= 0) {
      setMessage({ type: 'error', text: 'Los puestos disponibles deben ser mayor a 0.' });
      return;
    }

    if (seats > vehicleCapacity) {
      setMessage({ 
        type: 'error', 
        text: `No puedes asignar más puestos que la capacidad de tu vehículo (${vehicleCapacity}).` 
      });
      return;
    }

    setIsSaving(true);

    try {
      // Actualizar detail_travels
      const { error: detailError } = await supabase
        .from('detail_travels')
        .update({
          origin: editForm.origin.trim(),
          destination: editForm.destination.trim(),
          departure_time: new Date(editForm.departureTime).toISOString(),
          avaliable_seats: seats
        })
        .eq('id_offer', routeId);

      if (detailError) throw new Error('No se pudieron actualizar los detalles de la ruta.');

      // Actualizar en el estado local
      setRoutes(prevRoutes =>
        prevRoutes.map(r =>
          r.id_offer === routeId
            ? {
                ...r,
                detail_travels: {
                  ...r.detail_travels,
                  origin: editForm.origin.trim(),
                  destination: editForm.destination.trim(),
                  departure_time: new Date(editForm.departureTime).toISOString(),
                  avaliable_seats: seats
                }
              }
            : r
        )
      );

      setEditingRouteId(null);
      setMessage({ type: 'success', text: 'Ruta actualizada correctamente.' });

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating route:', error);
      setMessage({ type: 'error', text: error.message || 'No se pudo actualizar la ruta.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRouteId(null);
    setEditForm({
      origin: '',
      destination: '',
      departureTime: '',
      seats: ''
    });
  };

  const handleViewApplications = async (routeId) => {
    setViewingApplicationsRouteId(routeId);
    setIsLoadingApplications(true);
    setApplications([]);
    setMessage(null);

    try {
      console.log('Cargando solicitudes para ruta:', routeId);
      
      // Obtener las solicitudes de esta ruta
      const { data: applicationsData, error: appError } = await supabase
        .from('aplications')
        .select('id_offer, document, app_status')
        .eq('id_offer', routeId)
        .order('document', { ascending: false });

      console.log('Solicitudes obtenidas:', applicationsData, 'Error:', appError);

      if (appError) {
        console.error('Error en query de aplicaciones:', appError);
        throw appError;
      }

      if (!applicationsData || applicationsData.length === 0) {
        console.log('No hay solicitudes para esta ruta');
        setApplications([]);
        setIsLoadingApplications(false);
        return;
      }

      console.log(`Encontradas ${applicationsData.length} solicitudes, cargando usuarios...`);

      // Obtener información de los usuarios
      const documents = applicationsData.map(app => app.document);
      console.log('Documentos de usuarios a buscar:', documents);
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('document, frt_name, scd_name, frt_last_name, scd_last_name, email, phne_number')
        .in('document', documents);

      console.log('Usuarios obtenidos:', usersData, 'Error:', usersError);

      if (usersError) {
        console.error('Error en query de usuarios:', usersError);
        throw usersError;
      }

      // Combinar datos de aplicaciones con datos de usuarios
      const usersMap = {};
      (usersData || []).forEach(user => {
        usersMap[user.document] = user;
      });

      const enrichedApplications = applicationsData.map(app => ({
        id_offer: app.id_offer,
        document: app.document,
        app_status: app.app_status,
        created_at: new Date().toISOString(), // Usamos fecha actual como fallback
        users: usersMap[app.document] || null
      }));

      console.log('Solicitudes enriquecidas:', enrichedApplications);
      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
      setMessage({ type: 'error', text: `No se pudieron cargar las solicitudes: ${error.message}` });
      setApplications([]);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const handleCloseApplications = () => {
    setViewingApplicationsRouteId(null);
    setApplications([]);
    setSelectedPassenger(null);
    setPassengerProfile(null);
  };

  const handleDecisionApplication = async (app, decision) => {
    if (!app?.id_offer || !app?.document) return;

    const newStatus = decision === 'accept' ? 'Aceptada' : 'Rechazada';
    const actionLabel = decision === 'accept' ? 'aceptar' : 'rechazar';

    try {
      const { error: updateError } = await supabase
        .from('aplications')
        .update({ app_status: newStatus })
        .eq('id_offer', app.id_offer)
        .eq('document', app.document);

      if (updateError) throw updateError;

      if (decision === 'reject') {
        const currentSeats = routes.find(route => route.id_offer === app.id_offer)?.detail_travels?.avaliable_seats || 0;
        const { error: seatsError } = await supabase
          .from('detail_travels')
          .update({ avaliable_seats: currentSeats + 1 })
          .eq('id_offer', app.id_offer);

        if (seatsError) throw seatsError;

        setRoutes(prevRoutes =>
          prevRoutes.map(route =>
            route.id_offer === app.id_offer
              ? {
                  ...route,
                  detail_travels: {
                    ...route.detail_travels,
                    avaliable_seats: (route.detail_travels?.avaliable_seats || 0) + 1
                  }
                }
              : route
          )
        );
      }

      await supabase.from('notifications').insert({
        user_document: app.document,
        type: decision === 'accept' ? 'travel_reservation_accepted' : 'travel_reservation_rejected',
        message: decision === 'accept'
          ? 'Tu solicitud de reserva fue aceptada. Puedes continuar con la ruta asignada.'
          : 'Tu solicitud de reserva fue rechazada. El puesto quedó disponible nuevamente.'
      });

      setApplications(prev =>
        prev.map(item =>
          item.id_offer === app.id_offer && item.document === app.document
            ? { ...item, app_status: newStatus }
            : item
        )
      );

      setMessage({
        type: 'success',
        text: `Solicitud ${actionLabel} correctamente.`
      });
    } catch (error) {
      console.error(`Error al ${actionLabel} la solicitud:`, error);
      setMessage({
        type: 'error',
        text: `No se pudo ${actionLabel} la solicitud. ${error.message || ''}`.trim()
      });
    }
  };

  const handleClosePassengerProfile = () => {
    setSelectedPassenger(null);
    setPassengerProfile(null);
  };

  const handleViewPassengerProfile = async (app) => {
    setSelectedPassenger(app);
    setPassengerProfile(null);
    setLoadingPassengerProfile(true);

    try {
      const doc = app.document;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('document', doc)
        .single();

      if (userError) throw userError;

      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('document', doc)
        .maybeSingle();

      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('score')
        .eq('document_rated', doc);

      let average = 0;
      let count = 0;
      if (ratingsData) {
        count = ratingsData.length;
        average = count > 0
          ? (ratingsData.reduce((sum, r) => sum + r.score, 0) / count).toFixed(1)
          : 0;
      }

      setPassengerProfile({
        user: userData,
        vehicle: vehicleData,
        rating: { average: Number(average), count }
      });
    } catch (error) {
      console.error('Error loading passenger profile:', error);
      setPassengerProfile({
        user: {
          frt_name: app.users?.frt_name || 'Usuario',
          frt_last_name: app.users?.frt_last_name || 'Anónimo',
          email: app.users?.email || '',
          user_type: app.users?.user_type || 'Estudiante',
          document: app.document,
          description: app.users?.description || 'Sin descripción disponible.'
        },
        vehicle: null,
        rating: { average: 0, count: 0 }
      });
    } finally {
      setLoadingPassengerProfile(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Pendiente': 'bg-blue-50 text-blue-700 border-blue-200',
      'Cerrada': 'bg-rose-50 text-rose-700 border-rose-200',
      'Activa': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Completada': 'bg-slate-50 text-slate-700 border-slate-200',
      'Cancelada': 'bg-rose-50 text-rose-700 border-rose-200',
    };

    return statusStyles[status] || statusStyles['Pendiente'];
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">Gestión de rutas</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mis Rutas</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Consulta y administra todas las rutas de transporte que has publicado.
          </p>
        </div>
        <Button onClick={() => navigate('/app/transporte')}>
          ← Volver al Transporte
        </Button>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Controles de ordenamiento */}
      {!loading && routes.length > 0 && (
        <Card className="p-4 bg-white border border-slate-200">
          <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-slate-700">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-48 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="publication_desc">Más recientes (publicación)</option>
              <option value="publication_asc">Más antiguas (publicación)</option>
              <option value="departure_desc">Salida más próxima</option>
              <option value="departure_asc">Salida más lejana</option>
            </select>
          </label>
        </Card>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="text-center py-10 text-slate-500">Cargando tus rutas...</div>
      )}

      {/* Sin rutas */}
      {!loading && routes.length === 0 && (
        <Card className="p-12 text-center bg-white border border-slate-200">
          <p className="text-slate-600 mb-4 text-lg font-medium">No has publicado rutas aún</p>
          <p className="text-sm text-slate-500 mb-6">
            Publica tu primera ruta desde el módulo de Transporte Compartido para que aparezca aquí.
          </p>
          <Button onClick={() => navigate('/app/transporte')}>
            Ir a Transporte Compartido
          </Button>
        </Card>
      )}

      {/* Lista de rutas */}
      {!loading && routes.length > 0 && (
        <div className="space-y-4">
          {sortedRoutes.map(route => {
            const details = route.detail_travels || {};
            const departureTime = details.departure_time
              ? new Date(details.departure_time).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Fecha por definir';
            const publishDate = route.create_at
              ? new Date(route.create_at).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Fecha desconocida';

            return (
              <Card key={route.id_offer} className="p-5 hover:shadow-md transition-shadow bg-white border border-slate-200">
                <div className="flex flex-col gap-4">
                  {/* Encabezado con ruta y estado */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {details.origin || '?'} ➔ {details.destination || '?'}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Salida:</span> {departureTime}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(route.status)}`}>
                      {route.status}
                    </div>
                  </div>

                  {/* Información de puestos y publicación */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium uppercase">Asientos disponibles</span>
                      <span className="text-lg font-bold text-slate-900">{details.avaliable_seats || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium uppercase">Publicado</span>
                      <span className="text-xs text-slate-700">{publishDate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium uppercase">ID Oferta</span>
                      <span className="text-xs text-slate-700 font-mono">{route.id_offer}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium uppercase">Descripción</span>
                      <span className="text-xs text-slate-700 truncate">{route.description?.substring(0, 20) || 'Sin descripción'}...</span>
                    </div>
                  </div>

                  {/* Descripción completa */}
                  {route.description && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700 line-clamp-3">{route.description}</p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/app/transporte/${route.id_offer}`)}
                    >
                      Ver detalles
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleViewApplications(route.id_offer)}
                    >
                      Ver solicitudes
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleEditRoute(route)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-amber-600 hover:bg-amber-50"
                      onClick={() => handleCloseRoute(route.id_offer)}
                      disabled={route.status === 'Cerrada' || isClosingRoute}
                    >
                      {route.status === 'Cerrada' ? 'Ruta cerrada' : 'Cerrar ruta'}
                    </Button>
                    {route.status === 'Cerrada' && (
                      <Button
                        variant="outline"
                        className="flex-1 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleOpenFinalize(route)}
                        disabled={route.status !== 'Cerrada' || isFinalizing}
                      >
                        {route.status === 'Finalizada' ? 'Ruta finalizada' : 'Finalizar ruta'}
                      </Button>
                    )}
                    {deleteConfirm === route.id_offer ? (
                      <>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDeleteRoute(route.id_offer)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Eliminando...' : 'Confirmar eliminación'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={isDeleting}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex-1 text-rose-600 hover:bg-rose-50"
                        onClick={() => setDeleteConfirm(route.id_offer)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Edición */}
      {editingRouteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white border border-slate-200">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Editar Ruta</h2>
                <p className="text-sm text-slate-500 mt-1">Actualiza los detalles de tu ruta de transporte.</p>
              </div>

              <div className="space-y-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Origen
                  <input
                    type="text"
                    name="origin"
                    value={editForm.origin}
                    onChange={handleEditFormChange}
                    placeholder="Campus, barrio, estación"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Destino
                  <input
                    type="text"
                    name="destination"
                    value={editForm.destination}
                    onChange={handleEditFormChange}
                    placeholder="Campus, barrio, estación"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Fecha y hora de salida
                  <input
                    type="datetime-local"
                    name="departureTime"
                    min={getNowDateTime()}
                    value={editForm.departureTime}
                    onChange={handleEditFormChange}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Puestos disponibles
                  <div className="relative">
                    <input
                      type="number"
                      name="seats"
                      value={editForm.seats}
                      onChange={handleEditFormChange}
                      min="1"
                      max={userVehicle?.capacity || 10}
                      placeholder="Número de puestos"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                  {userVehicle && (
                    <p className="text-xs text-slate-500 mt-1">
                      Capacidad de tu vehículo: <span className="font-medium">{userVehicle.capacity} puesto(s)</span>
                    </p>
                  )}
                </label>
              </div>

              {message && editingRouteId && (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <Button
                  className="flex-1"
                  onClick={() => handleSaveRoute(editingRouteId)}
                  disabled={isSaving || isLoadingVehicle}
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Solicitudes */}
      {viewingApplicationsRouteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-white border border-slate-200 max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Solicitudes de Reserva</h2>
                  <p className="text-sm text-slate-500 mt-1">Usuarios que han solicitado un puesto en esta ruta.</p>
                </div>
                <Button
                  variant="outline"
                  className="text-slate-500 hover:text-slate-700"
                  onClick={handleCloseApplications}
                >
                  ✕
                </Button>
              </div>

              {isLoadingApplications ? (
                <div className="text-center py-8 text-slate-500">Cargando solicitudes...</div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 mb-2 font-medium">No hay solicitudes aún</p>
                  <p className="text-sm text-slate-500">Los usuarios que soliciten un puesto en esta ruta aparecerán aquí.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => {
                    const user = app.users;
                    const fullName = user
                      ? `${user.frt_name || ''} ${user.scd_name || ''} ${user.frt_last_name || ''} ${user.scd_last_name || ''}`.trim()
                      : 'Usuario desconocido';
                    const applicationDate = app.created_at
                      ? new Date(app.created_at).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Fecha desconocida';

                    const statusStyles = {
                      'Pendiente': 'bg-blue-50 text-blue-700 border-blue-200',
                      'Aceptada': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      'Rechazada': 'bg-rose-50 text-rose-700 border-rose-200',
                      'Cancelada': 'bg-slate-50 text-slate-700 border-slate-200',
                    };

                    return (
                      <div
                        key={`${app.id_offer}-${app.document}`}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{fullName}</h4>
                            <p className="text-sm text-slate-600 mt-1">
                              <span className="font-medium">Email:</span> {user?.email || 'No disponible'}
                            </p>
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Teléfono:</span> {user?.phne_number || 'No disponible'}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              <span className="font-medium">Solicitado:</span> {applicationDate}
                            </p>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusStyles[app.app_status] || statusStyles['Pendiente']}`}>
                              {app.app_status}
                            </div>
                            {app.app_status === 'Pendiente' && (
                              <div className="flex gap-2">
                                <Button
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleDecisionApplication(app, 'accept')}
                                >
                                  Aceptar
                                </Button>
                                <Button
                                  variant="outline"
                                  className="text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleDecisionApplication(app, 'reject')}
                                >
                                  Rechazar
                                </Button>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              className="text-brand-blue hover:bg-blue-50"
                              onClick={() => handleViewPassengerProfile(app)}
                            >
                              Ver perfil
                            </Button>
                            {routes.find(r => r.id_offer === viewingApplicationsRouteId)?.status === 'Finalizada' && (app.app_status === 'Aceptada' || app.app_status === 'Aceptado') && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium px-2 py-1 rounded-md hover:bg-yellow-50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPassengerRating(app, routes.find(r => r.id_offer === viewingApplicationsRouteId), e);
                                }}
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Calificar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedPassenger && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Perfil del pasajero</h3>
                      <p className="text-sm text-slate-500">Datos públicos y contacto del usuario que solicitó esta ruta.</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-slate-500 hover:text-slate-700"
                      onClick={handleClosePassengerProfile}
                    >
                      Cerrar
                    </Button>
                  </div>

                  {loadingPassengerProfile ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                      Cargando perfil...
                    </div>
                  ) : passengerProfile ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                          {(() => {
                            const u = passengerProfile.user || {};
                            const name = u.frt_name && u.frt_last_name ? `${u.frt_name} ${u.frt_last_name}` : 'P';
                            return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                          })()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {(() => {
                              const u = passengerProfile.user || {};
                              return `${u.frt_name || ''} ${u.scd_name ? u.scd_name + ' ' : ''}${u.frt_last_name || ''} ${u.scd_last_name || ''}`.trim() || 'Usuario anónimo';
                            })()}
                          </h4>
                          <p className="text-xs text-slate-500">{passengerProfile.user?.user_type || 'Estudiante'}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {passengerProfile.user?.email && (
                          <a href={`mailto:${passengerProfile.user.email}`} className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/40 transition-colors">
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Correo</p>
                            <p className="text-sm font-semibold text-slate-700 break-all">{passengerProfile.user.email}</p>
                          </a>
                        )}
                        {passengerProfile.user?.phne_number && (
                          <a href={`tel:${passengerProfile.user.phne_number}`} className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50/40 transition-colors">
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Teléfono</p>
                            <p className="text-sm font-semibold text-slate-700">{passengerProfile.user.phne_number}</p>
                          </a>
                        )}
                        {passengerProfile.user?.document && (
                          <div className="p-3 rounded-lg border border-slate-200 bg-white">
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Documento</p>
                            <p className="text-sm font-semibold text-slate-700">{passengerProfile.user.document}</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Valoración</p>
                          <p className="text-sm font-semibold text-slate-700">{passengerProfile.rating.average} / 5.0 ({passengerProfile.rating.count})</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Descripción</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{passengerProfile.user?.description || 'Este usuario aún no ha agregado una descripción.'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No se pudo cargar el perfil del pasajero.</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseApplications}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modal: Confirmar Finalización de Ruta (HU-057) ── */}
      {isFinalizeModalOpen && finalizingRoute && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !isFinalizing && setIsFinalizeModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header verde */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Finalizar Ruta</h2>
                <p className="text-emerald-100 text-xs">Habilita el proceso de evaluación mutua</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-slate-700 text-sm leading-relaxed">
                ¿Estás seguro de que deseas finalizar la ruta de{' '}
                <span className="font-semibold text-slate-900">
                  {finalizingRoute.detail_travels?.[0]?.origin || 'origen desconocido'}
                </span>{' '}
                a{' '}
                <span className="font-semibold text-slate-900">
                  {finalizingRoute.detail_travels?.[0]?.destination || 'destino desconocido'}
                </span>?
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Una vez finalizada, no se podrán hacer modificaciones. Los pasajeros aceptados recibirán notificación y podrán proceder con la evaluación mutua.
              </p>

              {finalizeMsg?.type === 'error' && (
                <div className="mt-3 bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                  {finalizeMsg.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsFinalizeModalOpen(false)}
                disabled={isFinalizing}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleConfirmFinalize}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isFinalizing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sí, finalizar ruta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Calificar Pasajero (HU-061) ── */}
      {isRatingPassengerModalOpen && ratingPassenger && ratingPassengerRoute && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !isSubmittingPassengerRating && (setIsRatingPassengerModalOpen(false), setRatingPassenger(null), setRatingPassengerRoute(null))}
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
                  setIsRatingPassengerModalOpen(false);
                  setRatingPassenger(null);
                  setRatingPassengerRoute(null);
                }}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                disabled={isSubmittingPassengerRating}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xl">👤</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Calificar Pasajero</h2>
                  <p className="text-yellow-100 text-sm">
                    {ratingPassengerRoute.detail_travels?.origin || 'Ruta'} → {ratingPassengerRoute.detail_travels?.destination}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Información del pasajero */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shrink-0">
                  {ratingPassenger?.frt_name ? ratingPassenger.frt_name.substring(0, 1).toUpperCase() : 'P'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {ratingPassenger
                      ? `${ratingPassenger.frt_name || ''} ${ratingPassenger.scd_name ? ratingPassenger.scd_name + ' ' : ''}${ratingPassenger.frt_last_name || ''} ${ratingPassenger.scd_last_name || ''}`.trim()
                      : 'Pasajero'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{ratingPassenger?.document}</p>
                </div>
              </div>

              {/* Mensaje informativo */}
              {passengerRatingMsg && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border text-sm
                    ${
                      passengerRatingMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : passengerRatingMsg.type === 'error'
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
                    {passengerRatingMsg.type === 'success' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : passengerRatingMsg.type === 'error' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <span>{passengerRatingMsg.text}</span>
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
                      disabled={isSubmittingPassengerRating}
                      onClick={() => setPassengerRatingFormData({ ...passengerRatingFormData, score: star })}
                      className={`transition-all transform hover:scale-110 disabled:opacity-50
                        ${
                          star <= passengerRatingFormData.score
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
                  Has seleccionado <span className="font-bold text-amber-600">{passengerRatingFormData.score}</span> estrella{passengerRatingFormData.score > 1 ? 's' : ''}
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
                  disabled={isSubmittingPassengerRating}
                  value={passengerRatingFormData.comment}
                  onChange={(e) => setPassengerRatingFormData({ ...passengerRatingFormData, comment: e.target.value })}
                  placeholder="Comparte tu experiencia con este pasajero (máx. 500 caracteres)..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {passengerRatingFormData.comment.length}/500 caracteres
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsRatingPassengerModalOpen(false);
                  setRatingPassenger(null);
                  setRatingPassengerRoute(null);
                }}
                disabled={isSubmittingPassengerRating}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isSubmittingPassengerRating || passengerRatingMsg?.type === 'success'}
                onClick={handleSubmitPassengerRating}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isSubmittingPassengerRating ? (
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
