'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import './SteadfastPanel.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Truck, RotateCcw, ExternalLink, Calendar, User, Phone, MapPin, RefreshCw, Zap, Package } from 'lucide-react';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { PackingSlip } from '../components/PackingSlip';
import { usePersistentState } from '../utils/persistentState';
import { useRouteOrderReadState } from '../hooks/useRouteOrderReadState';
import { cn } from '../lib/utils';

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export const SteadfastPanel = () => {
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = usePersistentState('panel:steadfast:search', '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({});
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dateFilter, setDateFilter] = usePersistentState('panel:steadfast:dateFilter', 'today');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === steadfastOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(steadfastOrders.map(o => o.id)));
    }
  };

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handlePrintSelection = () => {
    window.print();
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const handleRowClick = (order) => {
    markOrderRead(order);
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const isToday = (date) => {
    const d = new Date(date);
    const now = new Date();
    return d.getDate() === now.getDate() && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  };

  const isYesterday = (date) => {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return d.getDate() === yesterday.getDate() && 
           d.getMonth() === yesterday.getMonth() && 
           d.getFullYear() === yesterday.getFullYear();
  };

  const steadfastOrders = orders.filter(o => {
    const hasDispatch = o.tracking_id || o.dispatched_at;
    if (!hasDispatch) return false;

    const dispatchDate = o.dispatched_at || o.updated_at || o.created_at;
    if (dateFilter === 'today' && !isToday(dispatchDate)) return false;
    if (dateFilter === 'yesterday' && !isYesterday(dispatchDate)) return false;

    const matchesSearch = 
      (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.phone || '').includes(searchTerm) ||
      (o.tracking_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.courier_assigned_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  }).sort((a, b) => new Date(b.dispatched_at || b.updated_at || b.created_at) - new Date(a.dispatched_at || a.updated_at || a.created_at));
  
  const { isOrderUnread, markOrderRead, unreadCount } = useRouteOrderReadState('steadfast-panel', steadfastOrders);

  const handleSyncStatus = async (orderId, trackingCode) => {
    if (!orderId && !trackingCode) return;
    setSyncStatus(prev => ({ ...prev, [orderId]: 'syncing' }));
    try {
      await api.getSteadfastStatus(orderId, trackingCode);
      setSyncStatus(prev => ({ ...prev, [orderId]: 'done' }));
      setTimeout(() => setSyncStatus(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      }), 2000);
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncStatus(prev => ({ ...prev, [orderId]: 'error' }));
    }
  };

  const triggerManualSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const ordersToSync = steadfastOrders.filter(o => o.tracking_id);
    
    for (const order of ordersToSync) {
      try {
        setSyncStatus(prev => ({ ...prev, [order.id]: 'syncing' }));
        await api.getSteadfastStatus(order.id, order.tracking_id);
        setSyncStatus(prev => ({ ...prev, [order.id]: 'done' }));
        setTimeout(() => setSyncStatus(prev => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        }), 1500);
      } catch (err) {
        console.error(err);
        setSyncStatus(prev => ({ ...prev, [order.id]: 'error' }));
      }
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    if (steadfastOrders.length === 0) return;

    const ordersToSync = steadfastOrders.filter(o => {
      if (!o.tracking_id) return false;
      const s = String(o.courier_status || '').toLowerCase();
      const isDelivered = s.includes('delivered') || s.includes('success');
      const isFailed = s.includes('return') || s.includes('cancel') || s.includes('failed');
      return !isDelivered && !isFailed;
    });

    if (ordersToSync.length === 0) return;

    let active = true;
    const syncAll = async () => {
      for (const order of ordersToSync) {
        if (!active) break;
        try {
          setSyncStatus(prev => ({ ...prev, [order.id]: 'syncing' }));
          await api.getSteadfastStatus(order.id, order.tracking_id);
          setSyncStatus(prev => ({ ...prev, [order.id]: 'done' }));
          
          setTimeout(() => {
            if (active) {
              setSyncStatus(prev => {
                const next = { ...prev };
                delete next[order.id];
                return next;
              });
            }
          }, 1500);
        } catch (err) {
          console.error(`Auto-sync failed for order #${order.id}:`, err);
          if (active) setSyncStatus(prev => ({ ...prev, [order.id]: 'error' }));
        }
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    };

    const timeoutId = setTimeout(syncAll, 1500);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [orders.length]);

  const getTimeSinceDispatch = (dispatchedAt) => {
    if (!dispatchedAt) return null;
    const diff = Math.floor((currentTime - new Date(dispatchedAt)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getStatusVariant = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('delivered')) return 'success';
    if (s.includes('return') || s.includes('cancel')) return 'danger';
    if (s.includes('pending') || s.includes('hold')) return 'warning';
    if (s.includes('pick') || s.includes('transit')) return 'info';
    return 'default';
  };

  return (
    <motion.div 
      className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 bg-background min-h-screen text-foreground w-full max-w-full overflow-x-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Courier Logistics Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Mission-critical courier tracking and delivery verification.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerManualSyncAll} 
            disabled={isSyncing || steadfastOrders.length === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            Sync All Statuses
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-semibold border border-emerald-500/20">
            <Zap size={14} />
            <span>Node Secured</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="animate-in slide-in-from-bottom-4 duration-500 fade-in border-border bg-card">
            <CardContent className="p-6">
              <div className="text-sm font-medium text-muted-foreground">Active Transit</div>
              <div className="text-3xl font-display font-bold text-sky-600 mt-2">
                {steadfastOrders.filter(o => !String(o.courier_status).toLowerCase().includes('delivered')).length}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="animate-in slide-in-from-bottom-4 duration-500 fade-in border-border bg-card">
            <CardContent className="p-6">
              <div className="text-sm font-medium text-muted-foreground">Delivered Today</div>
              <div className="text-3xl font-display font-bold text-emerald-600 mt-2">
                {steadfastOrders.filter(o => 
                  String(o.courier_status).toLowerCase().includes('delivered') &&
                  isToday(o.updated_at)
                ).length}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="animate-in slide-in-from-bottom-4 duration-500 fade-in border-border bg-card">
            <CardContent className="p-6">
              <div className="text-sm font-medium text-muted-foreground">Pending Transit</div>
              <div className="text-3xl font-display font-bold text-amber-600 mt-2">
                {steadfastOrders.filter(o => String(o.courier_status).toLowerCase().includes('pending')).length}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, height: 0 }}
            animate={{ scale: 1, opacity: 1, height: 'auto' }}
            exit={{ scale: 0.9, opacity: 0, height: 0 }}
            className="flex justify-end"
          >
            <Button 
              onClick={handlePrintSelection}
              className="shadow-lg hover:shadow-xl transition-all"
            >
              Mark & Generate Labels ({selectedIds.size})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-4 md:p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder="Search logistics by tracking, ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {['today', 'yesterday', 'all'].map(filter => (
                <button 
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all",
                    dateFilter === filter 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {filter === 'all' ? 'All Hub' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full whitespace-nowrap hidden md:inline-flex" title="Orders not opened in Steadfast route">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground uppercase text-xs font-bold">
                <tr>
                  <th className="p-4 w-12">
                    <input type="checkbox" className="rounded border-border" checked={selectedIds.size === steadfastOrders.length && steadfastOrders.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th className="p-4">Logistics Identifiers</th>
                  <th className="p-4">Consignment & Recipient</th>
                  <th className="p-4">Node Status</th>
                  <th className="p-4">Dispatch Analytics</th>
                  <th className="p-4 text-right">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {steadfastOrders.map(order => (
                    <motion.tr 
                      key={order.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "hover:bg-secondary/30 transition-colors cursor-pointer group",
                        selectedIds.has(order.id) && "bg-primary/5 hover:bg-primary/10",
                        isOrderUnread(order) && "bg-primary/5 font-semibold"
                      )}
                      onClick={() => handleRowClick(order)}
                    >
                      <td className="p-4 align-top">
                        <input type="checkbox" className="rounded border-border mt-1" checked={selectedIds.has(order.id)} onChange={(e) => toggleSelect(e, order.id)} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Consignment</span>
                            <code className="px-2 py-1 bg-secondary rounded text-xs text-foreground font-mono">{order.courier_assigned_id || 'Waiting Sync'}</code>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Tracking</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{order.tracking_id || 'Unassigned'}</span>
                              {order.tracking_id && (
                                <a 
                                  href={String(order.courier_name || '').toLowerCase() === 'pathao'
                                    ? 'https://pathao.com/courier/'
                                    : `https://portal.steadfast.com.bd/tracking/${order.tracking_id}`
                                  } 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-primary hover:text-primary/80" 
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread order" />}
                          <span className="font-bold text-foreground">#{order.id}</span>
                          {isOrderUnread(order) && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                          <Badge variant="outline" className="text-xs bg-secondary/50">
                            {String(order.courier_name || 'S-FAST').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2"><User size={14} /> {order.customer_name}</div>
                          <div className="flex items-center gap-2"><Phone size={14} /> {order.phone}</div>
                          <div className="flex items-center gap-2 line-clamp-1" title={order.address}><MapPin size={14} /> {order.address}</div>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2 items-start">
                          <Badge variant={getStatusVariant(order.courier_status)}>
                            {order.courier_status || 'Handover'}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <RotateCcw size={12} /> Live Monitoring
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar size={14} /> 
                            {order.dispatched_at ? new Date(order.dispatched_at).toLocaleDateString() : 'N/A'}
                          </div>
                          {order.dispatched_at && (
                            <div className="flex items-center gap-2 text-primary font-medium">
                              <Truck size={14} /> {getTimeSinceDispatch(order.dispatched_at)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-top text-right">
                        <Button 
                          size="icon"
                          variant="ghost"
                          className={cn("h-8 w-8 rounded-full", syncStatus[order.id] === 'syncing' && "text-primary")}
                          onClick={(e) => { e.stopPropagation(); handleSyncStatus(order.id, order.tracking_id); }}
                          disabled={syncStatus[order.id] === 'syncing' || !order.tracking_id}
                        >
                          <RefreshCw size={16} className={syncStatus[order.id] === 'syncing' ? 'animate-spin' : ''} />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {steadfastOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-muted-foreground">
                      <Package size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No logistics data found for this period.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3">
          <AnimatePresence mode="popLayout">
            {steadfastOrders.map(order => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "rounded-2xl border border-border bg-card p-4 shadow-sm relative",
                  selectedIds.has(order.id) && "ring-2 ring-primary/50",
                  isOrderUnread(order) && "border-primary/30 bg-primary/5"
                )}
                onClick={() => handleRowClick(order)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-border w-5 h-5"
                      checked={selectedIds.has(order.id)} 
                      onChange={(e) => toggleSelect(e, order.id)} 
                      onClick={(e) => e.stopPropagation()} 
                    />
                    <div className="flex items-center gap-2">
                      {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary" />}
                      <span className="font-bold text-lg">#{String(order.id).replace('ORD-', '')}</span>
                      {isOrderUnread(order) && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px] uppercase bg-secondary/50">
                      {String(order.courier_name || 'S-FAST')}
                    </Badge>
                    <Badge variant={getStatusVariant(order.courier_status)} className="text-[10px]">
                      {order.courier_status || 'Handover'}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold text-foreground mb-1">{order.customer_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone size={14} /> {order.phone}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 line-clamp-1"><MapPin size={14} /> {order.address}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-secondary/30 p-3 rounded-xl border border-border/50">
                  <div>
                    <span className="text-muted-foreground block mb-1">Tracking ID</span>
                    <span className="font-mono font-medium">{order.tracking_id || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Consignment ID</span>
                    <span className="font-mono font-medium">{order.courier_assigned_id || 'Waiting Sync'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Dispatched</span>
                    <span className="font-medium">{order.dispatched_at ? new Date(order.dispatched_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Product</span>
                    <span className="font-medium line-clamp-1">{order.product_name || 'Item'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => { e.stopPropagation(); handleSyncStatus(order.id, order.tracking_id); }}
                    disabled={syncStatus[order.id] === 'syncing' || !order.tracking_id}
                    className="w-full rounded-full text-xs h-9 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} className={syncStatus[order.id] === 'syncing' ? 'animate-spin' : ''} />
                    <span>{syncStatus[order.id] === 'syncing' ? 'Syncing...' : 'Sync Courier'}</span>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {steadfastOrders.length === 0 && (
            <div className="p-10 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              <Package size={36} className="mx-auto mb-3 opacity-50" />
              <p>No logistics entries match.</p>
            </div>
          )}
        </div>
      </div>

      <OrderDetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        order={selectedOrder}
      />

      <PackingSlip orders={orders.filter(o => selectedIds.has(o.id))} />
    </motion.div>
  );
};
