import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate, formatPayment, getCategoryIcon, getCategoryColor, parseDescription, buildDescription } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

export function MyOffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Estados para el modal de postulantes (HU-038 / HU-039)
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [applicantsOffer, setApplicantsOffer] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Estados para confirmación de selección de candidato (HU-039)
  const [confirmSelectApp, setConfirmSelectApp] = useState(null); // { app, offerCategory }
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectMsg, setSelectMsg] = useState(null);

  // Estados para ver perfil del candidato (HU-038 follow-up)
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const navigate = useNavigate();

  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

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

  // Estados para eliminar vacante
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  // Estados para cerrar vacante (HU-054)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingOffer, setClosingOffer] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState(null);

  // Estados para finalizar vacante (HU-055)
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizingOffer, setFinalizingOffer] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState(null);

  // Estados para calificar trabajador (HU-058)
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingOffer, setRatingOffer] = useState(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingMsg, setRatingMsg] = useState(null);
  const [ratingFormData, setRatingFormData] = useState({
    score: 5,
    comment: ''
  });
  const [existingRating, setExistingRating] = useState(null);

  // HU-038: Consultar postulantes de una vacante
  const handleOpenApplicants = async (offer, e) => {
    if (e) e.stopPropagation();
    setApplicantsOffer(offer);
    setApplicants([]);
    setIsApplicantsModalOpen(true);
    setSelectedOffer(null);
    setLoadingApplicants(true);
    try {
      // Intentar con join a users a través de la FK en 'document'
      const { data, error } = await supabase
        .from('aplications')
        .select(`
          id_offer,
          document,
          app_status,
          users ( frt_name, frt_last_name, email, user_type )
        `)
        .eq('id_offer', offer.id_offer);

      if (error) {
        console.error('[HU-038] Error en query de postulantes:', error);
        // Fallback: consultar sin join y luego enriquecer manualmente
        const { data: appsOnly, error: appsErr } = await supabase
          .from('aplications')
          .select('id_offer, document, app_status')
          .eq('id_offer', offer.id_offer);
        if (appsErr) throw appsErr;
        // Enriquecer con datos de usuarios
        const enriched = await Promise.all(
          (appsOnly || []).map(async (app) => {
            const { data: uData } = await supabase
              .from('users')
              .select('frt_name, frt_last_name, email, user_type')
              .eq('document', app.document)
              .single();
            return { ...app, users: uData || null };
          })
        );
        setApplicants(enriched);
      } else {
        setApplicants(data || []);
      }
    } catch (err) {
      console.error('[HU-038] Error al cargar postulantes:', err);
      setApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  // HU-039: Confirmar selección de candidato
  const handleConfirmSelect = async () => {
    if (!confirmSelectApp) return;
    const { app, offer } = confirmSelectApp;
    setIsSelecting(true);
    setSelectMsg(null);
    try {
      // 1. Marcar candidato seleccionado como 'Aceptado'
      const { error: acceptErr } = await supabase
        .from('aplications')
        .update({ app_status: 'Aceptado' })
        .eq('id_offer', app.id_offer)
        .eq('document', app.document);
      if (acceptErr) throw acceptErr;

      // 2. Marcar el resto de postulantes como 'Rechazado'
      const { error: rejectErr } = await supabase
        .from('aplications')
        .update({ app_status: 'Rechazado' })
        .eq('id_offer', app.id_offer)
        .neq('document', app.document);
      if (rejectErr) throw rejectErr;

      // 3. Actualizar la oferta: status → 'En curso', document_employee → candidato
      const { error: offerErr } = await supabase
        .from('offers')
        .update({
          status: 'En curso',
          document_employee: app.document
        })
        .eq('id_offer', app.id_offer);
      if (offerErr) throw offerErr;

      // 4. Notificar al candidato seleccionado
      await supabase.from('notifications').insert({
        user_document: app.document,
        type: 'application_accepted',
        message: `¡Felicidades! Has sido seleccionado para la vacante de "${offer.job_details?.category || 'Trabajo General'}".`
      });

      // 5. Refrescar lista de postulantes en el modal
      setApplicants(prev =>
        prev.map(a =>
          a.document === app.document
            ? { ...a, app_status: 'Aceptado' }
            : { ...a, app_status: 'Rechazado' }
        )
      );

      // 6. Refrescar la vacante en el listado principal
      setApplicantsOffer(prev => prev ? { ...prev, status: 'En curso' } : prev);
      fetchMyOffers();

      setSelectMsg({ type: 'success', text: '¡Candidato seleccionado exitosamente!' });
      setConfirmSelectApp(null);
    } catch (err) {
      console.error(err);
      setSelectMsg({ type: 'error', text: err.message || 'Error al seleccionar el candidato.' });
    } finally {
      setIsSelecting(false);
    }
  };

  // Consultar perfil de un candidato postulado
  const handleViewCandidateProfile = async (app, e) => {
    if (e) e.stopPropagation();
    setSelectedCandidate(app);
    setCandidateProfile(null);
    setLoadingProfile(true);
    try {
      const doc = app.document;
      
      // 1. Obtener datos detallados del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('document', doc)
        .single();
      if (userError) throw userError;

      // 2. Obtener datos del vehículo (si existen)
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('document', doc)
        .maybeSingle();

      // 3. Obtener valoraciones/calificaciones del usuario
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

      setCandidateProfile({
        user: userData,
        vehicle: vehicleData,
        rating: { average: Number(average), count }
      });
    } catch (err) {
      console.error('Error al cargar perfil del candidato:', err);
      // Fallback con la información básica que ya tenemos de la postulación
      setCandidateProfile({
        user: {
          frt_name: app.users?.frt_name || 'Usuario',
          frt_last_name: app.users?.frt_last_name || 'Anónimo',
          email: app.users?.email || '',
          user_type: app.users?.user_type || 'Estudiante',
          document: app.document
        },
        vehicle: null,
        rating: { average: 0, count: 0 }
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenDelete = (offer, e) => {
    if (e) e.stopPropagation();
    setDeletingOffer(offer);
    setDeleteMsg(null);
    setIsDeleteModalOpen(true);
    setSelectedOffer(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOffer) return;
    setIsDeleting(true);
    setDeleteMsg(null);
    try {
      // 1. Eliminar postulaciones (FK apn_ofr_fk → offers)
      const { error: appsError } = await supabase
        .from('aplications')
        .delete()
        .eq('id_offer', deletingOffer.id_offer);
      if (appsError) throw appsError;

      // 2. Eliminar job_details (FK → offers)
      const { error: detailsError } = await supabase
        .from('job_details')
        .delete()
        .eq('id_offer', deletingOffer.id_offer);
      if (detailsError) throw detailsError;

      // 3. Eliminar la oferta
      const { error: offerError } = await supabase
        .from('offers')
        .delete()
        .eq('id_offer', deletingOffer.id_offer);
      if (offerError) throw offerError;

      setIsDeleteModalOpen(false);
      setDeletingOffer(null);
      setDeleteMsg({ type: 'success', text: '¡Vacante eliminada exitosamente!' });
      fetchMyOffers();
    } catch (error) {
      console.error(error);
      setDeleteMsg({ type: 'error', text: error.message || 'Error al eliminar la vacante.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // HU-054: Cerrar vacante publicada
  const handleOpenClose = (offer, e) => {
    if (e) e.stopPropagation();
    setClosingOffer(offer);
    setCloseMsg(null);
    setIsCloseModalOpen(true);
    setSelectedOffer(null);
  };

  const handleConfirmClose = async () => {
    if (!closingOffer) return;
    setIsClosing(true);
    setCloseMsg(null);
    try {
      // Actualizar el estado de la oferta a 'Cerrada'
      const { error } = await supabase
        .from('offers')
        .update({ status: 'Cerrada' })
        .eq('id_offer', closingOffer.id_offer);

      if (error) throw error;

      // Notificar a los postulantes pendientes
      const { data: applicants } = await supabase
        .from('aplications')
        .select('document')
        .eq('id_offer', closingOffer.id_offer)
        .eq('app_status', 'Pendiente');

      if (applicants && applicants.length > 0) {
        const notifications = applicants.map(app => ({
          user_document: app.document,
          type: 'offer_closed',
          message: `La vacante de "${closingOffer.job_details?.category || 'Trabajo General'}" ha sido cerrada.`
        }));
        await supabase.from('notifications').insert(notifications);
      }

      setIsCloseModalOpen(false);
      setClosingOffer(null);
      setCloseMsg({ type: 'success', text: '¡Vacante cerrada exitosamente!' });
      fetchMyOffers();
    } catch (error) {
      console.error(error);
      setCloseMsg({ type: 'error', text: error.message || 'Error al cerrar la vacante.' });
    } finally {
      setIsClosing(false);
    }
  };

  // HU-055: Finalizar vacante publicada
  const handleOpenFinalize = (offer, e) => {
    if (e) e.stopPropagation();
    setFinalizingOffer(offer);
    setFinalizeMsg(null);
    setIsFinalizeModalOpen(true);
    setSelectedOffer(null);
  };

  const handleConfirmFinalize = async () => {
    if (!finalizingOffer) return;
    setIsFinalizing(true);
    setFinalizeMsg(null);
    try {
      // 1. Actualizar el estado de la oferta a 'Finalizada'
      const { error } = await supabase
        .from('offers')
        .update({ status: 'Finalizada' })
        .eq('id_offer', finalizingOffer.id_offer);

      if (error) throw error;

      // 2. Notificar al trabajador seleccionado (document_employee)
      if (finalizingOffer.document_employee && finalizingOffer.document_employee !== finalizingOffer.document_employer) {
        await supabase.from('notifications').insert({
          user_document: finalizingOffer.document_employee,
          type: 'offer_finalized',
          message: `El trabajo de "${finalizingOffer.job_details?.category || 'Trabajo General'}" ha sido finalizado. Ya puedes proceder con la evaluación mutua.`
        });
      }

      setIsFinalizeModalOpen(false);
      setFinalizingOffer(null);
      setFinalizeMsg({ type: 'success', text: '¡Vacante finalizada exitosamente! El proceso de calificación está habilitado.' });
      fetchMyOffers();
    } catch (error) {
      console.error(error);
      setFinalizeMsg({ type: 'error', text: error.message || 'Error al finalizar la vacante.' });
    } finally {
      setIsFinalizing(false);
    }
  };

  // HU-058: Abrir modal para calificar trabajador
  const handleOpenRating = async (offer, e) => {
    if (e) e.stopPropagation();
    
    // Validaciones
    if (!offer.document_employee || offer.document_employee === offer.document_employer) {
      alert('No hay trabajador asignado a esta vacante.');
      return;
    }

    if (offer.status !== 'Finalizada') {
      alert('La vacante debe estar en estado "Finalizada" para calificar al trabajador.');
      return;
    }

    setRatingOffer(offer);
    setRatingFormData({ score: 5, comment: '' });
    setRatingMsg(null);
    setIsRatingModalOpen(true);
    setSelectedOffer(null);

    // Verificar si ya existe una calificación
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('document')
        .eq('email', user.email)
        .single();

      if (!userData) {
        setRatingMsg({ type: 'error', text: 'No se pudo verificar tu documento.' });
        return;
      }

      const { data: existingRatingData, error: ratingError } = await supabase
        .from('ratings')
        .select('*')
        .eq('id_offer', offer.id_offer)
        .eq('document_rater', userData.document)
        .eq('document_rated', offer.document_employee)
        .maybeSingle();

      if (ratingError) {
        console.error('[HU-058] Error al verificar calificación existente:', ratingError);
      } else if (existingRatingData) {
        setExistingRating(existingRatingData);
        setRatingFormData({
          score: existingRatingData.score,
          comment: existingRatingData.comment || ''
        });
        setRatingMsg({
          type: 'info',
          text: `Ya calificaste a este trabajador con ${existingRatingData.score} estrella${existingRatingData.score > 1 ? 's' : ''}.`
        });
      }
    } catch (err) {
      console.error('[HU-058] Error al cargar calificación existente:', err);
    }
  };

  // HU-058: Enviar calificación
  const handleSubmitRating = async () => {
    if (!ratingOffer) return;
    setIsSubmittingRating(true);
    setRatingMsg(null);

    try {
      // Obtener documento del empleador (usuario actual)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('document')
        .eq('email', user.email)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('No se pudo obtener tu documento.');

      const raterDoc = userData.document;
      const ratedDoc = ratingOffer.document_employee;
      const offerId = ratingOffer.id_offer;

      // Validar: solo el empleador puede calificar
      if (raterDoc !== ratingOffer.document_employer) {
        throw new Error('Solo el empleador puede calificar al trabajador.');
      }

      // Si ya existe calificación, actualizar (pero el PK no lo permite, así que eliminar e insertar)
      if (existingRating) {
        const { error: deleteError } = await supabase
          .from('ratings')
          .delete()
          .eq('id_offer', offerId)
          .eq('document_rater', raterDoc)
          .eq('document_rated', ratedDoc);

        if (deleteError) throw deleteError;
      }

      // Insertar la nueva calificación
      const { error: insertError } = await supabase
        .from('ratings')
        .insert({
          id_offer: offerId,
          document_rater: raterDoc,
          document_rated: ratedDoc,
          score: Number(ratingFormData.score),
          comment: ratingFormData.comment || null
        });

      if (insertError) throw insertError;

      // Notificar al trabajador
      await supabase.from('notifications').insert({
        user_document: ratedDoc,
        type: 'worker_rated',
        message: `${ratingOffer.job_details?.category || 'El empleador'} te ha calificado con ${ratingFormData.score} estrella${ratingFormData.score > 1 ? 's' : ''}.`
      });

      setRatingMsg({
        type: 'success',
        text: `¡Calificación registrada exitosamente! Le diste ${ratingFormData.score} estrella${ratingFormData.score > 1 ? 's' : ''} al trabajador.`
      });
      setExistingRating(null);
      setTimeout(() => {
        setIsRatingModalOpen(false);
        fetchMyOffers();
      }, 2000);
    } catch (error) {
      console.error('[HU-058] Error al calificar:', error);
      setRatingMsg({
        type: 'error',
        text: error.message || 'Error al registrar la calificación.'
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

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
    
    // Validar que la fecha no sea anterior a hoy
    const selectedDate = new Date(editFormData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setErrorMsg('La fecha del servicio no puede ser anterior a hoy.');
      return;
    }
    
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
                      {offer.status !== 'Cerrada' && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded-md hover:bg-orange-50 transition-colors hover:cursor-pointer"
                          onClick={(e) => handleOpenClose(offer, e)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cerrar
                        </button>
                      )}
                      {offer.status === 'Cerrada' && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors hover:cursor-pointer"
                          onClick={(e) => handleOpenFinalize(offer, e)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Finalizar
                        </button>
                      )}
                      {offer.status === 'Finalizada' && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium px-2 py-1 rounded-md hover:bg-yellow-50 transition-colors hover:cursor-pointer"
                          onClick={(e) => handleOpenRating(offer, e)}
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Calificar
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors hover:cursor-pointer"
                        onClick={(e) => handleOpenDelete(offer, e)}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors hover:cursor-pointer"
                        onClick={(e) => handleOpenApplicants(offer, e)}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Postulantes
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
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-4 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors"
                  onClick={(e) => handleOpenApplicants(offer, e)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Postulantes
                </button>
                {offer.status !== 'Cerrada' && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 text-sm text-orange-600 hover:text-orange-800 font-medium px-4 py-2 rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors"
                    onClick={(e) => handleOpenClose(offer, e)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cerrar Vacante
                  </button>
                )}
                {offer.status === 'Cerrada' && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium px-4 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors"
                    onClick={(e) => handleOpenFinalize(offer, e)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Finalizar Vacante
                  </button>
                )}
                {offer.status === 'Finalizada' && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 text-sm text-yellow-600 hover:text-yellow-800 font-medium px-4 py-2 rounded-xl border border-yellow-200 hover:bg-yellow-50 transition-colors"
                    onClick={(e) => handleOpenRating(offer, e)}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Calificar Trabajador
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                  onClick={(e) => handleOpenDelete(offer, e)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
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

      {/* ── Modal: Confirmar Cierre de Vacante (HU-054) ── */}
      {isCloseModalOpen && closingOffer && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !isClosing && setIsCloseModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header naranja */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cerrar Vacante</h2>
                <p className="text-orange-100 text-xs">Las nuevas postulaciones serán bloqueadas</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-slate-700 text-sm leading-relaxed">
                ¿Estás seguro de que deseas cerrar la vacante de{' '}
                <span className="font-semibold text-slate-900">
                  {closingOffer.job_details?.category || 'Trabajo General'}
                </span>?
              </p>
              <p className="text-slate-500 text-xs mt-2">
                No se podrán aceptar nuevas postulaciones. Los postulantes pendientes serán notificados.
              </p>

              {closeMsg?.type === 'error' && (
                <div className="mt-3 bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                  {closeMsg.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCloseModalOpen(false)}
                disabled={isClosing}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isClosing}
                onClick={handleConfirmClose}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isClosing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cerrando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Sí, cerrar vacante
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Finalización de Vacante (HU-055) ── */}
      {isFinalizeModalOpen && finalizingOffer && (
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
                <h2 className="text-base font-bold text-white">Finalizar Vacante</h2>
                <p className="text-emerald-100 text-xs">Habilita el proceso de evaluación mutua</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-slate-700 text-sm leading-relaxed">
                ¿Estás seguro de que deseas finalizar la vacante de{' '}
                <span className="font-semibold text-slate-900">
                  {finalizingOffer.job_details?.category || 'Trabajo General'}
                </span>?
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Una vez finalizada, no se podrán hacer modificaciones. El trabajador recibirá notificación y podrán proceder con la evaluación mutua.
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
                    Sí, finalizar vacante
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    min={getTodayDate()}
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

      {/* ── Modal: Postulantes de la Vacante (HU-038) ── */}
      {isApplicantsModalOpen && applicantsOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsApplicantsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 rounded-t-2xl shrink-0">
              <button
                onClick={() => setIsApplicantsModalOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Postulantes</h2>
                  <p className="text-indigo-200 text-sm">
                    {applicantsOffer.job_details?.category || 'Trabajo General'}
                  </p>
                </div>
                {!loadingApplicants && (
                  <span className="ml-auto shrink-0 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {applicants.length} {applicants.length === 1 ? 'candidato' : 'candidatos'}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6">
              {loadingApplicants ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm">Cargando postulantes...</p>
                </div>
              ) : applicants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">Sin postulantes aún</h3>
                  <p className="text-sm text-slate-400">Nadie se ha postulado a esta vacante todavía. ¡Espera un poco más!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applicants.map((app, idx) => {
                    const u = app.users || {};
                    const fullName = u.frt_name && u.frt_last_name
                      ? `${u.frt_name} ${u.frt_last_name}`
                      : 'Usuario Anónimo';
                    const initials = fullName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                    const appliedDate = app.created_at
                      ? new Date(app.created_at).toLocaleDateString('es-CO', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })
                      : 'Fecha desconocida';
                    const statusColor =
                      app.app_status === 'Aceptado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      app.app_status === 'Rechazado' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-amber-100 text-amber-700 border-amber-200';

                    const isOfferPending = (applicantsOffer?.status || 'Pendiente') === 'Pendiente';
                    const isAccepted = app.app_status === 'Aceptado';
                    const isRejected = app.app_status === 'Rechazado';

                    return (
                      <div
                        key={`${app.id_offer}-${app.document}-${idx}`}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200
                          ${isAccepted
                            ? 'bg-emerald-50 border-emerald-200'
                            : isRejected
                            ? 'bg-slate-50 border-slate-100 opacity-60'
                            : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                          }`}
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm
                          ${isAccepted ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-indigo-500 to-violet-500'}`}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-slate-800 text-sm truncate">{fullName}</p>
                                {isAccepted && (
                                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                              {u.email && (
                                <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                              )}
                            </div>
                            <span className={`shrink-0 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {app.app_status || 'Pendiente'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {app.document && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                                {app.document}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Postulado el {appliedDate}
                            </span>

                            {/* Acciones */}
                            <div className="ml-auto flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue bg-white hover:bg-blue-50 border border-slate-200 hover:border-brand-blue px-3 py-1.5 rounded-full transition-colors hover:cursor-pointer"
                                onClick={(e) => handleViewCandidateProfile(app, e)}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Perfil
                              </button>

                              {/* Botón seleccionar (HU-039) */}
                              {isOfferPending && !isAccepted && !isRejected && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-colors hover:cursor-pointer"
                                  onClick={() => setConfirmSelectApp({ app, offer: applicantsOffer })}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Seleccionar
                                </button>
                              )}
                              {isAccepted && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Candidato asignado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer con mensaje de éxito/error */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0 space-y-3">
              {selectMsg && (
                <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border
                  ${selectMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                  {selectMsg.type === 'success' ? (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {selectMsg.text}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => { setIsApplicantsModalOpen(false); setSelectMsg(null); }}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar selección de candidato (HU-039) ── */}
      {confirmSelectApp && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !isSelecting && setConfirmSelectApp(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header verde */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Seleccionar Candidato</h2>
                <p className="text-emerald-100 text-xs">Esta acción asignará oficialmente el trabajo</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Candidato a seleccionar */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(() => {
                    const u = confirmSelectApp.app.users || {};
                    const name = u.frt_name && u.frt_last_name ? `${u.frt_name} ${u.frt_last_name}` : 'A';
                    return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                  })()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {(() => {
                      const u = confirmSelectApp.app.users || {};
                      return u.frt_name && u.frt_last_name ? `${u.frt_name} ${u.frt_last_name}` : 'Usuario Anónimo';
                    })()}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{confirmSelectApp.app.users?.email || confirmSelectApp.app.document}</p>
                </div>
              </div>

              <p className="text-slate-700 text-sm leading-relaxed">
                Al confirmar, este candidato quedará{' '}
                <span className="font-semibold text-emerald-700">asignado oficialmente</span>{' '}
                a la vacante de{' '}
                <span className="font-semibold text-slate-900">
                  {confirmSelectApp.offer?.job_details?.category || 'Trabajo General'}
                </span>.
                Los demás postulantes serán notificados con estado{' '}
                <span className="font-semibold text-red-600">Rechazado</span>.
              </p>
              <p className="text-slate-400 text-xs">
                La vacante pasará a estado <span className="font-medium text-indigo-600">"En curso"</span>. Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmSelectApp(null)}
                disabled={isSelecting}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isSelecting}
                onClick={handleConfirmSelect}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isSelecting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Asignando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Sí, seleccionar
                  </>
                )}
              </button>
              </div>
          </div>
        </div>
      )}

      {/* ── Modal: Perfil del Candidato (HU-038 follow-up) ── */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
            style={{ animation: 'slideUp 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con gradiente */}
            <div className="relative bg-gradient-to-r from-brand-blue to-blue-600 px-6 py-5 rounded-t-2xl shrink-0">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-white">Perfil del Candidato</h2>
              <p className="text-blue-100 text-xs mt-0.5">Detalles de su postulación e información pública</p>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {loadingProfile ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm">Cargando perfil...</p>
                </div>
              ) : candidateProfile ? (
                <>
                  {/* Avatar y Nombre */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
                      {(() => {
                        const u = candidateProfile.user || {};
                        const name = u.frt_name && u.frt_last_name ? `${u.frt_name} ${u.frt_last_name}` : 'C';
                        return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                      })()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg leading-snug">
                        {(() => {
                          const u = candidateProfile.user || {};
                          return `${u.frt_name || ''} ${u.scd_name ? u.scd_name + ' ' : ''}${u.frt_last_name || ''} ${u.scd_last_name || ''}`.trim() || 'Usuario Anónimo';
                        })()}
                      </h3>
                      <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {candidateProfile.user?.user_type || 'Estudiante'}
                      </span>
                    </div>
                  </div>

                  {/* Valoración / Calificaciones */}
                  <div className="flex items-center bg-yellow-50/70 border border-yellow-200/60 p-3 rounded-xl">
                    <svg className="w-5 h-5 text-yellow-500 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-yellow-800">
                        {candidateProfile.rating.average} / 5.0
                      </p>
                      <p className="text-xs text-yellow-600">
                        ({candidateProfile.rating.count} {candidateProfile.rating.count === 1 ? 'valoración' : 'valoraciones'})
                      </p>
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos de Contacto</h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {candidateProfile.user?.email && (
                        <a
                          href={`mailto:${candidateProfile.user.email}`}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-blue/30 hover:bg-blue-50/20 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-brand-blue shrink-0 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-400 font-medium">Correo electrónico</p>
                            <p className="text-sm font-semibold text-slate-700 truncate">{candidateProfile.user.email}</p>
                          </div>
                        </a>
                      )}

                      {candidateProfile.user?.phne_number && (
                        <a
                          href={`tel:${candidateProfile.user.phne_number}`}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-500/30 hover:bg-emerald-50/20 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-400 font-medium">Teléfono / WhatsApp</p>
                            <p className="text-sm font-semibold text-slate-700 truncate">{candidateProfile.user.phne_number}</p>
                          </div>
                        </a>
                      )}

                      {candidateProfile.user?.document && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-400 font-medium">Documento de identidad</p>
                            <p className="text-sm font-semibold text-slate-700 truncate">{candidateProfile.user.document}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Perfil Profesional */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Perfil Profesional</h4>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {candidateProfile.user?.description || 'Este usuario aún no ha agregado una descripción a su perfil.'}
                      </p>
                    </div>
                  </div>

                  {/* Vehículo Registrado (Si aplica) */}
                  {candidateProfile.user?.user_type === 'Estudiante' && candidateProfile.vehicle && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehículo Registrado</h4>
                      <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          {candidateProfile.vehicle.type === 'Carro' ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10l-1-4H6l-1 4M3 10h18M4 10v7a2 2 0 002 2h12a2 2 0 002-2v-7M9 14h.01M15 14h.01" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4a4 4 0 100 8 4 4 0 000-8zM5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M15 18a3 3 0 100-6 3 3 0 000 6zM5 18a3 3 0 100-6 3 3 0 000 6z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {candidateProfile.vehicle.type}
                          </p>
                          <p className="text-xs text-slate-500">
                            Placa: <span className="font-mono font-semibold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{candidateProfile.vehicle.plate}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No se pudo cargar el perfil del candidato.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={async () => {
                    try {
                      // Obtener documento del usuario actual
                      const { data: meData, error: meErr } = await supabase
                        .from('users')
                        .select('document')
                        .eq('email', user.email)
                        .single();

                      if (meErr) throw meErr;
                      const myDoc = meData?.document;
                      const otherDoc = candidateProfile?.user?.document || selectedCandidate?.document;
                      const offerId = selectedCandidate?.id_offer || null;

                      if (!myDoc) {
                        alert('Completa tu perfil antes de iniciar una conversación.');
                        return;
                      }

                      // Buscar conversación existente
                      const { data: existing } = await supabase
                        .from('conversations')
                        .select('*')
                        .or(`(participant_a.eq.${myDoc},participant_b.eq.${otherDoc}),(participant_a.eq.${otherDoc},participant_b.eq.${myDoc})`)
                        .eq('id_offer', offerId)
                        .limit(1);

                      if (existing && existing.length > 0) {
                        const conv = existing[0];
                        navigate(`/app/mensajes?conversation=${conv.id}`);
                        return;
                      }

                      const newConv = {
                        id: `CONV-${Math.floor(100000 + Math.random() * 900000)}`,
                        id_offer: offerId,
                        participant_a: myDoc,
                        participant_b: otherDoc,
                        created_at: new Date().toISOString()
                      };

                      const { data: insertData, error: insertErr } = await supabase
                        .from('conversations')
                        .insert(newConv)
                        .select()
                        .limit(1);

                      if (insertErr) {
                        // Fallback: notificar al otro
                        await supabase.from('notifications').insert({
                          user_document: otherDoc,
                          type: 'new_message',
                          message: `${user?.user_metadata?.full_name || user?.email || 'Un usuario'} desea iniciar una conversación.`
                        });
                        navigate('/app/mensajes');
                        return;
                      }

                      const created = Array.isArray(insertData) ? insertData[0] : insertData;
                      navigate(`/app/mensajes?conversation=${created.id || created.id_conversation || newConv.id}`);
                    } catch (err) {
                      console.error('Error iniciando conversación:', err);
                      alert('No fue posible iniciar la conversación.');
                    }
                  }}
                >
                  Enviar mensaje
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedCandidate(null)}
                >
                  Cerrar Perfil
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Calificar Trabajador (HU-058) ── */}
      {isRatingModalOpen && ratingOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !isSubmittingRating && setIsRatingModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-5 rounded-t-2xl">
              <button
                onClick={() => !isSubmittingRating && setIsRatingModalOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                disabled={isSubmittingRating}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Calificar Trabajador</h2>
                  <p className="text-yellow-100 text-sm">
                    {ratingOffer.job_details?.category || 'Trabajo General'}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Información del trabajador */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                  {ratingOffer.document_employee ? ratingOffer.document_employee.substring(0, 2).toUpperCase() : 'WK'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Documento del trabajador</p>
                  <p className="text-xs text-slate-500 font-mono">{ratingOffer.document_employee}</p>
                </div>
              </div>

              {/* Mensaje informativo */}
              {ratingMsg && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border text-sm
                    ${
                      ratingMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : ratingMsg.type === 'error'
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
                    {ratingMsg.type === 'success' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : ratingMsg.type === 'error' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <span>{ratingMsg.text}</span>
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
                      disabled={isSubmittingRating}
                      onClick={() => setRatingFormData({ ...ratingFormData, score: star })}
                      className={`transition-all transform hover:scale-110 disabled:opacity-50
                        ${
                          star <= ratingFormData.score
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
                  Has seleccionado <span className="font-bold text-amber-600">{ratingFormData.score}</span> estrella{ratingFormData.score > 1 ? 's' : ''}
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
                  disabled={isSubmittingRating}
                  value={ratingFormData.comment}
                  onChange={(e) => setRatingFormData({ ...ratingFormData, comment: e.target.value })}
                  placeholder="Comparte tu experiencia con este trabajador (máx. 500 caracteres)..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {ratingFormData.comment.length}/500 caracteres
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsRatingModalOpen(false)}
                disabled={isSubmittingRating}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isSubmittingRating || ratingMsg?.type === 'success'}
                onClick={handleSubmitRating}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isSubmittingRating ? (
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

      {/* ── Toast de éxito/error post-eliminación ── */}
      {deleteMsg && !isDeleteModalOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium transition-all duration-300
            ${
              deleteMsg.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
        >
          {deleteMsg.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {deleteMsg.text}
          <button onClick={() => setDeleteMsg(null)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminación ── */}
      {isDeleteModalOpen && deletingOffer && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header rojo */}
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Eliminar Vacante</h2>
                <p className="text-red-100 text-xs">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-slate-700 text-sm leading-relaxed">
                ¿Estás seguro de que deseas eliminar la vacante de{' '}
                <span className="font-semibold text-slate-900">
                  {deletingOffer.job_details?.category || 'Trabajo General'}
                </span>?
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Se eliminará permanentemente de la base de datos junto con todos sus detalles.
              </p>

              {deleteMsg?.type === 'error' && (
                <div className="mt-3 bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                  {deleteMsg.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Sí, eliminar
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
