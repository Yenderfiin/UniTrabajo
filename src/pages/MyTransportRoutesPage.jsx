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
      // Eliminar la ruta de detail_travels primero (relación de uno a uno)
      const { error: detailError } = await supabase
        .from('detail_travels')
        .delete()
        .eq('id_offer', routeId);

      if (detailError) throw new Error('No se pudo eliminar los detalles de la ruta.');

      // Luego eliminar la oferta
      const { error: offerError } = await supabase
        .from('offers')
        .delete()
        .eq('id_offer', routeId);

      if (offerError) throw new Error('No se pudo eliminar la ruta.');

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

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Pendiente': 'bg-blue-50 text-blue-700 border-blue-200',
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
                      className="flex-1 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleEditRoute(route)}
                    >
                      Editar
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
    </div>
  );
}
