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
const DATA_REFRESH_DEBOUNCE_MS = 800;

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

  // Track current values without causing re-renders  
  const pageRef = useRef(page);
  pageRef.current = page;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const fetchIdRef = useRef(0);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
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
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  useEffect(() => {
    initializeData();

    const orderContextChannel = supabase
      .channel('order_context_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders((prev) => [payload.new, ...prev.filter(order => order.id !== payload.new.id)].slice(0, ORDER_SNAPSHOT_SIZE));
          setTotalCount((prev) => prev + 1);
        } else if (payload.eventType === 'UPDATE') {
          setOrders((prev) => {
            const exists = prev.some(order => order.id === payload.new.id);
            const next = exists
              ? prev.map(order => order.id === payload.new.id ? payload.new : order)
              : [payload.new, ...prev];
            return next.slice(0, ORDER_SNAPSHOT_SIZE);
          });
        } else if (payload.eventType === 'DELETE') {
          setOrders((prev) => prev.filter(order => order.id !== payload.old.id));
          setTotalCount((prev) => Math.max(0, prev - 1));
        }
        scheduleStatsRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        scheduleInventoryRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'toy_box_inventory' }, () => {
        scheduleToyBoxRefresh();
      })
      .subscribe();

    return () => {
      window.clearTimeout(statsRefreshTimerRef.current);
      window.clearTimeout(inventoryRefreshTimerRef.current);
      window.clearTimeout(toyBoxRefreshTimerRef.current);
      window.clearTimeout(workflowAnalysisTimerRef.current);
      supabase.removeChannel(orderContextChannel);
    };
  }, [initializeData, scheduleInventoryRefresh, scheduleStatsRefresh, scheduleToyBoxRefresh]);

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
      updateOrderStatus,
      addOrder,
      deleteOrder,
      fetchOrderLogs,
      autoDistributeOrders,
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
