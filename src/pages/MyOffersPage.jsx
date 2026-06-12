import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate, formatPayment, getCategoryIcon, getCategoryColor, parseDescription, buildDescription } from '../utils/helpers';

export function MyOffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Estados para la edición de vacantes
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: '',
    description: '',
    payment: '',
    hours: '',
    location: '',
    date: ''
  });

  const handleOpenEdit = (offer, e) => {
    if (e) e.stopPropagation();
    const details = offer.job_details || {};
    const parsed = parseDescription(offer.description);
    
    setEditFormData({
      title: parsed.title || '',
      category: details.category || '',
      description: parsed.description || '',
      payment: details.payment || '',
      hours: details.hours || '',
      location: parsed.location || '',
      date: parsed.date || ''
    });
    setEditingOfferId(offer.id_offer);
    setIsEditModalOpen(true);
    setSelectedOffer(null); // Cerrar modal de detalles si está abierto
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdateOffer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const fullDescription = buildDescription(
        editFormData.title,
        editFormData.description,
        editFormData.location,
        editFormData.date
      );

      // 1. Actualizar tabla offers
      const { error: offerError } = await supabase
        .from('offers')
        .update({
          description: fullDescription
        })
        .eq('id_offer', editingOfferId);

      if (offerError) throw offerError;

      // 2. Actualizar tabla job_details
      const { error: detailsError } = await supabase
        .from('job_details')
        .update({
          category: editFormData.category,
          payment: Number(editFormData.payment),
          hours: editFormData.hours ? Number(editFormData.hours) : null
        })
        .eq('id_offer', editingOfferId);

      if (detailsError) throw detailsError;

      alert('¡Vacante actualizada exitosamente!');
      setIsEditModalOpen(false);
      setEditingOfferId(null);
      fetchMyOffers();
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Error al actualizar la vacante');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchMyOffers = async () => {
    setLoading(true);
    if (!user?.email) {
      setLoading(false);
      return;
    }
    // Obtener documento del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('document')
      .eq('email', user.email)
      .single();
    if (!userData) {
      setLoading(false);
      return;
    }
    setUserDoc(userData.document);
    // Obtener ofertas del empleador
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id_offer,
        description,
        create_at,
        status,
        job_details ( category, payment, hours )
      `)
      .eq('document_employer', userData.document)
      .order('create_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setOffers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando tus vacantes...</p>
        </div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="text-5xl mb-4">💼</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Aún no tienes vacantes publicadas</h2>
        <p className="text-slate-500 text-sm mb-6">Aquí aparecerán todas las ofertas de trabajo que hayas publicado para la comunidad universitaria.</p>
        <Button variant="primary" onClick={() => window.location.href = '/app'}>
          Ver bolsa de empleo
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Vacantes Publicadas</h2>
          <p className="text-sm text-slate-500">Administra y consulta el estado de las vacantes que has compartido.</p>
        </div>
      </div>

      <div className="space-y-4">
        {offers.map((offer) => {
          const details = offer.job_details || {};
          const catColor = getCategoryColor(details.category);
          return (
            <Card
              key={offer.id_offer}
              className="p-5 group cursor-pointer hover:shadow-md hover:border-brand-blue/30 transition-all duration-300"
              onClick={() => setSelectedOffer(offer)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-blue to-blue-500 text-white shrink-0 shadow-sm font-bold text-base">
                  {getCategoryIcon(details.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-blue transition-colors text-base truncate">
                        {details.category || 'Trabajo General'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Publicado {formatDate(offer.create_at)}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {formatPayment(details.payment)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap mt-2.5">
                    {offer.description}
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
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <span className={`w-2 h-2 rounded-full ${offer.status === 'Pendiente' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      Estado: {offer.status}
                    </span>
                    <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-slate-50 transition-colors hover:cursor-pointer"
                        onClick={(e) => handleOpenEdit(offer, e)}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded-md hover:bg-slate-50 transition-colors hover:cursor-pointer"
                        onClick={() => setSelectedOffer(offer)}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Modal: Detalle de Vacante ── */}
      {selectedOffer && (() => {
        const offer = selectedOffer;
        const details = offer.job_details || {};
        const catColor = getCategoryColor(details.category);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedOffer(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'slideUp 0.3s ease-out' }}
            >
              {/* Header con gradiente */}
              <div className="relative bg-gradient-to-r from-brand-blue to-blue-600 px-6 py-5 rounded-t-2xl">
                <button
                  onClick={() => setSelectedOffer(null)}
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
                      {details.category || 'Trabajo General'}
                    </h2>
                    <p className="text-blue-100 text-sm">Publicado por ti</p>
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
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Estado</p>
                    <p className="text-sm font-bold text-brand-blue">{offer.status}</p>
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
                      {offer.description}
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
                    {new Date(offer.create_at).toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{formatDate(offer.create_at)}</span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedOffer(null)}>
                  Regresar al listado
                </Button>
                <Button variant="primary" className="flex-1 gap-1.5" onClick={(e) => handleOpenEdit(offer, e)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Vacante
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Editar Vacante ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-slate-800">Editar Vacante</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateOffer} className="p-6 space-y-4">
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
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  placeholder="Ej. Limpieza profunda de apartamento"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
                <select
                  name="category"
                  required
                  value={editFormData.category}
                  onChange={handleEditInputChange}
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
                  value={editFormData.description}
                  onChange={handleEditInputChange}
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
                    value={editFormData.payment}
                    onChange={handleEditInputChange}
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
                    value={editFormData.hours}
                    onChange={handleEditInputChange}
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
                    value={editFormData.date}
                    onChange={handleEditInputChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación *</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={editFormData.location}
                    onChange={handleEditInputChange}
                    placeholder="Ej. Edificio A, Piso 3"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
