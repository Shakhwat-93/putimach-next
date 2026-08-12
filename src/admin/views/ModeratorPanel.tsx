'use client';
// @ts-nocheck
import { useState, useRef, useEffect, useMemo } from 'react';
import './ModeratorPanel.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';

// shadcn UI
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

// Other components
import { Modal } from '../components/Modal';
import { OrderRow } from '../components/OrderRow';
import { OrderEditModal } from '../components/OrderEditModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { DateRangePicker } from '../components/DateRangePicker';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { 
  Edit2, Trash2, Plus, Search, Package, DollarSign, ShoppingCart, 
  Globe, ChevronDown, ChevronLeft, ChevronRight, Wand2, Trash, Truck, MapPin, X, Sparkles, CheckCircle2, Loader2
} from 'lucide-react';
import { PremiumSearch } from '../components/PremiumSearch';
import CurrencyIcon from '../components/CurrencyIcon';
import { deserializeDateRange, usePersistentState } from '../utils/persistentState';
import { getProductCheckpoints } from '../utils/productCatalog';
import { useRouteOrderReadState } from '../hooks/useRouteOrderReadState';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ResponseTimer } from '../components/ResponseTimer';
import { cn } from '../lib/utils';

const ORDER_STATUSES = [
  'New', 'Pending Call', 'Final Call Pending', 'Confirmed', 'Bulk Exported', 'Factory Queue', 'Courier Ready',
  'Courier Submitted', 'Factory Processing', 'Completed', 'Fake Order', 'Cancelled', 'Test'
];

const SOURCES = ['Website', 'Facebook', 'Instagram', 'Direct'];
const MODERATOR_PAGE_SIZE = 10;

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

