'use client';
// @ts-nocheck
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { fraudDetection } from '../utils/fraudDetection';
import { automationRules } from '../utils/automationRules';
import { fulfillmentVelocity } from '../utils/fulfillmentVelocity';
import { getToyBoxStockKey } from '../utils/productCatalog';

const OrderContext = createContext(null);
const ORDER_SNAPSHOT_SIZE = 500;
const ORDER_PAGE_SIZE = 50;
const DATA_REFRESH_DEBOUNCE_MS = 600;

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(ORDER_PAGE_SIZE);
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'All',
    source: 'All',
    productName: '',
    dateRange: { start: null, end: null }
  });
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [stats, setStats] = useState({
    total: 0, completed: 0, pending: 0, revenue: 0,
    addedTodayCount: 0, sourceDistribution: [], trendData: [], confirmationData: []
  });
  const [inventory, setInventory] = useState([]);
  const [toyBoxes, setToyBoxes] = useState([]);
  const [fraudFlags, setFraudFlags] = useState({});
  const [automationFlags, setAutomationFlags] = useState({});
  const [velocityMetrics, setVelocityMetrics] = useState(null);

  const { user, profile, userRoles, isAdmin } = useAuth();
  const userId = user?.id ?? null;

  // Ref tracking to avoid stale closures in realtime callbacks
  const pageRef = useRef(page);
  pageRef.current = page;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const fetchIdRef = useRef(0);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const lastSyncedTimestampRef = useRef(new Date().toISOString());

  const statsRefreshTimerRef = useRef(null);
  const inventoryRefreshTimerRef = useRef(null);
  const toyBoxRefreshTimerRef = useRef(null);
  const workflowAnalysisTimerRef = useRef(null);

  const [isInitialized, setIsInitialized] = useState(false);

  const fetchOrders = useCallback(async (overridePage) => {
    const currentPage = overridePage ?? 1;
    const id = ++fetchIdRef.current;
    if (ordersRef.current.length === 0) {
      setLoading(true);
    }
    try {
      const { data, count } = await api.getOrdersWithCount(currentPage, ORDER_SNAPSHOT_SIZE, {});
      if (id === fetchIdRef.current) { 
        setOrders(data || []);
        setTotalCount(count || 0);
        lastSyncedTimestampRef.current = new Date().toISOString();
        if (currentPage === 1 && typeof window !== 'undefined') {
          localStorage.setItem('of_recent_orders', JSON.stringify((data || []).slice(0, ORDER_SNAPSHOT_SIZE)));
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      setTotalCount(0);
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(prev => {
        const newStats = { ...prev, ...data };
        if (typeof window !== 'undefined') {
          localStorage.setItem('of_dashboard_stats', JSON.stringify(newStats));
        }
        return newStats;
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error?.message || error);
    }
  }, []);

  const fetchInventory = useCallback(async (invFilters = {}) => {
    try {
      const data = await api.getInventory(invFilters);
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    }
  }, []);

  const fetchToyBoxes = useCallback(async () => {
    try {
      const data = await api.getToyBoxInventory();
      setToyBoxes(data || []);
    } catch (error: any) {
      console.error('Error fetching Toy Box inventory:', error?.message || error);
      setToyBoxes([]);
    }
  }, []);

  const scheduleStatsRefresh = useCallback(() => {
    window.clearTimeout(statsRefreshTimerRef.current);
    statsRefreshTimerRef.current = window.setTimeout(() => fetchStats(), DATA_REFRESH_DEBOUNCE_MS);
  }, [fetchStats]);

  const scheduleInventoryRefresh = useCallback(() => {
    window.clearTimeout(inventoryRefreshTimerRef.current);
    inventoryRefreshTimerRef.current = window.setTimeout(() => fetchInventory(), DATA_REFRESH_DEBOUNCE_MS);
  }, [fetchInventory]);

  const scheduleToyBoxRefresh = useCallback(() => {
    window.clearTimeout(toyBoxRefreshTimerRef.current);
    toyBoxRefreshTimerRef.current = window.setTimeout(() => fetchToyBoxes(), DATA_REFRESH_DEBOUNCE_MS);
  }, [fetchToyBoxes]);

  // ── Reconnect & Outage Reconciliation ────────────────────────────────────
  const reconcileRecentOrders = useCallback(async () => {
    const sinceTimestamp = lastSyncedTimestampRef.current;
    if (!sinceTimestamp) return;

    try {
      const { data: newRows, error } = await supabase
        .from('orders')
        .select('*')
        .gt('created_at', sinceTimestamp)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (newRows && newRows.length > 0) {
        console.log(`[Realtime:Reconcile] Fetched ${newRows.length} missed orders since ${sinceTimestamp}`);
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => String(o.id)));
          const toAdd = newRows.filter(r => !existingIds.has(String(r.id)));
          if (toAdd.length === 0) return prev;
          return [...toAdd, ...prev].slice(0, ORDER_SNAPSHOT_SIZE);
        });
        setTotalCount(prev => prev + newRows.length);
        scheduleStatsRefresh();
      }
      lastSyncedTimestampRef.current = new Date().toISOString();
    } catch (err) {
      console.warn('[Realtime:Reconcile] Failed to reconcile orders:', err);
    }
  }, [scheduleStatsRefresh]);

  const initializeData = useCallback(async () => {
    try {
      await Promise.allSettled([
        fetchOrders(1),
        fetchStats(),
        fetchInventory(),
        fetchToyBoxes()
      ]);
    } finally {
      setIsInitialized(true);
      setLoading(false);
    }
  }, [fetchOrders, fetchStats, fetchInventory, fetchToyBoxes]);

  // ── Canonical Realtime Subscription ──────────────────────────────────────
  useEffect(() => {
    initializeData();

    const channel = supabase
      .channel('admin_orders_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new;
          if (!newOrder) return;

          console.log('[Realtime] NEW_ORDER received:', newOrder.order_number || newOrder.id);

          // 1. Idempotently update order list (newest first)
          setOrders((prev) => {
            const exists = prev.some(o => String(o.id) === String(newOrder.id) || (newOrder.order_number && String(o.order_number) === String(newOrder.order_number)));
            if (exists) return prev;
            return [newOrder, ...prev].slice(0, ORDER_SNAPSHOT_SIZE);
          });
          setTotalCount((prev) => prev + 1);

          // 2. Optimistically bump stats immediately
          setStats((prev) => ({
            ...prev,
            total: (prev.total || 0) + 1,
            addedTodayCount: (prev.addedTodayCount || 0) + 1,
            pending: (prev.pending || 0) + 1,
          }));

          // 3. Dispatch global custom event for any listening admin components (Toasts, Dashboard, Reports)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin:new_order', { detail: newOrder }));
          }

          // 4. Update last synced timestamp
          lastSyncedTimestampRef.current = newOrder.created_at || new Date().toISOString();

          // 5. Schedule debounced full stats re-verification
          scheduleStatsRefresh();
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new;
          if (!updated) return;

          setOrders((prev) => {
            const exists = prev.some(o => String(o.id) === String(updated.id));
            if (!exists) return [updated, ...prev].slice(0, ORDER_SNAPSHOT_SIZE);
            return prev.map(o => String(o.id) === String(updated.id) ? { ...o, ...updated } : o);
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin:order_updated', { detail: updated }));
          }

          scheduleStatsRefresh();
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old;
          if (!old) return;

          setOrders((prev) => prev.filter(o => String(o.id) !== String(old.id)));
          setTotalCount((prev) => Math.max(0, prev - 1));

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin:order_deleted', { detail: old }));
          }

          scheduleStatsRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        scheduleInventoryRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'toy_box_inventory' }, () => {
        scheduleToyBoxRefresh();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          console.log('[Realtime] Orders channel active and connected.');
          reconcileRecentOrders();
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
          console.warn('[Realtime] Channel disconnected or error:', status);
        }
      });

    // Handle tab focus, visibility change, and online reconnect events
    const handleReconcileTrigger = () => {
      if (document.visibilityState === 'visible') {
        reconcileRecentOrders();
      }
    };

    window.addEventListener('visibilitychange', handleReconcileTrigger);
    window.addEventListener('focus', handleReconcileTrigger);
    window.addEventListener('online', handleReconcileTrigger);

    return () => {
      window.clearTimeout(statsRefreshTimerRef.current);
      window.clearTimeout(inventoryRefreshTimerRef.current);
      window.clearTimeout(toyBoxRefreshTimerRef.current);
      window.clearTimeout(workflowAnalysisTimerRef.current);
      window.removeEventListener('visibilitychange', handleReconcileTrigger);
      window.removeEventListener('focus', handleReconcileTrigger);
      window.removeEventListener('online', handleReconcileTrigger);
      supabase.removeChannel(channel);
    };
  }, [initializeData, scheduleInventoryRefresh, scheduleStatsRefresh, scheduleToyBoxRefresh, reconcileRecentOrders]);

  // Fraud & Automation Detection Effect
  useEffect(() => {
    window.clearTimeout(workflowAnalysisTimerRef.current);

    if (orders.length === 0) {
      setFraudFlags({});
      setAutomationFlags({});
      setVelocityMetrics(null);
      return undefined;
    }

    workflowAnalysisTimerRef.current = window.setTimeout(() => {
      setFraudFlags(fraudDetection.scanOrders(orders));
      setAutomationFlags(automationRules.scanOrders(orders));

      const computeVelocity = async () => {
        try {
          const logs = await api.getRecentActivity(200);
          const metrics = fulfillmentVelocity.calculateMetrics(logs);
          setVelocityMetrics(metrics);
        } catch (error) {
          console.error('Velocity calculation failed:', error);
        }
      };

      computeVelocity();
    }, 350);

    return () => window.clearTimeout(workflowAnalysisTimerRef.current);
  }, [orders]);

  const updateFilters = useCallback((newFilters) => {
    if (typeof newFilters === 'function') {
      setFilters(prev => newFilters(prev));
    } else {
      setFilters(newFilters);
    }
    setPage(1);
  }, []);

  const updateOrderStatus = async (orderId, newStatus, noteText = '') => {
    const currentUserName = profile?.name || user?.user_metadata?.full_name || user?.email || 'Unknown User';
    const order = orders.find(o => o.id === orderId);
    const oldStatus = order?.status;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o));

    try {
      await api.updateOrderStatus(orderId, newStatus, noteText);
      try {
        if (typeof api.logActivity === 'function') {
          await api.logActivity({
            order_id: orderId,
            action_type: 'STATUS_CHANGE',
            old_status: oldStatus || 'Unknown',
            new_status: newStatus,
            changed_by_user_id: userId,
            changed_by_user_name: currentUserName,
            action_description: noteText ? `Status changed to ${newStatus}: ${noteText}` : `Status updated to ${newStatus}`
          });
        }
      } catch (logErr) {
        console.warn('Non-fatal activity log write failed:', logErr);
      }
      scheduleStatsRefresh();
      scheduleInventoryRefresh();
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchOrders(page);
      throw err;
    }
  };

  const addOrder = async (newOrderData) => {
    const currentUserName = profile?.name || user?.user_metadata?.full_name || user?.email || 'System';
    try {
      const created = await api.createOrder({
        ...newOrderData,
        created_by: userId
      });
      
      setOrders(prev => [created, ...prev.filter(o => o.id !== created.id)]);
      setTotalCount(prev => prev + 1);

      try {
        await api.addActivityLog({
          order_id: created.id,
          action_type: 'ORDER_CREATED',
          old_status: null,
          new_status: created.status || 'New',
          changed_by_user_id: userId,
          changed_by_user_name: currentUserName,
          action_description: `Order created for customer ${created.customer_name || 'N/A'}`
        });
      } catch (logErr) {
        console.warn('Non-fatal activity log write failed:', logErr);
      }

      scheduleStatsRefresh();
      return created;
    } catch (err) {
      console.error('Failed to add order:', err);
      throw err;
    }
  };

  const deleteOrder = async (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setTotalCount(prev => Math.max(0, prev - 1));

    try {
      await api.deleteOrder(orderId);
      scheduleStatsRefresh();
    } catch (err) {
      console.error('Failed to delete order:', err);
      fetchOrders(page);
      throw err;
    }
  };

  const fetchOrderLogs = useCallback(async (orderId) => {
    try {
      return await api.getOrderLogs(orderId);
    } catch (err) {
      console.error('Failed to fetch order logs:', err);
      return [];
    }
  }, []);

  const autoDistributeOrders = useCallback(async () => {
    try {
      const unassignedOrders = orders.filter(o => !o.assigned_to && (o.status === 'New' || o.status === 'Pending Call'));
      if (unassignedOrders.length === 0) return { distributedCount: 0 };
      
      const { data: teamMembers } = await supabase.from('users').select('id, name').eq('status', 'active');
      if (!teamMembers || teamMembers.length === 0) return { distributedCount: 0 };

      let distributedCount = 0;
      for (let i = 0; i < unassignedOrders.length; i++) {
        const targetMember = teamMembers[i % teamMembers.length];
        await supabase.from('orders').update({ assigned_to: targetMember.id }).eq('id', unassignedOrders[i].id);
        distributedCount++;
      }
      fetchOrders(page);
      return { distributedCount };
    } catch (err) {
      console.error('Auto distribute error:', err);
      throw err;
    }
  }, [orders, page, fetchOrders]);

  const addInventoryItem = useCallback(async (itemData) => {
    try {
      const created = await api.createInventoryItem(itemData);
      setInventory(prev => [created, ...prev.filter(i => i.id !== created.id)]);
      scheduleInventoryRefresh();
      return created;
    } catch (err) {
      console.error('Failed to add inventory item:', err);
      throw err;
    }
  }, [scheduleInventoryRefresh]);

  const updateInventoryItem = useCallback(async (id, updates) => {
    try {
      const updated = await api.updateInventoryItem(id, updates);
      setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
      scheduleInventoryRefresh();
      return updated;
    } catch (err) {
      console.error('Failed to update inventory item:', err);
      throw err;
    }
  }, [scheduleInventoryRefresh]);

  const deleteInventoryItem = useCallback(async (id) => {
    try {
      await api.deleteInventoryItem(id);
      setInventory(prev => prev.filter(i => i.id !== id));
      scheduleInventoryRefresh();
    } catch (err) {
      console.error('Failed to delete inventory item:', err);
      throw err;
    }
  }, [scheduleInventoryRefresh]);

  const adjustStock = useCallback(async (id, quantityChange, options = {}) => {
    try {
      const updated = await api.adjustStock(id, quantityChange, options);
      setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
      scheduleInventoryRefresh();
      return updated;
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      throw err;
    }
  }, [scheduleInventoryRefresh]);

  return (
    <OrderContext.Provider value={{
      orders,
      totalCount,
      page,
      setPage,
      pageSize,
      filters,
      setFilters: updateFilters,
      loading,
      realtimeStatus,
      stats,
      inventory,
      toyBoxes,
      fraudFlags,
      automationFlags,
      velocityMetrics,
      fetchOrders,
      fetchStats,
      fetchInventory,
      fetchToyBoxes,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      adjustStock,
      updateOrderStatus,
      addOrder,
      deleteOrder,
      fetchOrderLogs,
      autoDistributeOrders,
      reconcileRecentOrders,
      refetch: initializeData
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
