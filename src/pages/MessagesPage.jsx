import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate, formatPayment, getInitials } from '../utils/helpers';

export function MessagesPage() {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function fetchUserDoc() {
      if (!user?.email) return;

      const { data, error } = await supabase
        .from('users')
        .select('document')
        .eq('email', user.email)
        .single();

      if (error) {
        setErrorMsg('No fue posible cargar tu perfil para abrir mensajes.');
        setLoading(false);
        return;
      }

      setUserDoc(data?.document || null);
    }

    fetchUserDoc();
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!userDoc) return;

    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('offers')
      .select(`
        id_offer,
        description,
        create_at,
        status,
        type_offer,
        document_employer,
        document_employee,
        employer:users!document_employer ( frt_name, frt_last_name, email, user_type ),
        employee:users!document_employee ( frt_name, frt_last_name, email, user_type ),
        job_details ( category, payment, hours )
      `)
      .eq('status', 'En curso')
      .or(`document_employer.eq.${userDoc},document_employee.eq.${userDoc}`)
      .order('create_at', { ascending: false });

    if (error) {
      setErrorMsg('No pudimos cargar las conversaciones activas.');
      setConversations([]);
    } else {
      const mapped = (data || []).map((offer) => {
        const isEmployer = offer.document_employer === userDoc;
        const counterpart = isEmployer ? offer.employee : offer.employer;
        const category = offer.job_details?.category || offer.type_offer || 'Conversación';

        return {
          id: offer.id_offer,
          title: category,
          counterpartName: counterpart ? `${counterpart.frt_name} ${counterpart.frt_last_name}`.trim() : 'Usuario sin nombre',
          counterpartRole: isEmployer ? 'Estudiante' : 'Empleador',
          category,
          payment: offer.job_details?.payment || null,
          hours: offer.job_details?.hours || null,
          createdAt: offer.create_at,
          status: offer.status,
          preview: offer.description || 'La conversación está activa en esta vacante.',
          initials: getInitials(counterpart ? `${counterpart.frt_name} ${counterpart.frt_last_name}`.trim() : 'Usuario'),
          tone: isEmployer ? 'from-blue-500 to-cyan-500' : 'from-emerald-500 to-teal-500',
        };
      });

      setConversations(mapped);
    }

    setLoading(false);
  }, [userDoc]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || conversations[0] || null,
    [conversations, selectedConversationId]
  );

  const activeCount = conversations.length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 mb-3">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Mensajería activa
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mensajes</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Revisa tus conversaciones activas vinculadas a vacantes en curso y continúa la comunicación desde un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {activeCount} conversación{activeCount === 1 ? '' : 'es'} activa{activeCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {errorMsg && (
        <Card className="mb-6 border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
          {errorMsg}
        </Card>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-4 flex gap-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-50" />
                    <div className="h-3 w-full rounded bg-slate-50" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 min-h-[420px] flex items-center justify-center text-center text-slate-500">
            Cargando conversaciones activas...
          </Card>
        </div>
      ) : conversations.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
            <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h6m-6 8l-4 2V5a2 2 0 012-2h12a2 2 0 012 2v13a2 2 0 01-2 2H7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-700">No tienes conversaciones activas</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto">
            Cuando participes en una vacante en curso, las conversaciones aparecerán aquí para que puedas seguir el hilo desde la plataforma.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="primary" onClick={() => window.location.assign('/app')}>
              Explorar micro-trabajos
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Conversaciones activas</h2>
                <p className="text-xs text-slate-500">Selecciona un hilo para ver el contexto de la conversación.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {conversations.map((conversation) => {
                const isSelected = conversation.id === selectedConversation?.id;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full text-left p-4 sm:p-5 transition-all duration-200 hover:bg-slate-50 ${isSelected ? 'bg-blue-50/60' : 'bg-white'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${conversation.tone} text-white flex items-center justify-center font-bold shadow-sm shrink-0`}>
                        {conversation.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900 truncate">{conversation.counterpartName}</h3>
                            <p className="text-xs text-slate-500">{conversation.counterpartRole} · {conversation.category}</p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Activa
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                          {conversation.preview}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{formatDate(conversation.createdAt)}</span>
                          {conversation.payment ? <span>• {formatPayment(conversation.payment)}</span> : null}
                          {conversation.hours ? <span>• {conversation.hours} h estimadas</span> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            {selectedConversation ? (
              <div className="h-full flex flex-col">
                <div className="border-b border-slate-100 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${selectedConversation.tone} text-white flex items-center justify-center font-bold text-lg shadow-sm`}>
                      {selectedConversation.initials}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedConversation.counterpartName}</h2>
                      <p className="text-sm text-slate-500">{selectedConversation.counterpartRole} · {selectedConversation.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      En curso
                    </span>
                    {/* <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {selectedConversation.status}
                    </span> */}
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resumen de la conversación</p>
                    <p className="mt-2 text-sm text-slate-700 leading-6">{selectedConversation.preview}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detalles del trabajo</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      <li>• Categoría: {selectedConversation.category}</li>
                      <li>• Fecha de activación: {formatDate(selectedConversation.createdAt)}</li>
                      <li>• Pago estimado: {selectedConversation.payment ? formatPayment(selectedConversation.payment) : 'No definido'}</li>
                      <li>• Duración: {selectedConversation.hours ? `${selectedConversation.hours} h` : 'No definida'}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex-1 px-5 sm:px-6 pb-6">
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center text-slate-500">
                    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
                    </svg>
                    <p className="mt-4 text-sm font-medium text-slate-700">Espacio listo para el chat privado</p>
                    <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                      La lista de conversaciones ya está disponible. Cuando conectes la tabla de mensajes, aquí podrás mostrar el historial y responder en tiempo real.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-[420px] flex items-center justify-center p-6 text-center text-slate-500">
                Selecciona una conversación para ver sus detalles.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}