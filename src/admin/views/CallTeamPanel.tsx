'use client';
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import './CallTeamPanel.css';
import { useOrders } from '../context/OrderContext';
import { OrderEditModal } from '../components/OrderEditModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { DateRangePicker } from '../components/DateRangePicker';
import { 
  Search, PhoneCall, CheckCircle, XCircle, Clock, PhoneMissed, 
  PhoneOff, Edit2, Loader2, ShieldCheck, ShieldAlert, Shield, 
  UserCheck, RotateCcw, Truck, Zap, Calendar, TrendingUp, Settings2, PauseCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCourierRatio } from '../context/CourierRatioContext';
import api from '../lib/api';
import { deserializeDateRange, usePersistentState } from '../utils/persistentState';
import { getProductOptions } from '../utils/productCatalog';
import CurrencyIcon from '../components/CurrencyIcon';
import { Modal } from '../components/Modal';
import { useRouteOrderReadState } from '../hooks/useRouteOrderReadState';
import { ResponseTimer } from '../components/ResponseTimer';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const STATUS_OPTIONS = ['ACTIVE', 'NEW', 'PENDING', 'FINAL'];
const ACTIVE_CALL_STATUSES = ['New', 'Pending Call', 'Final Call Pending'];
const CALL_TASKS_PER_PAGE = 10;
const CALL_STAGE_LABELS = {
  ACTIVE: 'Active',
  NEW: 'New',
  PENDING: 'Pending',
  FINAL: 'Final'
};

const getVisiblePageNumbers = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const QUICK_CALL_STATUSES = [
  { id: 'busy', label: 'Busy', logLabel: 'Busy', icon: PhoneOff, tone: 'text-orange-700 bg-orange-100 hover:bg-orange-200' },
  { id: 'not-pick', label: 'Not Pick', logLabel: 'Not Pick', icon: PhoneMissed, tone: 'text-amber-700 bg-amber-100 hover:bg-amber-200' },
  { id: 'hold', label: 'Hold', logLabel: 'On Hold', icon: PauseCircle, tone: 'text-blue-700 bg-blue-100 hover:bg-blue-200' }
];

const ACTION_NOTE_CONFIG = {
  confirm: {
    title: 'Confirm Order',
    actionLabel: 'Confirmed',
    placeholder: 'Example: Customer confirmed. Requested delivery after 7 PM.'
  },
  cancel: {
    title: 'Cancel Order',
    actionLabel: 'Cancelled',
    placeholder: 'Example: Customer cancelled. Ordered by mistake.'
  },
  fake: {
    title: 'Mark Fake Order',
    actionLabel: 'Fake Order',
    placeholder: 'Example: Fake customer details or abusive repeat order. IP will be blocked permanently.'
  },
  busy: {
    title: 'Mark Busy',
    actionLabel: 'Busy',
    placeholder: 'Example: Customer was busy. Asked to call again in 20 minutes.'
  },
  'not-pick': {
    title: 'Mark Not Pick',
    actionLabel: 'Not Pick',
    placeholder: 'Example: No answer. Try again after 30 minutes.'
  },
  hold: {
    title: 'Put On Hold',
    actionLabel: 'On Hold',
    placeholder: 'Example: Customer asked for callback tomorrow morning.'
  }
};

const hasCallAttempt = (order) => (
  Number(order?.call_attempts || 0) > 0 ||
  Boolean(order?.first_call_time || order?.last_call_at || order?.last_call_status)
);

