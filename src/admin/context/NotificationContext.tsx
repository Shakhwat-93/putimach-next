'use client';
// @ts-nocheck
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { isNativeApp } from '../platform/runtime';
import { playOrderChime } from '../utils/soundAlerts';
import {
  requestNativePermission,
  checkNativePermission,
  scheduleNativeNotification,
  setupForegroundNotificationListener,
} from '../platform/native/nativeNotifications';

const NotificationContext = createContext(null);

// VAPID public key — must match the private key stored in Supabase Edge Function secrets.
const VAPID_PUBLIC_KEY = 'BApc-Twq0Rcna_p5RaIyHpONw79mW61ZPqx5YDbP_1OqYkV6c4ehNh12rRrwEQyrkw0HqrfxkV5MQ6USkzf4LfE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [startupUnreadNotifications, setStartupUnreadNotifications] = useState([]);
  const [isStartupUnreadModalOpen, setIsStartupUnreadModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    isNativeApp()
      ? 'prompt'
      : typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const { user, profile, isAdmin } = useAuth();
  const userId = user?.id || profile?.id || null;
  const hasShownInitialUnreadToastsRef = useRef(false);
  const recentlyShownToastsRef = useRef(new Set());

  // ── Browser Push & Notifications ───────────────────────────────────────────
  const requestNotificationPermission = useCallback(async (explicit = true) => {
    if (isNativeApp()) {
      try {
        const status = await requestNativePermission();
        setNotificationPermission(status);
        return status;
      } catch (e) {
        console.error('Native permission request failed:', e);
        return 'denied';
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return 'granted';
    }

    if (!explicit) {
      setNotificationPermission(Notification.permission);
      return Notification.permission;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (e) {
      console.error('Browser permission request failed:', e);
      return 'denied';
    }
  }, []);

  const showBrowserNotification = useCallback((notif) => {
    if (isNativeApp()) {
      scheduleNativeNotification({
        id: notif.id ? String(notif.id).replace(/\D/g, '').slice(0, 8) || '1' : '1',
        title: notif.title || 'PutiMach Admin',
        body: notif.message || '',
        data: notif.data || {},
      });
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const n = new Notification(notif.title || 'PutiMach Admin', {
        body: notif.message || '',
        icon: '/favicon.ico',
        tag: `order-${notif.id || Date.now()}`,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      console.warn('Browser notification display warning:', e);
    }
  }, []);

  // ── Toast & Audio Dispatcher with Deduplication ────────────────────────────
  const addToast = useCallback((notif) => {
    if (!notif) return;
    const dedupeKey = notif.id || `notif-${notif.data?.orderId || Date.now()}`;

    // Prevent duplicate toasts for the same order/notif within 30 seconds
    if (recentlyShownToastsRef.current.has(dedupeKey)) {
      return;
    }

    recentlyShownToastsRef.current.add(dedupeKey);
    setTimeout(() => {
      recentlyShownToastsRef.current.delete(dedupeKey);
    }, 30000);

    const toastId = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...notif, toastId }]);

    // Play synthesized chime (Web Audio API)
    let soundEnabled = true;
    try {
      const cfg = JSON.parse((typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('of_alerts_config') || '{}');
      if (cfg.sound_enabled === false) soundEnabled = false;
    } catch {}

    if (soundEnabled) {
      playOrderChime(0.35);
    }

    showBrowserNotification(notif);

    // Auto-remove toast after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 6000);
  }, [showBrowserNotification]);

  const buildOrderNotification = useCallback((order) => {
    const orderNum = order.order_number || order.id || 'N/A';
    const amountVal = Number(order.total || order.amount || order.subtotal || 0);
    const amountFormatted = amountVal > 0 ? `৳${amountVal.toLocaleString()}` : '';
    const customer = order.customer_name || 'Guest Customer';

    return {
      id: `order-${order.id}`,
      type: 'ORDER_CREATED',
      title: '🛍 New Order Received',
      message: `Order #${orderNum} · ${amountFormatted ? `${amountFormatted} · ` : ''}${customer}`,
      actor_name: order.source || 'Website',
      is_read: false,
      created_at: order.created_at || new Date().toISOString(),
      data: {
        orderId: order.id,
        orderNumber: orderNum,
        customer: customer,
        amount: amountVal,
        source: order.source || 'Website',
        shippingZone: order.shipping_zone || null,
      }
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let data = await api.getNotifications(50);

      // Filter by target_user_id if present
      data = (data || []).filter(n => {
        const targetId = n.target_user_id || n.data?.targetUserId;
        return !targetId || !userId || targetId === userId;
      });

      const clearedAt = (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('notifs_cleared_at');
      const filteredData = clearedAt
        ? data.filter(n => new Date(n.created_at) > new Date(clearedAt))
        : data;

      setNotifications(filteredData);
      setUnreadCount(filteredData.filter(n => !n.is_read).length);

      if (!hasShownInitialUnreadToastsRef.current) {
        hasShownInitialUnreadToastsRef.current = true;
      }
    } catch (error) {
      console.warn('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Realtime Listener for New Orders & DB Notifications ───────────────────
  useEffect(() => {
    fetchNotifications();

    // 1. Listen to global window event from centralized OrderContext
    const handleAdminNewOrder = (event) => {
      const newOrder = event?.detail;
      if (!newOrder) return;

      const notif = buildOrderNotification(newOrder);

      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount(prev => prev + 1);
      addToast(notif);
    };

    window.addEventListener('admin:new_order', handleAdminNewOrder);

    // 2. Resilient channel for admin_notifications table
    const notifChannel = supabase
      .channel('admin_notifications_realtime_stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        const notif = payload.new;
        if (!notif) return;

        // Check target user filter
        if (notif.target_user_id && userId && notif.target_user_id !== userId) return;

        setNotifications(prev => {
          if (prev.some(n => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
        setUnreadCount(prev => prev + 1);
        addToast(notif);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_notifications' }, (payload) => {
        const updated = payload.new;
        if (!updated) return;

        setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        setUnreadCount(prev => {
          // Recalculate accurately
          return Math.max(0, updated.is_read ? prev - 1 : prev);
        });
      })
      .subscribe((status) => {
        console.log('[Realtime:Notifications]', status);
      });

    return () => {
      window.removeEventListener('admin:new_order', handleAdminNewOrder);
      supabase.removeChannel(notifChannel);
    };
  }, [addToast, buildOrderNotification, fetchNotifications, userId]);

  const markAsRead = async (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.markNotificationAsRead(notifId);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await api.markAllNotificationsAsRead(userId);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const clearAllNotifications = () => {
    const nowIso = new Date().toISOString();
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifs_cleared_at', nowIso);
    }
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      toasts,
      loading,
      notificationPermission,
      requestNotificationPermission,
      markAsRead,
      markAllAsRead,
      clearAllNotifications,
      addToast,
      refreshNotifications: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
