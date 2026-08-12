'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import './CourierPanel.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { OrderEditModal } from '../components/OrderEditModal';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { ExportModal } from '../components/ExportModal';
import { Search, Truck, CheckCircle, Package, ClipboardCheck, Edit2, Clock, Loader2, AlertTriangle, FileSpreadsheet, Filter, Sparkles, Zap } from 'lucide-react';
import api from '../lib/api';
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

export const CourierPanel = () => {
  const { confirmDialog, showError, showInfo, alertDialog, ConfirmDialogComponent } = useConfirmDialog();
  const { orders, updateOrderStatus, editOrder, dispatchToCourier, autoDistributeOrders, distributeSingleOrder, inventory, toyBoxes } = useOrders();
  const { updatePresenceContext } = useAuth();

  useEffect(() => {
    updatePresenceContext('Managing Bulk Exported Orders');
  }, [updatePresenceContext]);

  const [searchTerm, setSearchTerm] = usePersistentState('panel:courier:search', '');
  const [activeTab, setActiveTab] = usePersistentState('panel:courier:tab', 'bulk');
  const [dateFilter, setDateFilter] = usePersistentState('panel:courier:dateFilter', 'All');
  const [steadfastPending, setSteadfastPending] = useState({});
  const [steadfastSubmitted, setSteadfastSubmitted] = useState({});
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState('All');
  const [selectedVariant, setSelectedVariant] = useState('All');
  const [selectedStockStatus, setSelectedStockStatus] = useState('All');
  const [rowLoading, setRowLoading] = useState({});

  const checkStockForUI = (order) => {
    const items = order.ordered_items || [];
    const orderLines = items.length > 0 ? items : [
      { name: order.product_name, quantity: order.quantity || 1 }
    ];
    
    let allAvailable = true;
    const missingItems = [];
    
    for (const item of orderLines) {
      const itemName = typeof item === 'object' ? (item.name || order.product_name) : order.product_name;
      const qtyNeeded = typeof item === 'object' ? (item.quantity || 1) : (order.quantity || 1);
      
      const isToyBox = itemName.toUpperCase().includes('TOY BOX') || (typeof item === 'object' && item.isToyBox);
      if (isToyBox) {
        let boxNum = null;
        if (typeof item === 'object') {
          const boxMatch = (itemName || '').match(/#(\d+)/);
          boxNum = item.toyBoxNumber || (boxMatch ? parseInt(boxMatch[1]) : null);
        } else {
          boxNum = Number(item);
        }

        if (boxNum != null) {
          const box = toyBoxes.find(b => 
            (b.product_name || 'TOY BOX').toUpperCase().includes('TOY BOX') &&
            Number(b.toy_box_number) === boxNum
          );
          const available = box ? Number(box.stock_quantity) || 0 : 0;
          if (available < qtyNeeded) {
            allAvailable = false;
            missingItems.push(`Serial #${boxNum}: ${available}/${qtyNeeded}`);
          }
        } else {
          const match = toyBoxes.find(b => 
            (b.product_name || 'TOY BOX').toLowerCase() === itemName.toLowerCase()
          );
          const available = match ? Number(match.stock_quantity) || 0 : 0;
          if (available < qtyNeeded) {
            allAvailable = false;
            missingItems.push(`${itemName}: ${available}/${qtyNeeded}`);
          }
        }
      } else {
        const invMatch = api.matchInventoryProduct(itemName, inventory);
        if (invMatch) {
          const available = Number(invMatch.current_stock) || 0;
          if (available < qtyNeeded) {
            allAvailable = false;
            missingItems.push(`${invMatch.name}: ${available}/${qtyNeeded}`);
          }
        } else {
          allAvailable = false;
          missingItems.push(`${itemName}: Out of Stock`);
        }
      }
    }
    return { inStock: allAvailable, details: missingItems.join(', ') };
  };

  const handleDistributeFiltered = () => {
    const eligibleOrders = bulkExportedQueue.filter(order => checkStockForUI(order).inStock);
    if (eligibleOrders.length === 0) {
      showInfo('No in-stock orders match your current filters.', 'No Orders Found');
      return;
    }

    confirmDialog({
      title: 'Distribute Filtered Orders',
      description: `Distribute ${eligibleOrders.length} filtered, in-stock orders to courier workflow?`,
      confirmLabel: 'Distribute',
      onConfirm: async () => {
        setIsDistributing(true);
        let successCount = 0;
        let failCount = 0;
        let errors = [];

        for (const order of eligibleOrders) {
          try {
            await distributeSingleOrder(order.id);
            successCount++;
          } catch (err) {
            failCount++;
            errors.push(`#${order.id.replace('ORD-', '')}: ${err.message}`);
          }
        }

        setIsDistributing(false);
        alertDialog({
          title: 'Distribution Complete',
          message: `Successfully distributed ${successCount} orders.${failCount > 0 ? ` Failed: ${failCount}.${errors.length ? '\n\n' + errors.slice(0, 5).join('\n') : ''}` : ''}`,
          type: failCount > 0 ? 'warning' : 'success',
        });
      },
    });
  };

  const handleSingleDistribute = async (e, orderId) => {
    e.stopPropagation();
    setRowLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      await distributeSingleOrder(orderId);
    } catch (err) {
      showError(err.message, 'Manual Dispatch Failed');
    } finally {
      setRowLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [trackingIdInput, setTrackingIdInput] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleOpenEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleRowClick = (order) => {
    markOrderRead(order);
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const matchesDate = (order) => {
    if (dateFilter === 'All') return true;
    if (dateFilter === 'Today') {
      const today = new Date().toDateString();
      const orderDate = new Date(order.updated_at || order.created_at).toDateString();
      return today === orderDate;
    }
    return true;
  };

  const matchesSearch = (order) => (
    (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.phone || '').includes(searchTerm)
  );

  const filterOrder = (order) => {
    const matchesSearchVal = matchesSearch(order);
    const matchesDateVal = matchesDate(order);
    const matchesProduct = selectedProduct === 'All' || order.product_name === selectedProduct;
    let matchesVariant = true;
    if (selectedVariant !== 'All') {
      const items = order.ordered_items || [];
      matchesVariant = items.some(item => {
        const name = typeof item === 'object' ? (item.name || '') : '';
        return name.toLowerCase().includes(selectedVariant.toLowerCase());
      });
    }
    let matchesStock = true;
    if (selectedStockStatus !== 'All') {
      const { inStock } = checkStockForUI(order);
      matchesStock = selectedStockStatus === 'InStock' ? inStock : !inStock;
    }
    return matchesSearchVal && matchesDateVal && matchesProduct && matchesVariant && matchesStock;
  };

  const bulkExportedAll = orders.filter((order) => order.status === 'Bulk Exported');
  const courierReadyAll = orders.filter((order) => order.status === 'Courier Ready');
  
  const uniqueProducts = Array.from(new Set(orders.map(o => o.product_name).filter(Boolean)));
  const uniqueVariants = Array.from(new Set(
    orders.flatMap(o => {
      const items = o.ordered_items || [];
      return items.map(item => {
        const name = typeof item === 'object' ? item.name || '' : '';
        const parts = name.split('-');
        return parts.length > 1 ? parts[parts.length - 1].trim() : null;
      }).filter(Boolean);
    })
  ));
  const bulkExportedQueue = bulkExportedAll.filter(filterOrder);
  const courierReadyQueue = courierReadyAll.filter(filterOrder);
  const courierQueue = activeTab === 'bulk' ? bulkExportedQueue : courierReadyQueue;
  
  const todayCount = (activeTab === 'bulk' ? bulkExportedAll : courierReadyAll).filter(o => {
    const today = new Date().toDateString();
    const orderDate = new Date(o.updated_at || o.created_at).toDateString();
    return today === orderDate;
  }).length;
  const { isOrderUnread, markOrderRead, unreadCount } = useRouteOrderReadState(`courier-panel:${activeTab}`, courierQueue);

  const withTrackingCount = courierReadyAll.filter(o => Boolean(o.tracking_id)).length;
  const pendingTrackingCount = courierReadyAll.length - withTrackingCount;

  const handleAutoDistribute = () => {
    if (bulkExportedAll.length === 0) return;
    confirmDialog({
      title: 'Auto Distribute Orders',
      description: `Distribute ${bulkExportedAll.length} bulk exported orders to courier workflow?`,
      confirmLabel: 'Distribute',
      onConfirm: async () => {
        setIsDistributing(true);
        setDistributeResult(null);
        try {
          const result = await autoDistributeOrders('Bulk Exported');
          setDistributeResult(result);
          setActiveTab('ready');
          setTimeout(() => setDistributeResult(null), 8000);
        } catch (error) {
          console.error('Bulk exported distribution failed:', error);
          setDistributeResult({ error: error.message });
        } finally {
          setIsDistributing(false);
        }
      },
    });
  };

  const handleOpenTrackingModal = (order) => {
    setActiveOrderId(order.id);
    setTrackingIdInput(order.tracking_id || '');
    setIsModalOpen(true);
  };

  const handleSaveTracking = (e) => {
    e.preventDefault();
    if (activeOrderId && trackingIdInput) {
      editOrder(activeOrderId, { tracking_id: trackingIdInput });
    }
    setIsModalOpen(false);
  };

  const handleSubmitToCourier = (orderId) => {
    updateOrderStatus(orderId, 'Courier Submitted');
  };

  const handleSteadfastDispatch = async (e, order) => {
    e.stopPropagation();

    const orderId = order.id;
    if (steadfastPending[orderId] || steadfastSubmitted[orderId]) {
      return;
    }

    setSteadfastPending((prev) => ({ ...prev, [orderId]: true }));

    try {
      await dispatchToCourier(orderId);
      setSteadfastSubmitted((prev) => ({ ...prev, [orderId]: true }));
    } catch (err) {
      showError(err.message, 'Steadfast Dispatch Failed');
    } finally {
      setSteadfastPending((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  return (
    <motion.div 
      className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full max-w-full overflow-x-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Bulk Exported</h1>
          <p className="text-sm text-muted-foreground mt-1">Review exported confirmed batches, then distribute eligible orders to courier dispatch.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="primary"
            onClick={handleAutoDistribute}
            disabled={isDistributing || bulkExportedAll.length === 0}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 font-medium"
          >
            {isDistributing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            <span>Auto Distribute ({bulkExportedAll.length})</span>
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground rounded-xl border border-border whitespace-nowrap font-medium text-sm">
            <Truck size={16} className="text-primary" />
            <span>{courierReadyAll.length} Ready</span>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {distributeResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border font-medium overflow-hidden",
              distributeResult.error ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}
          >
            {distributeResult.error ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>
              {distributeResult.error ? `Error: ${distributeResult.error}` : (
                <>
                  Distribution complete: <strong>{distributeResult.distributed}</strong> ready, <strong>{distributeResult.queued}</strong> queued.
                </>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center gap-4 animate-slide-up bg-card border-border shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={22} /></div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Bulk Exported</p>
              <p className="text-2xl font-bold text-foreground">{bulkExportedAll.length}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center gap-4 animate-slide-up bg-card border-border shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ClipboardCheck size={22} /></div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Courier Ready</p>
              <p className="text-2xl font-bold text-foreground">{courierReadyAll.length}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 flex items-center gap-4 animate-slide-up bg-card border-border shadow-sm">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={22} /></div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Unassigned</p>
              <p className="text-2xl font-bold text-foreground">{pendingTrackingCount}</p>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-border">
        <button
          type="button"
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-2",
            activeTab === 'bulk' 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
          )}
          onClick={() => setActiveTab('bulk')}
        >
          <Package size={15} /> Bulk Exported ({bulkExportedAll.length})
        </button>
        <button
          type="button"
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-2",
            activeTab === 'ready' 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
          )}
          onClick={() => setActiveTab('ready')}
        >
          <Truck size={15} /> Courier Ready ({courierReadyAll.length})
        </button>
      </div>

      <Card className="overflow-hidden bg-card border-border shadow-sm animate-slide-up" noPadding>
        <div className="p-4 border-b border-border bg-secondary/30 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
          </div>
          
          <select 
            className="bg-card border border-border text-foreground text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="All">All Products</option>
            {uniqueProducts.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select 
            className="bg-card border border-border text-foreground text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
          >
            <option value="All">All Color/Variants</option>
            {uniqueVariants.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <select 
            className="bg-card border border-border text-foreground text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value)}
          >
            <option value="All">All Stock Status</option>
            <option value="InStock">In Stock Only</option>
            <option value="StockOut">Stock Out Only</option>
          </select>

          {activeTab === 'bulk' && bulkExportedQueue.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDistributeFiltered}
              disabled={isDistributing}
              className="md:ml-auto flex items-center justify-center gap-2 text-xs font-bold border-primary text-primary bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5"
            >
              <Sparkles size={14} />
              <span>Distribute Filtered ({bulkExportedQueue.filter(o => checkStockForUI(o).inStock).length})</span>
            </Button>
          )}
        </div>

        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex-1 flex flex-col md:flex-row gap-4 md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search ID, recipient or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border text-foreground text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  dateFilter === 'All' ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-foreground border-border hover:bg-secondary"
                )}
                onClick={() => setDateFilter('All')}
              >
                All Time
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  dateFilter === 'Today' ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-foreground border-border hover:bg-secondary"
                )}
                onClick={() => setDateFilter('Today')}
              >
                Today ({todayCount})
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto mt-2 md:mt-0">
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <Truck size={14} />
              <span>Target verified inventory</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md" title="Orders not opened in Courier route">
                {unreadCount} unread
              </span>
            )}
            <Button 
              variant="outline" 
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 text-sm bg-card border-border hover:bg-secondary whitespace-nowrap ml-auto"
            >
              <FileSpreadsheet size={14} />
              Export
            </Button>
          </div>
        </div>

        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-muted-foreground font-medium">
                <th className="py-3 px-4 whitespace-nowrap">Reference</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Product Package</th>
                <th className="py-3 px-4">Tracking ID</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4 text-right">Control</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {courierQueue.map(order => {
                  const isBulkExported = order.status === 'Bulk Exported';
                  const isSteadfastSending = Boolean(steadfastPending[order.id]);
                  const isSteadfastSubmitted = Boolean(steadfastSubmitted[order.id]);
                  const isSteadfastLocked =
                    isBulkExported ||
                    isSteadfastSending ||
                    isSteadfastSubmitted ||
                    order.status === 'Courier Submitted' ||
                    Boolean(order.courier_assigned_id) ||
                    order.courier_name === 'Steadfast';

                  const { inStock, details } = checkStockForUI(order);
                  return (
                    <motion.tr 
                      key={order.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer group",
                        isOrderUnread(order) && "bg-primary/5"
                      )}
                      onClick={() => handleRowClick(order)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary" />}
                          <span className="font-medium text-foreground">#{(order.id || '').replace('ORD-', '')}</span>
                          {isOrderUnread(order) && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">New</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{order.customer_name}</span>
                          <span className="text-muted-foreground text-xs">{order.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground truncate max-w-[200px]">{order.product_name}</span>
                          {order.size && <span className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-md w-max">T-{order.size}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {order.tracking_id ? (
                          <span className="font-mono bg-secondary px-2 py-1 rounded-full text-xs flex items-center gap-1 w-max text-foreground">
                            <Truck size={12} className="text-primary" /> {order.tracking_id}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Awaiting...</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isBulkExported ? (
                          <div className={cn("flex items-center gap-1.5 text-xs font-medium", inStock ? "text-emerald-600" : "text-rose-600")} title={details}>
                            <span className="text-[10px]">●</span>
                            <span>{inStock ? 'In Stock' : 'Stock Out'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <span className="text-[10px]">●</span>
                            <span>Assigned</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                          isBulkExported ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-sky-50 text-sky-700 border border-sky-200"
                        )}>
                          {isBulkExported ? 'Bulk Exported' : 'Ready'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isBulkExported && (
                            <button
                              className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                              disabled={!inStock || rowLoading[order.id]}
                              onClick={(e) => handleSingleDistribute(e, order.id)}
                              title={inStock ? "Distribute to Courier" : "Out of Stock - Locked"}
                            >
                              {rowLoading[order.id] ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded bg-secondary text-foreground hover:bg-border transition-colors"
                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(order); }}
                            title="Adjust Details"
                          >
                            <Edit2 size={16} />
                          </button>
                          {!isBulkExported && (
                            <>
                              <button
                                className="p-1.5 rounded bg-secondary text-foreground hover:bg-border transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleOpenTrackingModal(order); }}
                                title="Assign Tracking"
                              >
                                <Truck size={16} />
                              </button>
                              <button
                                className={cn(
                                  "flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-white transition-colors",
                                  isSteadfastSubmitted ? "bg-emerald-500" : "bg-indigo-500 hover:bg-indigo-600",
                                  isSteadfastLocked && !isSteadfastSubmitted && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={(e) => handleSteadfastDispatch(e, order)}
                                disabled={isSteadfastLocked}
                                title="Direct API Dispatch"
                              >
                                {isSteadfastSending ? <Clock size={14} className="animate-spin" /> : <Zap size={14} />}
                                <span>{isSteadfastSending ? '...' : isSteadfastSubmitted ? 'Sent' : 'S-Fast'}</span>
                              </button>
                              <button
                                className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleSubmitToCourier(order.id); }}
                                disabled={!order.tracking_id || isSteadfastSending}
                                title="Mark as Dispatched"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {courierQueue.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-muted-foreground">
                    <Truck size={40} className="mx-auto mb-3 opacity-20" />
                    <p>{activeTab === 'bulk' ? 'No bulk exported orders waiting for distribution.' : 'No verified orders ready for dispatch.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-4 space-y-3 bg-secondary/10">
          <AnimatePresence>
            {courierQueue.map(order => {
              const isBulkExported = order.status === 'Bulk Exported';
              const isSteadfastSending = Boolean(steadfastPending[order.id]);
              const isSteadfastSubmitted = Boolean(steadfastSubmitted[order.id]);
              const isSteadfastLocked =
                isBulkExported ||
                isSteadfastSending ||
                isSteadfastSubmitted ||
                order.status === 'Courier Submitted' ||
                Boolean(order.courier_assigned_id) ||
                order.courier_name === 'Steadfast';

              const { inStock, details } = checkStockForUI(order);

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-4 shadow-sm",
                    isOrderUnread(order) && "border-primary/50 ring-1 ring-primary/20"
                  )}
                  onClick={() => handleRowClick(order)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary" />}
                      <span className="font-bold text-foreground">#{order.id.replace('ORD-', '')}</span>
                      {isOrderUnread(order) && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">New</span>}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <div className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                        {isBulkExported ? (inStock ? 'In Stock' : 'Stock Out') : 'Assigned'}
                      </div>
                      <div className={cn("text-[10px] px-1.5 py-0.5 rounded border", isBulkExported ? "border-amber-200 text-amber-700" : "border-sky-200 text-sky-700")}>
                        {isBulkExported ? 'Exported' : 'Ready'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="font-bold text-foreground text-lg">{order.customer_name}</h3>
                    <p className="text-muted-foreground text-sm">{order.phone}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 bg-secondary/30 p-2.5 rounded-xl text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Product</p>
                      <p className="font-medium text-foreground truncate">{order.product_name}</p>
                      {order.size && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground mt-1 inline-block">Size {order.size}</span>}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Tracking</p>
                      {order.tracking_id ? (
                        <span className="font-mono bg-secondary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 w-max text-foreground truncate max-w-full">
                          <Truck size={10} className="text-primary shrink-0" /> <span className="truncate">{order.tracking_id}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">{isBulkExported ? 'Awaiting dist.' : 'Awaiting'}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                    {isBulkExported && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1 border-primary text-primary hover:bg-primary/10 text-xs py-1 h-8"
                        disabled={!inStock || rowLoading[order.id]}
                        onClick={(e) => handleSingleDistribute(e, order.id)}
                      >
                        {rowLoading[order.id] ? <Loader2 size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
                        {inStock ? 'Distribute' : 'No Stock'}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1 bg-secondary border-transparent text-xs py-1 h-8" onClick={() => handleOpenEditModal(order)}>
                      <Edit2 size={14} className="mr-1" /> Edit
                    </Button>
                    
                    {!isBulkExported && (
                      <div className="w-full flex gap-2 mt-1">
                        <Button variant="outline" size="sm" className="flex-1 bg-secondary border-transparent text-xs py-1 h-8" onClick={() => handleOpenTrackingModal(order)}>
                          <Truck size={14} className="mr-1" /> Track
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn("flex-1 text-white border-transparent text-xs py-1 h-8", isSteadfastSubmitted ? "bg-emerald-500 hover:bg-emerald-600" : "bg-indigo-500 hover:bg-indigo-600")}
                          onClick={(e) => handleSteadfastDispatch(e, order)}
                          disabled={isSteadfastLocked}
                        >
                          {isSteadfastSending ? <Clock size={14} className="animate-spin mr-1" /> : <Zap size={14} className="mr-1" />}
                          {isSteadfastSending ? '...' : isSteadfastSubmitted ? 'Sent' : 'S-Fast'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs py-1 h-8"
                          onClick={() => handleSubmitToCourier(order.id)}
                          disabled={!order.tracking_id || isSteadfastSending}
                        >
                          <CheckCircle size={14} className="mr-1" /> Submit
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {courierQueue.length === 0 && (
            <div className="py-12 text-center text-muted-foreground bg-card rounded-2xl border border-border">
              <p>{activeTab === 'bulk' ? 'No bulk exported orders waiting for distribution.' : 'No verified orders ready for dispatch.'}</p>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign Courier Tracking"
      >
        <form onSubmit={handleSaveTracking} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter the tracking identifier for <strong className="text-foreground">#{(activeOrderId || '').replace('ORD-', '')}</strong>. 
              This will enable the final dispatch action.
            </p>
          </div>
          <Input
            label="Courier Tracking ID"
            placeholder="e.g. S-FAST-9921102"
            value={trackingIdInput}
            onChange={e => setTrackingIdInput(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Discard
            </Button>
            <Button type="submit" variant="primary">
              Assign Identifier
            </Button>
          </div>
        </form>
      </Modal>

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

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allOrders={courierQueue}
        selectedOrderIds={[]}
        currentFilters={{ searchTerm, dateFilter }}
      />

      {ConfirmDialogComponent}
    </motion.div>
  );
};
