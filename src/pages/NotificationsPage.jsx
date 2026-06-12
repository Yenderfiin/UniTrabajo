import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'

  // Get user document
  useEffect(() => {
    async function fetchUserDoc() {
      if (user?.email) {
        const { data } = await supabase
          .from('users')
          .select('document')
          .eq('email', user.email)
          .single();
        if (data) setUserDoc(data.document);
      }
    }
    fetchUserDoc();
  }, [user]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userDoc) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_document', userDoc)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
    if (error) console.error('Error fetching notifications:', error);
    setLoading(false);
  }, [userDoc]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!userDoc) return;
    const channel = supabase
      .channel('notifications-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_document=eq.${userDoc}` },
        () => fetchNotifications()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userDoc, fetchNotifications]);

  // Mark single as read
  const markAsRead = async (id) => {
    setMarkingId(id);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
    setMarkingId(null);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userDoc) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  // Helpers
  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'offer_accepted': { icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      'offer_rejected': { icon: '❌', bg: 'bg-red-50', border: 'border-red-200' },
      'new_application': { icon: '📩', bg: 'bg-blue-50', border: 'border-blue-200' },
      'payment_received': { icon: '💰', bg: 'bg-amber-50', border: 'border-amber-200' },
      'job_completed': { icon: '🎉', bg: 'bg-purple-50', border: 'border-purple-200' },
      'new_message': { icon: '💬', bg: 'bg-cyan-50', border: 'border-cyan-200' },
      'rating_received': { icon: '⭐', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      'system': { icon: '🔔', bg: 'bg-slate-50', border: 'border-slate-200' },
    };
    return icons[type] || icons['system'];
  };

  // Filter
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Group by date
  const groupByDate = (notifs) => {
    const groups = {};
    notifs.forEach(n => {
      const date = new Date(n.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key;
      if (date.toDateString() === today.toDateString()) {
        key = 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Ayer';
      } else {
        key = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  };

  const groupedNotifications = groupByDate(filteredNotifications);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-7 h-7 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notificaciones
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {unreadCount > 0
                ? `Tienes ${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`
                : 'Todas las notificaciones están al día'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="shrink-0 text-xs gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { key: 'all', label: 'Todas', count: notifications.length },
            { key: 'unread', label: 'No leídas', count: unreadCount },
            { key: 'read', label: 'Leídas', count: notifications.length - unreadCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border
                ${filter === tab.key
                  ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue hover:text-brand-blue'
                }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${filter === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4 p-5 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-50 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {filter === 'unread' ? 'No tienes notificaciones sin leer' :
             filter === 'read' ? 'No tienes notificaciones leídas' :
             'Sin notificaciones'}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {filter === 'all'
              ? 'Cuando tengas actividad relevante en la plataforma, las notificaciones aparecerán aquí.'
              : 'Intenta cambiar el filtro para ver otras notificaciones.'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-sm font-medium text-brand-blue hover:underline"
            >
              Ver todas las notificaciones
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([dateLabel, notifs]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                {dateLabel}
              </h3>
              <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {notifs.map(notif => {
                    const iconData = getNotificationIcon(notif.type);
                    const isUnread = !notif.is_read;

                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-4 p-5 transition-all duration-200 group relative
                          ${isUnread ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50'}`}
                        id={`notification-page-${notif.id}`}
                      >
                        {/* Unread dot */}
                        {isUnread && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-blue"></div>
                        )}

                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl ${iconData.bg} border ${iconData.border} flex items-center justify-center shrink-0`}>
                          <span className="text-xl">{iconData.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed ${isUnread ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatTimeAgo(notif.created_at)}
                            </p>
                            <span className="text-xs text-slate-300" title={formatFullDate(notif.created_at)}>
                              {formatFullDate(notif.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {isUnread && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            disabled={markingId === notif.id}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-brand-blue p-2 rounded-lg hover:bg-blue-50"
                            title="Marcar como leída"
                          >
                            {markingId === notif.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