export const ModeratorPanel = () => {
  const { orders, stats, inventory, updateOrderStatus } = useOrders();
  const { showError, ConfirmDialogComponent } = useConfirmDialog();
  const productCheckpoints = getProductCheckpoints(inventory);
  
  // Filters
  const [searchTerm, setSearchTerm] = usePersistentState('panel:moderator:search', '');
  const [statusFilter, setStatusFilter] = usePersistentState('panel:moderator:status', 'All');
  const [productFilter, setProductFilter] = usePersistentState('panel:moderator:product', '');
  const [sourceFilter, setSourceFilter] = usePersistentState('panel:moderator:source', 'All');
  const [dateRange, setDateRange] = usePersistentState(
    'panel:moderator:dateRange',
    { start: null, end: null },
    { deserialize: deserializeDateRange }
  );

  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll refs
  const statusTabsRef = useRef(null);
  const checkpointsRef = useRef(null);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  // Track which order is currently saving a status change
  const [savingStatusId, setSavingStatusId] = useState(null);
  // Track which order's status dropdown is open on mobile
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleOpenEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleRowClick = (order) => {
    markOrderRead(order);
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const handleMobileStatusChange = async (orderId, newStatus) => {
    setSavingStatusId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error('Status update failed:', err);
      showError(err.message || 'Failed to update status.', 'Status Update Failed');
    } finally {
      setSavingStatusId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (o.id || '').toLowerCase().includes(term) ||
      (o.customer_name || '').toLowerCase().includes(term) ||
      (o.phone || '').includes(term) ||
      (o.product_name || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchesProduct = !productFilter || o.product_name === productFilter;
    const matchesSource = sourceFilter === 'All' || o.source === sourceFilter;
    
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const orderDate = new Date(o.created_at);
      matchesDate = orderDate >= new Date(dateRange.start) && orderDate <= new Date(dateRange.end);
    }

    return matchesSearch && matchesStatus && matchesProduct && matchesSource && matchesDate;
  });
  
  const { isOrderUnread, markOrderRead, unreadCount } = useRouteOrderReadState('moderator-panel', filteredOrders);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / MODERATOR_PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * MODERATOR_PAGE_SIZE;
    return filteredOrders.slice(startIndex, startIndex + MODERATOR_PAGE_SIZE);
  }, [filteredOrders, currentPage]);
  const visiblePages = useMemo(() => getVisiblePageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, productFilter, sourceFilter, dateRange.start, dateRange.end]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending') || s === 'new') return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    if (s === 'confirmed') return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    if (s === 'cancelled') return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
    if (s.includes('fake')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    if (s.includes('final call')) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    if (s.includes('courier') || s.includes('transit')) return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800';
    return 'bg-secondary text-secondary-foreground border-border';
  };

  const getStatusDot = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending') || s === 'new') return 'bg-amber-500';
    if (s === 'confirmed') return 'bg-emerald-500';
    if (s === 'cancelled') return 'bg-rose-500';
    if (s.includes('fake')) return 'bg-red-500';
    if (s.includes('final call')) return 'bg-orange-500';
    if (s.includes('courier') || s.includes('transit')) return 'bg-sky-500';
    return 'bg-muted-foreground';
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full overflow-x-hidden animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground flex items-center gap-2">
            Moderator <span className="text-primary">Panel</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage incoming orders, verify details, and route for processing.</p>
        </div>
        
        <div>
          <Button onClick={() => handleOpenEditModal(null)} className="flex items-center gap-2 rounded-full">
            <Plus size={18} /> Add New Order
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200/50 dark:border-indigo-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                <ShoppingCart size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <h3 className="text-2xl font-bold text-foreground">{orders.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200/50 dark:border-emerald-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/30">
                <Package size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Added Today</p>
                <h3 className="text-2xl font-bold text-foreground">{stats.addedTodayCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-200/50 dark:border-teal-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-500 rounded-xl text-white shadow-lg shadow-teal-500/30">
                <DollarSign size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue Today</p>
                <h3 className="text-2xl font-bold text-foreground flex items-center">
                  <CurrencyIcon size={22} className="mr-1 opacity-80" />
                  {orders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0).toLocaleString()}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-bold">By Source</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[120px] relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <PieChart>
                  <Pie
                    data={stats.sourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
                    paddingAngle={4}
                    cornerRadius={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.sourceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderRadius: '8px', 
                      border: '1px solid hsl(var(--border))', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="relative group">
        <button 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/80 backdrop-blur border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
          onClick={() => scrollContainer(statusTabsRef, 'left')}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 w-full max-w-full" ref={statusTabsRef}>
          {['All', ...ORDER_STATUSES].map(tab => (
            <button 
              key={tab} 
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all min-h-[36px]",
                statusFilter === tab 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-card border-border text-muted-foreground hover:border-primary/50"
              )}
              onClick={() => setStatusFilter(tab)}
            >
              {tab === 'All' ? 'All Orders' : tab}
            </button>
          ))}
        </div>
        <button 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/80 backdrop-blur border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
          onClick={() => scrollContainer(statusTabsRef, 'right')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Product Checkpoints */}
      <div className="relative group">
        <button 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/80 backdrop-blur border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
          onClick={() => scrollContainer(checkpointsRef, 'left')}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 w-full max-w-full" ref={checkpointsRef}>
          {productCheckpoints.map(p => (
            <button
              key={p.id}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-2",
                productFilter === (p.id === 'all' ? '' : p.name)
                  ? "border-primary/50 ring-1 ring-primary/20 bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-border/80"
              )}
              onClick={() => setProductFilter(p.id === 'all' ? '' : p.name)}
            >
              {p.id !== 'all' && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              )}
              {p.name}
            </button>
          ))}
        </div>
        <button 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/80 backdrop-blur border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
          onClick={() => scrollContainer(checkpointsRef, 'right')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Unified Filter Bar */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <PremiumSearch
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID, name or phone..."
            suggestions={
              searchTerm ? orders.filter(o => 
                o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.phone?.includes(searchTerm)
              ).slice(0, 5).map(o => ({
                id: o.id,
                label: o.customer_name,
                sub: o.id,
                type: 'order',
                original: o
              })) : []
            }
            onSuggestionClick={(item) => {
              if (item.type === 'order') {
                handleRowClick(item.original);
              }
            }}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div 
            className="relative flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors flex-1 md:flex-none min-w-[140px]" 
            ref={sourceDropdownRef}
            onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
          >
            <Globe size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium truncate flex-1">
              {sourceFilter === 'All' ? 'All Sources' : sourceFilter}
            </span>
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", sourceDropdownOpen && "rotate-180")} />
            
            <AnimatePresence>
              {sourceDropdownOpen && (
                <motion.div 
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div 
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer hover:bg-secondary transition-colors",
                      sourceFilter === 'All' && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourceFilter('All');
                      setSourceDropdownOpen(false);
                    }}
                  >
                    All Sources
                  </div>
                  {SOURCES.map(s => (
                    <div 
                      key={s} 
                      className={cn(
                        "px-3 py-2 text-sm cursor-pointer hover:bg-secondary transition-colors",
                        sourceFilter === s && "bg-primary/10 text-primary font-medium"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSourceFilter(s);
                        setSourceDropdownOpen(false);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2">
              {unreadCount} unread
            </Badge>
          )}
          <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
            {filteredOrders.length} orders
          </span>
        </div>
      </div>

      {/* Orders Table - Desktop */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Fulfilment</th>
                <th className="px-4 py-3" title="Time since order arrived vs. first response">Response</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedOrders.map(order => (
                <OrderRow 
                  key={order.id} 
                  order={order} 
                  onStatusChange={updateOrderStatus} 
                  onEdit={handleOpenEditModal} 
                  onDetails={handleRowClick}
                  isUnread={isOrderUnread(order)}
                />
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan="10" className="px-4 py-8 text-center text-muted-foreground">No orders found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders List - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border">
            No orders found matching your filters.
          </div>
        )}
        {paginatedOrders.map(order => {
          const isSaving = savingStatusId === order.id;
          return (
            <div 
              key={order.id} 
              className={cn(
                "rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm relative overflow-hidden transition-all active:scale-[0.98]",
                isOrderUnread(order) && "border-primary/50 bg-primary/5"
              )}
              onClick={() => handleRowClick(order)}
            >
              {/* Row 1: Order ID + Status pill */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread order" />}
                    <span className="font-bold text-foreground">#{order.id.replace('ORD-', '')}</span>
                    {isOrderUnread(order) && <Badge variant="default" className="text-[10px] h-4 px-1 rounded bg-primary/20 text-primary hover:bg-primary/30 border-0">New</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.created_at)}</div>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5",
                  getStatusColor(order.status)
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(order.status))} />
                  {order.status}
                </div>
              </div>

              {/* Row 2: Customer + Amount */}
              <div className="flex justify-between items-end pt-1">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-semibold text-sm truncate text-foreground">{order.customer_name}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {order.phone}
                    {order.product_name && <> <span className="mx-1 opacity-50">•</span> <span className="italic">{order.product_name}</span></>}
                  </div>
                </div>
                <div className="font-bold text-sm text-foreground whitespace-nowrap">
                  ৳{Number(order.amount || 0).toLocaleString()}
                </div>
              </div>

              {/* Footer: Response Timer + Status Changer + Edit */}
              <div className="flex items-center justify-between pt-3 border-t border-border mt-3" onClick={e => e.stopPropagation()}>
                <div className="scale-90 origin-left">
                  <ResponseTimer order={order} mode="compact" />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Status dropdown */}
                  <div className="relative">
                    {isSaving
                      ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Saving...</span>
                      : (
                        <div>
                          <button 
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/50 text-xs font-medium transition-colors hover:bg-secondary",
                              openStatusDropdownId === order.id && "bg-secondary border-primary/30"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenStatusDropdownId(openStatusDropdownId === order.id ? null : order.id);
                            }}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(order.status))} />
                            <span className="truncate max-w-[80px]">{order.status}</span>
                            <ChevronDown size={12} className={cn("text-muted-foreground transition-transform", openStatusDropdownId === order.id && "rotate-180")} />
                          </button>

                          {openStatusDropdownId === order.id && (
                            <div className="absolute bottom-full right-0 mb-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 p-1 max-h-[250px] overflow-y-auto">
                              {ORDER_STATUSES.map(s => (
                                <button
                                  key={s}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors text-left",
                                    order.status === s && "bg-primary/10 text-primary font-medium"
                                  )}
                                  onClick={() => {
                                    handleMobileStatusChange(order.id, s);
                                    setOpenStatusDropdownId(null);
                                  }}
                                >
                                  <span className={cn("w-2 h-2 rounded-full", getStatusDot(s))} />
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                  </div>

                  {/* Edit button */}
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => handleOpenEditModal(order)}>
                    <Edit2 size={14} className="text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2">
          <div className="text-sm text-muted-foreground font-medium">
            Showing {(currentPage - 1) * MODERATOR_PAGE_SIZE + 1}-
            {Math.min(currentPage * MODERATOR_PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl">
            <button
              className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <div className="flex items-center px-1">
              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg transition-colors",
                    currentPage === pageNumber ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
                  )}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

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
      {ConfirmDialogComponent}
    </div>
  );
};

export default ModeratorPanel;
