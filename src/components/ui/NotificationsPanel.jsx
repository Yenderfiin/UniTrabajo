import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

/**
 * NotificationsPanel — dropdown panel for viewing user notifications.
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onUnreadCountChange: (count: number) => void
 */
export function NotificationsPanel({ isOpen, onClose, onUnreadCountChange }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Don't close if clicking the bell button (parent handles toggle)
        if (e.target.closest('[data-notifications-trigger]')) return;
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

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
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      const unread = data.filter(n => !n.is_read).length;
      onUnreadCountChange?.(unread);
    }
    if (error) {
      console.error('Error fetching notifications:', error);
    }
    setLoading(false);
  }, [userDoc, onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh on open
  useEffect(() => {
    if (isOpen && userDoc) {
      fetchNotifications();
    }
  }, [isOpen, userDoc, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!userDoc) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_document=eq.${userDoc}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userDoc, fetchNotifications]);

  // Mark single as read
  const markAsRead = async (id) => {
    setMarkingId(id);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      const newUnread = notifications.filter(n => !n.is_read && n.id !== id).length;
      onUnreadCountChange?.(newUnread);
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
      onUnreadCountChange?.(0);
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
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'offer_accepted': { icon: '✅', bg: 'bg-emerald-50', text: 'text-emerald-600' },
      'offer_rejected': { icon: '❌', bg: 'bg-red-50', text: 'text-red-600' },
      'new_application': { icon: '📩', bg: 'bg-blue-50', text: 'text-blue-600' },
      'payment_received': { icon: '💰', bg: 'bg-amber-50', text: 'text-amber-600' },
      'job_completed': { icon: '🎉', bg: 'bg-purple-50', text: 'text-purple-600' },
      'new_message': { icon: '💬', bg: 'bg-cyan-50', text: 'text-cyan-600' },
      'rating_received': { icon: '⭐', bg: 'bg-yellow-50', text: 'text-yellow-600' },
      'system': { icon: '🔔', bg: 'bg-slate-50', text: 'text-slate-600' },
    };
    return icons[type] || icons['system'];
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={onClose}></div>

      <div
        ref={panelRef}
        className="
          fixed sm:absolute top-0 sm:top-full right-0 sm:right-0 sm:mt-2
          w-full sm:w-[400px]
          h-full sm:h-auto sm:max-h-[calc(100vh-80px)]
          bg-white sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200
          z-50 flex flex-col
          sm:origin-top-right
        "
        style={{ animation: 'notifSlideIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Notificaciones</h2>
            {unreadCount > 0 && (
              <span className="bg-brand-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-brand-blue hover:text-brand-blue-hover transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
              >
                Marcar todas leídas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse p-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-50 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Sin notificaciones</h3>
              <p className="text-sm text-slate-400 max-w-[240px]">
                Cuando tengas actividad relevante, las notificaciones aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map(notif => {
                const iconData = getNotificationIcon(notif.type);
                const isUnread = !notif.is_read;

                return (
                  <div
                    key={notif.id}
                    className={`
                      flex items-start gap-3 px-5 py-4 transition-all duration-200 cursor-pointer
                      hover:bg-slate-50 group relative
                      ${isUnread ? 'bg-blue-50/40' : ''}
                    `}
                    onClick={() => { if (isUnread) markAsRead(notif.id); }}
                    id={`notification-${notif.id}`}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-blue animate-pulse"></div>
                    )}

                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${iconData.bg} flex items-center justify-center shrink-0`}>
                      <span className="text-lg">{iconData.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${isUnread ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTimeAgo(notif.created_at)}
                      </p>
                    </div>

                    {/* Mark as read button */}
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        disabled={markingId === notif.id}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-brand-blue p-1 rounded-lg hover:bg-blue-50"
                        title="Marcar como leída"
                      >
                        {markingId === notif.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 shrink-0 text-center">
            <p className="text-xs text-slate-400">
              Mostrando las últimas {notifications.length} notificaciones
            </p>
          </div>
        )}

        {/* Animation styles */}
        <style>{`
          @keyframes notifSlideIn {
            from { opacity: 0; transform: translateY(-8px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (max-width: 639px) {
            @keyframes notifSlideIn {
              from { opacity: 0; transform: translateX(100%); }
              to { opacity: 1; transform: translateX(0); }
            }
          }
        `}</style>
      </div>
    </>
  );
}
