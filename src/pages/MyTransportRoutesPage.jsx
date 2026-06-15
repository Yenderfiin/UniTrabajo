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
    </div>
  );
}