const getCallQueueStage = (order) => {
  if (!order || !ACTIVE_CALL_STATUSES.includes(order.status)) return null;
  if (order.status === 'Final Call Pending') return 'FINAL';
  if (order.status === 'Pending Call') return 'PENDING';
  if (order.status === 'New') return hasCallAttempt(order) ? 'PENDING' : 'NEW';
  return null;
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getCallStatusToneClass = (value = '') => {
  const normalized = String(value).toLowerCase();
  if (normalized.includes('busy')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (normalized.includes('not pick') || normalized.includes('no answer') || normalized.includes('miss')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (normalized.includes('hold') || normalized.includes('call back')) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const StatusBadge = ({ status }) => {
  let dotColor = 'bg-gray-500';
  let textColor = 'text-gray-700';
  let bgColor = 'bg-gray-50';
  let borderColor = 'border-gray-200';
  
  if (status.includes('Pending')) { dotColor = 'bg-amber-500'; textColor = 'text-amber-700'; bgColor = 'bg-amber-50'; borderColor = 'border-amber-200'; }
  if (status === 'Confirmed') { dotColor = 'bg-emerald-500'; textColor = 'text-emerald-700'; bgColor = 'bg-emerald-50'; borderColor = 'border-emerald-200'; }
  if (status === 'Cancelled') { dotColor = 'bg-rose-500'; textColor = 'text-rose-700'; bgColor = 'bg-rose-50'; borderColor = 'border-rose-200'; }
  if (status === 'Fake Order') { dotColor = 'bg-red-500'; textColor = 'text-red-700'; bgColor = 'bg-red-50'; borderColor = 'border-red-200'; }
  if (status.includes('Final Call')) { dotColor = 'bg-orange-500'; textColor = 'text-orange-700'; bgColor = 'bg-orange-50'; borderColor = 'border-orange-200'; }
  if (status === 'In Transit') { dotColor = 'bg-sky-500'; textColor = 'text-sky-700'; bgColor = 'bg-sky-50'; borderColor = 'border-sky-200'; }

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", bgColor, textColor, borderColor)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      {status}
    </div>
  );
};

export const CallTeamPanel = () => {
  const { orders, stats, inventory, updateOrderStatus, fetchOrders } = useOrders();
  const { user, profile, userRoles, updatePresenceContext } = useAuth();
  const productOptions = getProductOptions(inventory);

  useEffect(() => {
    updatePresenceContext('Managing Calls');
  }, [updatePresenceContext]);

  const [searchTerm, _setSearchTerm] = usePersistentState('panel:call-team:search', '');
  const [statusFilter, setStatusFilter] = usePersistentState('panel:call-team:status', 'ACTIVE');
  const [productFilter, setProductFilter] = usePersistentState('panel:call-team:product', '');
  const [dateRange, _setDateRange] = usePersistentState(
    'panel:call-team:dateRange',
    { start: null, end: null },
    { deserialize: deserializeDateRange }
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loggingAttemptId, setLoggingAttemptId] = useState(null);
  const [pendingNoteAction, setPendingNoteAction] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { checkPhone, getRatio } = useCourierRatio();

  useEffect(() => {
    if (!selectedOrder?.id) return;
    const latestSelectedOrder = orders.find((order) => order.id === selectedOrder.id);
    if (latestSelectedOrder && latestSelectedOrder !== selectedOrder) {
      setSelectedOrder(latestSelectedOrder);
    }
  }, [orders, selectedOrder]);

  useEffect(() => {
    if (!STATUS_OPTIONS.includes(statusFilter)) {
      setStatusFilter('ACTIVE');
    }
  }, [statusFilter, setStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, productFilter, dateRange.start, dateRange.end]);

  const handleOpenEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleRowClick = (order) => {
    markOrderRead(order);
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleLogAttempt = async (orderId, attemptStatus, noteText = '') => {
    setLoggingAttemptId(orderId);
    try {
      await api.logCallAttempt(orderId, attemptStatus, user.id, profile?.name || 'Call Team', userRoles, noteText);
      if (fetchOrders) await fetchOrders();
    } catch (err) {
      console.error('Failed to log attempt:', err);
      alert(err.message || 'Failed to log call attempt.');
    } finally {
      setLoggingAttemptId(null);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return null;
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const matchesBaseFilters = (o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (o.id || '').toLowerCase().includes(term) ||
      (o.customer_name || '').toLowerCase().includes(term) ||
      (o.phone || '').includes(term) ||
      (o.product_name || '').toLowerCase().includes(term);

    const matchesProduct = !productFilter || o.product_name === productFilter;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const orderDate = new Date(o.created_at);
      matchesDate = orderDate >= new Date(dateRange.start) && orderDate <= new Date(dateRange.end);
    }

    return matchesSearch && matchesProduct && matchesDate;
  };

  const tabCounts = useMemo(() => {
    const counts = { ACTIVE: 0, NEW: 0, PENDING: 0, FINAL: 0 };
    orders.forEach((order) => {
      if (!matchesBaseFilters(order)) return;
      const stage = getCallQueueStage(order);
      if (!stage) return;
      counts.ACTIVE += 1;
      counts[stage] += 1;
    });
    return counts;
  }, [orders, searchTerm, productFilter, dateRange]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!matchesBaseFilters(o)) return false;
      const stage = getCallQueueStage(o);
      if (!stage) return false;
      if (statusFilter === 'ACTIVE') return true;
      return stage === statusFilter;
    });
  }, [orders, searchTerm, statusFilter, productFilter, dateRange]);
  
  const { isOrderUnread, markOrderRead, unreadCount } = useRouteOrderReadState('call-team-panel', filteredOrders);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / CALL_TASKS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * CALL_TASKS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + CALL_TASKS_PER_PAGE);
  }, [filteredOrders, currentPage]);
  const visiblePages = useMemo(() => getVisiblePageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const unchecked = [...new Set(
      paginatedOrders
        .map(o => o.phone)
        .filter((phone) => {
          const currentRatio = getRatio(phone);
          return phone && !currentRatio?.fetched && !currentRatio?.loading;
        })
    )];
    unchecked.forEach(p => checkPhone(p));
  }, [paginatedOrders, checkPhone, getRatio]);

  const pendingCount = orders.filter(o => ACTIVE_CALL_STATUSES.includes(o.status)).length;
  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const confirmedToday = typeof stats?.confirmedTodayCount === 'number'
    ? stats.confirmedTodayCount
    : orders.filter(o => o.status === 'Confirmed' && new Date(o.updated_at || o.created_at) >= todayStart).length;

  const realConfirmRate = useMemo(() => {
    const calledToday = orders.filter(o => {
      const updatedAt = new Date(o.updated_at || o.created_at);
      const wasCalled = Number(o.call_attempts || 0) > 0 || Boolean(o.first_call_time || o.last_call_at);
      return updatedAt >= todayStart && wasCalled;
    });
    if (calledToday.length === 0) return null;
    const confirmed = calledToday.filter(o => o.status === 'Confirmed').length;
    return { rate: +((confirmed / calledToday.length) * 100).toFixed(1), total: calledToday.length, confirmed };
  }, [orders]);

  const realAvgResponseMin = useMemo(() => {
    const respondedToday = orders.filter(o => o.first_call_time && new Date(o.first_call_time) >= todayStart);
    if (respondedToday.length === 0) return null;
    const totalMins = respondedToday.reduce((sum, o) => {
      return sum + Math.max(0, (new Date(o.first_call_time) - new Date(o.created_at)) / 60000);
    }, 0);
    return +(totalMins / respondedToday.length).toFixed(1);
  }, [orders]);

  const avgRespLabel = realAvgResponseMin === null ? '—'
    : realAvgResponseMin >= 60 ? `${(realAvgResponseMin / 60).toFixed(1)}h`
    : `${realAvgResponseMin}m`;
  const avgRespStatus = realAvgResponseMin === null ? 'neutral'
    : realAvgResponseMin <= 10 ? 'good'
    : realAvgResponseMin <= 15 ? 'warning'
    : 'critical';
  const avgRespDesc = realAvgResponseMin === null ? 'No responses logged today yet.'
    : realAvgResponseMin <= 10 ? 'Excellent — well within 10m target.'
    : realAvgResponseMin <= 15 ? 'Good — within 15m agency benchmark.'
    : 'Slow — exceeding 15m response target.';
  const avgRespProgress = realAvgResponseMin === null ? 0 : Math.min(100, (realAvgResponseMin / 30) * 100);

  const closeActionNoteModal = (force = false) => {
    if (isSubmittingAction && !force) return;
    setPendingNoteAction(null);
    setActionNote('');
  };

  const getLatestNotePreview = (notesValue) => {
    const notes = String(notesValue || '').trim();
    if (!notes) return '';
    const [latestBlock] = notes.split(/\n\s*\n/);
    const lines = latestBlock
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) return lines[0] || '';
    return lines.slice(1).join(' ');
  };

  const openActionNoteModal = (e, order, action) => {
    e.stopPropagation();
    const actionMeta = ACTION_NOTE_CONFIG[action];
    if (!actionMeta) return;

    setPendingNoteAction({
      orderId: order.id,
      customerName: order.customer_name || 'Unknown Customer',
      action,
      ...actionMeta
    });
    setActionNote('');
  };

  const submitActionWithNote = async () => {
    if (!pendingNoteAction || !actionNote.trim()) return;

    setIsSubmittingAction(true);
    try {
      switch (pendingNoteAction.action) {
        case 'confirm':
          await updateOrderStatus(pendingNoteAction.orderId, 'Confirmed', actionNote);
          break;
        case 'cancel':
          await updateOrderStatus(pendingNoteAction.orderId, 'Cancelled', actionNote);
          break;
        case 'fake':
          await updateOrderStatus(pendingNoteAction.orderId, 'Fake Order', actionNote);
          break;
        case 'busy':
          await handleLogAttempt(pendingNoteAction.orderId, 'Busy', actionNote);
          break;
        case 'not-pick':
          await handleLogAttempt(pendingNoteAction.orderId, 'Not Pick', actionNote);
          break;
        case 'hold':
          await handleLogAttempt(pendingNoteAction.orderId, 'On Hold', actionNote);
          break;
        default:
          break;
      }

      if (fetchOrders) await fetchOrders();
      closeActionNoteModal(true);
    } catch (error) {
      console.error('Failed to save call action note:', error);
      alert(error.message || 'Failed to save note and update status.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-slide-up w-full max-w-full overflow-x-hidden">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Call Operations</h1>
          <p className="text-muted-foreground text-sm">Real-time status of your high-performance call center fleet.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-xl shadow-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
              3
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider">IN QUEUE</span>
              <span className="text-sm font-bold text-foreground">{pendingCount} <span className="text-xs text-muted-foreground font-normal">UNITS</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-xl shadow-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle size={18} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider">CONFIRMED TODAY</span>
              <span className="text-sm font-bold text-foreground">{confirmedToday} <span className="text-xs text-muted-foreground font-normal">ORDERS</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold tracking-wider text-muted-foreground">REAL-TIME PERFORMANCE</span>
              {realConfirmRate && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold",
                  realConfirmRate.rate >= 60 ? "bg-emerald-50 text-emerald-600" :
                  realConfirmRate.rate >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                )}>
                  <TrendingUp size={12} strokeWidth={3} />
                  {realConfirmRate.confirmed}/{realConfirmRate.total} called today
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {realConfirmRate === null ? '—' : realConfirmRate.rate}
              <span className="text-sm font-normal text-muted-foreground ml-2">% Confirmation Rate</span>
            </div>
            <div className="flex items-end gap-1 h-12 pt-2 border-t border-border">
              {orders
                .filter(o => Number(o.call_attempts || 0) > 0 || o.first_call_time)
                .slice(-10)
                .map((o, i, arr) => {
                  const isConfirmed = o.status === 'Confirmed';
                  const isCancelled = o.status === 'Cancelled' || o.status === 'Fake Order';
                  const barH = Math.min(100, 25 + (Number(o.call_attempts || 1)) * 18);
                  return (
                    <div
                      key={o.id}
                      className="flex-1 rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${barH}%`,
                        background: isConfirmed ? '#10b981' : isCancelled ? '#ef4444' : 'var(--text-muted-foreground)',
                        opacity: isConfirmed || isCancelled ? 1 : 0.25,
                      }}
                      title={`${o.customer_name} — ${o.status} (${o.call_attempts || 0} calls)`}
                    />
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold tracking-wider text-muted-foreground">AVERAGE RESPONSE TIME</span>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold",
                avgRespStatus === 'good' ? "bg-emerald-50 text-emerald-600" :
                avgRespStatus === 'warning' ? "bg-amber-50 text-amber-600" :
                avgRespStatus === 'critical' ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
              )}>
                {avgRespStatus === 'good' ? 'On Target' :
                 avgRespStatus === 'warning' ? 'Near Limit' :
                 avgRespStatus === 'critical' ? 'Overdue' : 'No Data'}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              {avgRespLabel}
              {realAvgResponseMin !== null && (
                <span className="text-sm font-normal text-muted-foreground ml-2 opacity-70">avg today</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{avgRespDesc}</p>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${avgRespProgress}%`,
                  background: avgRespStatus === 'good' ? '#10b981' :
                              avgRespStatus === 'warning' ? '#f59e0b' :
                              avgRespStatus === 'critical' ? '#ef4444' : '#94a3b8',
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
        <div className="flex overflow-x-auto space-x-2 pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
          {STATUS_OPTIONS.map(tab => (
            <button 
              key={tab} 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                statusFilter === tab 
                  ? "bg-foreground text-background" 
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
              onClick={() => setStatusFilter(tab)}
            >
              <span>{tab}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                statusFilter === tab ? "bg-background/20 text-background" : "bg-background text-foreground"
              )}>
                {tabCounts[tab] || 0}
              </span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm text-sm font-medium">
            <span className="text-xs text-muted-foreground tracking-wider">CATEGORY:</span>
            <select 
              className="bg-transparent border-none text-foreground outline-none cursor-pointer pr-2"
              value={productFilter} 
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="">ALL PRODUCTS</option>
              {productOptions.map((product, idx) => (
                <option key={`${product}-${idx}`} value={product}>{product.toUpperCase()}</option>
              ))}
            </select>
          </div>
          {unreadCount > 0 && (
            <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm whitespace-nowrap">
              {unreadCount} unread
            </span>
          )}
          <Button variant="outline" size="icon" className="rounded-xl border-border shrink-0">
            <Settings2 size={16} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* 4. Main List */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Order #</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Product Details</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">SLA Timer</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedOrders.map(order => {
              const rt = getRatio(order.phone) || {};
              const successRatio = rt.ratio !== undefined ? rt.ratio : (order.phone ? '...' : '0');
              const showTrust = rt.fetched && rt.total > 0;
              const isActionable = order.status === 'New' || order.status === 'Pending Call' || order.status === 'Final Call Pending';
              const latestNotePreview = getLatestNotePreview(order.notes);
              const orderCreatedLabel = order.created_at
                ? new Date(order.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
                : 'N/A';

              return (
                <tr key={order.id} 
                    className={cn(
                      "hover:bg-secondary/20 transition-colors cursor-pointer group",
                      isOrderUnread(order) ? "bg-blue-50/10" : ""
                    )}
                    onClick={() => handleRowClick(order)}>
                  
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                        <span className="font-mono font-medium text-foreground">#{order.id.replace('ORD-', '')}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{orderCreatedLabel}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground font-bold shrink-0">
                        {getInitials(order.customer_name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{order.customer_name}</span>
                        <span className="text-xs text-muted-foreground">{order.phone || 'No phone'}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                            successRatio > 70 ? "bg-emerald-100 text-emerald-700" :
                            successRatio > 40 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          )}>
                            <Zap size={10} /> {showTrust ? `${successRatio}% SUCCESS` : 'NEW LEAD'}
                          </span>
                          {order.last_call_at && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <PhoneCall size={10} /> {getTimeAgo(order.last_call_at)}
                            </span>
                          )}
                        </div>
                        {latestNotePreview && (
                          <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={latestNotePreview}>
                            {latestNotePreview}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground truncate max-w-[150px]">{order.product_name || 'Unknown Product'}</span>
                      <span className="text-xs text-muted-foreground">
                        {order.size ? `Size: ${order.size}` : `Qty: ${order.quantity || 1}`} • {order.source || 'Direct'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <CurrencyIcon size={13} className="text-muted-foreground" />
                        {Number(order.amount || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{order.shipping_zone || 'Delivery pending'}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5 items-start">
                      <StatusBadge status={order.status} />
                      {order.last_call_status && !['Confirmed', 'Cancelled'].includes(order.status) && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                          getCallStatusToneClass(order.last_call_status)
                        )}>
                          {order.last_call_status}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-sm font-bold text-primary">
                    <ResponseTimer order={order} mode="full" />
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isActionable && (
                      <div className="flex flex-col gap-2 items-end">
                        <Button 
                          size="sm" 
                          className="rounded-xl px-3 py-2 text-xs font-bold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-32 flex justify-center gap-1.5"
                          onClick={(e) => openActionNoteModal(e, order, 'confirm')}
                        >
                          <CheckCircle size={14} /> Confirm
                        </Button>
                        <div className="grid grid-cols-2 gap-1.5 w-32">
                          {QUICK_CALL_STATUSES.map((item) => {
                            const Icon = item.icon;
                            const isLoading = loggingAttemptId === order.id;
                            return (
                              <button
                                key={item.id}
                                className={cn(
                                  "flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors border shadow-sm",
                                  item.tone,
                                  isLoading ? "opacity-70 cursor-wait" : ""
                                )}
                                onClick={(e) => openActionNoteModal(e, order, item.id)}
                                disabled={isLoading}
                              >
                                {isLoading ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                          <button
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-red-700 bg-red-100 border-red-200 hover:bg-red-200 shadow-sm"
                            onClick={(e) => openActionNoteModal(e, order, 'cancel')}
                          >
                            <XCircle size={10} /> Cancel
                          </button>
                          <button
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-rose-700 bg-rose-100 border-rose-200 hover:bg-rose-200 shadow-sm col-span-2"
                            onClick={(e) => openActionNoteModal(e, order, 'fake')}
                          >
                            <ShieldAlert size={10} /> Fake Order
                          </button>
                        </div>
                      </div>
                    )}
                    {order.status === 'Confirmed' && (
                      <Button variant="outline" size="sm" className="rounded-xl shadow-sm text-xs font-bold" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(order); }}>
                        <Edit2 size={14} className="mr-1.5" /> Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground bg-secondary/20">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {paginatedOrders.map(order => {
          const rt = getRatio(order.phone) || {};
          const successRatio = rt.ratio !== undefined ? rt.ratio : (order.phone ? '...' : '0');
          const showTrust = rt.fetched && rt.total > 0;
          const isActionable = order.status === 'New' || order.status === 'Pending Call' || order.status === 'Final Call Pending';
          
          return (
            <div key={order.id} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm" onClick={() => handleRowClick(order)}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground font-bold shrink-0">
                    {getInitials(order.customer_name)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{order.customer_name}</div>
                    <div className="text-sm font-bold flex items-center gap-1 text-foreground">
                      <CurrencyIcon size={12} className="text-muted-foreground" />
                      {Number(order.amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={order.status} />
                  {order.last_call_status && !['Confirmed', 'Cancelled'].includes(order.status) && (
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold border",
                      getCallStatusToneClass(order.last_call_status)
                    )}>
                      {order.last_call_status}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-3 space-y-2 text-sm">
                <div className="font-medium text-foreground">{order.product_name || 'Unknown Product'}</div>
                <div className="text-xs text-muted-foreground">
                  #{order.id.replace('ORD-', '')} • {order.size ? `Size: ${order.size}` : `Qty: ${order.quantity || 1}`} • {order.source || 'Direct'}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-primary">
                    <ResponseTimer order={order} mode="compact" />
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold",
                    successRatio > 70 ? "bg-emerald-100 text-emerald-700" :
                    successRatio > 40 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  )}>
                    <Zap size={10} /> {showTrust ? `${successRatio}%` : 'NEW'}
                  </span>
                </div>
              </div>

              {isActionable && (
                <div className="pt-2 border-t border-border flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                  <Button 
                    className="w-full rounded-xl py-2.5 text-xs font-bold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm flex justify-center gap-1.5"
                    onClick={(e) => openActionNoteModal(e, order, 'confirm')}
                  >
                    <CheckCircle size={14} /> Confirm Order
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_CALL_STATUSES.map((item) => {
                      const Icon = item.icon;
                      const isLoading = loggingAttemptId === order.id;
                      return (
                        <button
                          key={item.id}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-colors border shadow-sm",
                            item.tone,
                            isLoading ? "opacity-70 cursor-wait" : ""
                          )}
                          onClick={(e) => openActionNoteModal(e, order, item.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-100 border border-red-200 hover:bg-red-200 shadow-sm"
                      onClick={(e) => openActionNoteModal(e, order, 'cancel')}
                    >
                      <XCircle size={12} /> Cancel
                    </button>
                    <button
                      className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 hover:bg-rose-200 shadow-sm"
                      onClick={(e) => openActionNoteModal(e, order, 'fake')}
                    >
                      <ShieldAlert size={12} /> Fake Order
                    </button>
                  </div>
                </div>
              )}
              {order.status === 'Confirmed' && (
                <div className="pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" className="w-full rounded-xl text-xs font-bold shadow-sm" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(order); }}>
                    <Edit2 size={14} className="mr-1.5" /> Edit Order
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            No orders found matching the filter criteria.
          </div>
        )}
      </div>

      {/* 5. Pagination */}
      {filteredOrders.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-t border-border mt-4">
          <div className="text-sm text-muted-foreground font-medium">
            Showing {(currentPage - 1) * CALL_TASKS_PER_PAGE + 1}-
            {Math.min(currentPage * CALL_TASKS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} tasks
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl w-8 h-8 p-0 disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              &lt;
            </Button>
            {visiblePages.map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "default" : "outline"}
                size="sm"
                className={cn("rounded-xl w-8 h-8 p-0 font-bold", currentPage === pageNumber ? "" : "text-muted-foreground")}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl w-8 h-8 p-0 disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              &gt;
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <OrderEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        order={selectedOrder} 
      />
      <OrderDetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        order={selectedOrder}
        onEdit={handleOpenEditModal}
      />

      <Modal
        isOpen={Boolean(pendingNoteAction)}
        onClose={() => closeActionNoteModal()}
        title={pendingNoteAction ? pendingNoteAction.title : 'Add Note'}
        subtitle={pendingNoteAction ? `${pendingNoteAction.customerName} • #${pendingNoteAction.orderId.replace('ORD-', '')}` : ''}
      >
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground font-medium">
            Save this note with the order before updating the call status.
          </p>
          <textarea
            className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/50"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder={pendingNoteAction?.placeholder || 'Write an important customer note'}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => closeActionNoteModal()}
              disabled={isSubmittingAction}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl font-bold bg-primary text-primary-foreground"
              onClick={submitActionWithNote}
              disabled={isSubmittingAction || !actionNote.trim()}
            >
              {isSubmittingAction ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save & ${pendingNoteAction?.title || 'Update'}`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
