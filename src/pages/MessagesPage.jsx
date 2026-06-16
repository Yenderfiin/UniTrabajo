import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getInitials, formatPayment } from '../utils/helpers';

/* ─── helpers ────────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-sky-400 to-blue-500',
  'from-green-500 to-emerald-600',
];

function convColor(id) {
  const hash = String(id)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString('es-CO', { weekday: 'short' });
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function msgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit',
  });
}

function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (sameDay(d, now)) return 'Hoy';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function newConvId() {
  return `CONV-${Math.floor(100_000 + Math.random() * 900_000)}`;
}

/* ─── component ──────────────────────────────────────────────────────────── */

export function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();

  /* state */
  const [userDoc, setUserDoc] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  /* new-conversation modal */
  const [showNewModal, setShowNewModal] = useState(false);
  const [eligibleOffers, setEligibleOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [startingConv, setStartingConv] = useState(false);

  /* refs */
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);

  /* Mark messages-page as visited (for Navbar unread badge) */
  useEffect(() => {
    localStorage.setItem('lastMessagesVisit', new Date().toISOString());
  }, []);

  /* ── fetch userDoc ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('users')
      .select('document')
      .eq('email', user.email)
      .single()
      .then(({ data, error: e }) => {
        if (e) setError('No fue posible cargar tu perfil.');
        else setUserDoc(data?.document ?? null);
      });
  }, [user]);

  /* ── fetch conversations ────────────────────────────────────────────────── */
  const fetchConversations = useCallback(async () => {
    if (!userDoc) return;
    setLoadingConvs(true);

    const { data, error: e } = await supabase
      .from('conversations')
      .select(`
        id, id_offer, participant_a, participant_b,
        subject, last_message, created_at,
        last_read_a, last_read_b,
        userA:users!conversations_participant_a_fk(frt_name, frt_last_name, user_type),
        userB:users!conversations_participant_b_fk(frt_name, frt_last_name, user_type),
        offer:offers!conversations_offer_fk(
          type_offer,
          job_details(category, payment, hours)
        )
      `)
      .or(`participant_a.eq.${userDoc},participant_b.eq.${userDoc}`)
      .order('created_at', { ascending: false });

    if (e) {
      setError('No fue posible cargar las conversaciones.');
      setLoadingConvs(false);
      return;
    }

    const mapped = (data ?? []).map(conv => {
      const isA = conv.participant_a === userDoc;
      const other = isA ? conv.userB : conv.userA;
      const otherDoc = isA ? conv.participant_b : conv.participant_a;
      const myLastRead = isA ? conv.last_read_a : conv.last_read_b;

      const name = other
        ? `${other.frt_name ?? ''} ${other.frt_last_name ?? ''}`.trim()
        : otherDoc ?? 'Usuario';

      const category =
        conv.offer?.job_details?.category ??
        conv.offer?.type_offer ??
        conv.subject ??
        'Conversación';

      return {
        id: conv.id,
        idOffer: conv.id_offer,
        isA,
        counterpartName: name,
        counterpartDoc: otherDoc,
        counterpartRole: other?.user_type ?? 'Usuario',
        category,
        payment: conv.offer?.job_details?.payment ?? null,
        hours: conv.offer?.job_details?.hours ?? null,
        lastMessage: conv.last_message,
        createdAt: conv.created_at,
        myLastRead,
        initials: getInitials(name),
        color: convColor(conv.id),
      };
    });

    setConversations(mapped);
    setLoadingConvs(false);
  }, [userDoc]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  /* ── auto-select from URL or first ─────────────────────────────────────── */
  useEffect(() => {
    if (conversations.length === 0) return;
    const params = new URLSearchParams(location.search);
    const q = params.get('conversation');
    if (q) {
      const found = conversations.find(c => c.id === q);
      if (found) { setSelectedId(found.id); return; }
    }
    if (!selectedId) setSelectedId(conversations[0].id);
  }, [conversations, location.search]);

  const selectedConv = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  /* ── load messages + realtime ───────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }

    // Remove previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Load history
    setLoadingMsgs(true);
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoadingMsgs(false);
      });

    // Mark as read
    const conv = conversations.find(c => c.id === selectedId);
    if (conv && userDoc) {
      const field = conv.isA ? 'last_read_a' : 'last_read_b';
      supabase
        .from('conversations')
        .update({ [field]: new Date().toISOString() })
        .eq('id', selectedId);
    }

    // Realtime subscription (Ep9-Hu5)
    const channel = supabase
      .channel(`msgs-${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        ({ new: msg }) => {
          setMessages(prev =>
            prev.some(m => m.id === msg.id) ? prev : [...prev, msg],
          );
          setConversations(prev =>
            prev.map(c =>
              c.id === selectedId ? { ...c, lastMessage: msg.body } : c,
            ),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /* Auto-scroll */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── send message (Ep9-Hu3) ─────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !selectedId || !userDoc || sending) return;

    setSending(true);
    setText('');

    const tmpId = `tmp-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: tmpId,
        conversation_id: selectedId,
        sender_document: userDoc,
        body: trimmed,
        created_at: new Date().toISOString(),
      },
    ]);

    const { data: saved, error: insertErr } = await supabase
      .from('messages')
      .insert({ conversation_id: selectedId, sender_document: userDoc, body: trimmed })
      .select()
      .single();

    if (insertErr) {
      setMessages(prev => prev.filter(m => m.id !== tmpId));
    } else {
      setMessages(prev => prev.map(m => (m.id === tmpId ? saved : m)));
      await supabase
        .from('conversations')
        .update({ last_message: trimmed })
        .eq('id', selectedId);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedId ? { ...c, lastMessage: trimmed } : c,
        ),
      );
    }

    setSending(false);
    inputRef.current?.focus();
  }, [text, selectedId, userDoc, sending]);

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── new conversation modal (Ep9-Hu2 / Ep9-Hu8) ─────────────────────────── */
  const openNewModal = useCallback(async () => {
    if (!userDoc) return;
    setShowNewModal(true);
    setLoadingOffers(true);

    const { data: offersData } = await supabase
      .from('offers')
      .select(`
        id_offer, description, status, type_offer,
        document_employer, document_employee,
        employer:users!document_employer(frt_name, frt_last_name),
        employee:users!document_employee(frt_name, frt_last_name),
        job_details(category)
      `)
      .or(`document_employer.eq.${userDoc},document_employee.eq.${userDoc}`)
      .not('document_employer', 'is', null)
      .not('document_employee', 'is', null);

    // Filter offers that don't already have a conversation
    const existingOfferIds = new Set(
      conversations.filter(c => c.idOffer).map(c => c.idOffer),
    );

    const mapped = (offersData ?? [])
      .filter(o => !existingOfferIds.has(o.id_offer))
      .map(o => {
        const isEmp = o.document_employer === userDoc;
        const other = isEmp ? o.employee : o.employer;
        const otherDoc = isEmp ? o.document_employee : o.document_employer;
        const name = other
          ? `${other.frt_name} ${other.frt_last_name}`.trim()
          : otherDoc;
        return {
          offerId: o.id_offer,
          category: o.job_details?.category ?? o.type_offer ?? 'Trabajo',
          counterpartName: name,
          counterpartDoc: otherDoc,
          isEmployer: isEmp,
          color: convColor(o.id_offer),
          initials: getInitials(name),
        };
      });

    setEligibleOffers(mapped);
    setLoadingOffers(false);
  }, [userDoc, conversations]);

  const handleStartConversation = useCallback(async (offer) => {
    if (!userDoc || startingConv) return;
    setStartingConv(true);

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('id_offer', offer.offerId)
      .or(
        `and(participant_a.eq.${userDoc},participant_b.eq.${offer.counterpartDoc}),` +
        `and(participant_a.eq.${offer.counterpartDoc},participant_b.eq.${userDoc})`,
      )
      .limit(1);

    let convId;
    if (existing?.[0]) {
      convId = existing[0].id;
    } else {
      convId = newConvId();
      const { error: upsertErr } = await supabase.from('conversations').upsert(
        {
          id: convId,
          id_offer: offer.offerId,
          participant_a: userDoc,
          participant_b: offer.counterpartDoc,
          subject: offer.category,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (upsertErr) { setStartingConv(false); return; }
    }

    await fetchConversations();
    setSelectedId(convId);
    setShowNewModal(false);
    setStartingConv(false);
  }, [userDoc, startingConv, fetchConversations]);

  /* ── filtered conversation list ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      c =>
        c.counterpartName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [conversations, search]);

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Page title row */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mensajes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Comunícate con empleadores y candidatos en tiempo real
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-full bg-brand-blue text-white text-sm font-semibold px-4 py-2 hover:bg-brand-blue-hover transition-all shadow-sm hover:shadow-md hover:shadow-brand-blue/20"
          id="new-conversation-btn"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva conversación
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Chat shell */}
      <div
        className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ height: 'calc(100dvh - 56px - 48px - 60px - 24px)' }}
      >
        {/* ── LEFT: conversation list ────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-slate-100 bg-slate-50/60">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition"
                id="conv-search-input"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3 p-2 animate-pulse">
                    <div className="h-11 w-11 rounded-2xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-3 w-full rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <svg className="h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-slate-500 font-medium">
                  {search ? 'Sin resultados' : 'Sin conversaciones'}
                </p>
                {!search && (
                  <p className="text-xs text-slate-400 mt-1">
                    Pulsa "Nueva conversación" para comenzar
                  </p>
                )}
              </div>
            ) : (
              filtered.map(conv => {
                const isSel = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left px-3 py-3 transition-all duration-150 border-l-[3px] ${
                      isSel
                        ? 'bg-blue-50/80 border-brand-blue'
                        : 'bg-transparent border-transparent hover:bg-white'
                    }`}
                    id={`conv-item-${conv.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${conv.color} text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm`}
                      >
                        {conv.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`text-sm font-semibold truncate ${isSel ? 'text-brand-blue' : 'text-slate-900'}`}>
                            {conv.counterpartName}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 mt-px">
                            {relativeTime(conv.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mb-0.5">
                          {conv.counterpartRole} · {conv.category}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {conv.lastMessage ?? 'Sin mensajes aún'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          {conversations.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">
                {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT: chat window ─────────────────────────────────────────── */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="h-16 px-5 flex items-center gap-4 border-b border-slate-100 bg-white shrink-0">
              <div
                className={`h-10 w-10 rounded-xl bg-gradient-to-br ${selectedConv.color} text-white flex items-center justify-center text-sm font-bold shadow-sm`}
              >
                {selectedConv.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 leading-tight truncate">
                  {selectedConv.counterpartName}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedConv.counterpartRole} · {selectedConv.category}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedConv.payment && (
                  <span className="hidden sm:block rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {formatPayment(selectedConv.payment)}
                  </span>
                )}
                {selectedConv.hours && (
                  <span className="hidden sm:block rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {selectedConv.hours}h
                  </span>
                )}
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                  Activa
                </span>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              {loadingMsgs ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <div className="h-8 w-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Cargando historial...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Sin mensajes todavía</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Sé el primero en escribir algo a {selectedConv.counterpartName}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_document === userDoc;
                    const prev = messages[i - 1];
                    const showDay = !prev || !sameDay(prev.created_at, msg.created_at);
                    const sameSender = prev && prev.sender_document === msg.sender_document && !showDay;
                    const isTemp = String(msg.id).startsWith('tmp-');

                    return (
                      <React.Fragment key={msg.id}>
                        {showDay && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[11px] font-medium text-slate-400 px-2 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                              {dayLabel(msg.created_at)}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                        )}

                        <div
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${sameSender ? 'mt-0.5' : 'mt-3'}`}
                        >
                          <div className={`max-w-[68%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-opacity ${
                                isMine
                                  ? 'bg-brand-blue text-white rounded-2xl rounded-br-sm'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-sm'
                              } ${isTemp ? 'opacity-60' : 'opacity-100'}`}
                            >
                              {msg.body}
                            </div>
                            <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] text-slate-400">
                                {msgTime(msg.created_at)}
                              </span>
                              {isMine && isTemp && (
                                <span className="text-[10px] text-slate-400">· Enviando</span>
                              )}
                              {isMine && !isTemp && (
                                <svg className="h-3 w-3 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    id="message-input"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Escribe un mensaje a ${selectedConv.counterpartName}…`}
                    rows={1}
                    style={{ resize: 'none', maxHeight: '120px' }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition text-slate-800 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  id="send-message-btn"
                  className="h-10 w-10 rounded-2xl bg-brand-blue text-white flex items-center justify-center shrink-0 transition-all duration-200 hover:bg-brand-blue-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-brand-blue/25"
                >
                  {sending ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="h-4 w-4 translate-x-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400 text-right">
                Enter para enviar · Shift+Enter para nueva línea
              </p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center bg-slate-50/30">
            <div className="text-center">
              <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Selecciona una conversación</p>
              <p className="text-xs text-slate-400 mt-1">o crea una nueva con el botón de arriba</p>
            </div>
          </div>
        )}
      </div>

      {/* ── New Conversation Modal (Ep9-Hu2 / Ep9-Hu8) ──────────────────── */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nueva conversación</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona una oferta activa para iniciar el chat
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-80 overflow-y-auto px-3 py-3">
              {loadingOffers ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : eligibleOffers.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="h-10 w-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-slate-500 font-medium">Sin ofertas disponibles</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Ya tienes conversaciones activas en todas tus ofertas
                  </p>
                </div>
              ) : (
                eligibleOffers.map(offer => (
                  <button
                    key={offer.offerId}
                    onClick={() => handleStartConversation(offer)}
                    disabled={startingConv}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left mb-1 disabled:opacity-60"
                    id={`start-conv-${offer.offerId}`}
                  >
                    <div
                      className={`h-11 w-11 rounded-xl bg-gradient-to-br ${offer.color} text-white flex items-center justify-center text-sm font-bold shrink-0`}
                    >
                      {offer.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {offer.counterpartName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {offer.isEmployer ? 'Candidato' : 'Empleador'} · {offer.category}
                      </p>
                    </div>
                    <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}