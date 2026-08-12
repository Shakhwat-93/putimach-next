'use client';
// src/views/TrackOrder.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Package, MapPin, Truck, CheckCircle2, AlertTriangle, 
  ClipboardList, Factory, Send, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim() && !phone.trim()) {
      setError('Please enter either an Order ID or Phone Number.');
      return;
    }

    setLoading(true);
    setError('');
    setOrders([]);
    setExpandedOrderId(null);

    try {
      let query = supabase.from('orders').select('*');

      if (orderId.trim() && phone.trim()) {
        query = query.eq('id', orderId.trim()).eq('phone', phone.trim());
      } else if (orderId.trim()) {
        query = query.eq('id', orderId.trim());
      } else {
        query = query.eq('phone', phone.trim());
      }

      const { data, error: dbError } = await query
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        setError('No order found with the provided details. Please check and try again.');
      } else {
        setOrders(data);
        setExpandedOrderId(data[0].id);
      }
    } catch (err) {
      console.error('Tracking error:', err);
      setError('Failed to fetch order status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive Admin Panel Status Mapping
  const getStatusProgress = (targetOrder) => {
    if (!targetOrder) return null;
    const rawStatus = (targetOrder.status || 'New').trim();
    const normalized = rawStatus.toLowerCase();

    if (['cancelled', 'fake order', 'test', 'returned'].includes(normalized)) {
      return {
        step: -1,
        label: `Order Status: ${rawStatus}`,
        description: `This order is marked as ${rawStatus}. Please contact our support team if you believe this is an error.`
      };
    }

    if (['completed', 'delivered'].includes(normalized)) {
      return {
        step: 5,
        label: 'Delivered',
        description: 'Order completed and delivered successfully! Thank you for shopping with PutiMach.'
      };
    }

    if (['courier submitted', 'shipped', 'dispatched'].includes(normalized)) {
      return {
        step: 4,
        label: 'Shipped & Out for Delivery',
        description: `Your package is with courier. ${targetOrder.courier_name ? `Courier: ${targetOrder.courier_name}.` : ''} Waybill ID: ${targetOrder.tracking_id || 'In Transit'}`
      };
    }

    if (['bulk exported'].includes(normalized)) {
      return {
        step: 3,
        label: 'Packaging Complete (Ready for Courier)',
        description: 'Factory processing finished. Package is staged for courier collection.'
      };
    }

    if (['factory processing'].includes(normalized)) {
      return {
        step: 3,
        label: 'Factory Processing & Production',
        description: 'Your order is currently being printed, prepared, and packed at our factory facility.'
      };
    }

    if (['confirmed'].includes(normalized)) {
      return {
        step: 2,
        label: 'Order Confirmed',
        description: 'Your order has been verified and queued for factory processing.'
      };
    }

    if (['pending call', 'final call pending'].includes(normalized)) {
      return {
        step: 1,
        label: 'Pending Call Verification',
        description: 'Our customer care team is calling you shortly to confirm your order details.'
      };
    }

    // Default 'New'
    return {
      step: 1,
      label: 'Order Placed',
      description: 'We have received your order. A team member will call you shortly to confirm.'
    };
  };

  const getStatusBadgeStyle = (statusStr) => {
    const norm = String(statusStr || '').toLowerCase();
    if (['completed', 'delivered'].includes(norm)) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    if (['cancelled', 'fake order', 'test', 'returned'].includes(norm)) {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (['factory processing', 'bulk exported'].includes(norm)) {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    if (['courier submitted', 'shipped', 'dispatched'].includes(norm)) {
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    }
    return 'bg-brand/10 text-brand border border-brand/20';
  };

  return (
    <div className="min-h-screen relative pt-24 pb-16">
      {/* Background glow decorations */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-orange-950/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container-site relative z-10 max-w-3xl">
        
        {/* Page Header */}
        <div className="text-center mb-10">
          <p className="section-label mb-2">Real-Time Order Tracker</p>
          <h1 className="font-black text-3xl sm:text-4xl text-surface-primary">Track Your Order</h1>
          <p className="text-surface-secondary text-sm sm:text-base mt-2 max-w-md mx-auto">
            Enter your Order ID or Phone Number to view live status updates from our fulfillment system.
          </p>
        </div>

        {/* Tracking Search Form */}
        <div className="glass-dark p-6 sm:p-8 rounded-xl shadow-glass mb-8">
          <form onSubmit={handleTrack} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="orderId" className="block text-xs font-bold text-surface-secondary mb-2 uppercase tracking-wider">
                  Order ID / Number
                </label>
                <div className="relative">
                  <ClipboardList size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-muted" />
                  <input
                    type="text"
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. RR-MSQ742A0-351"
                    className="input pl-10 w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-surface-secondary mb-2 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm flex gap-2 items-start"
              >
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 font-bold transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Fetching Status...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Track Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Real-time Order Results */}
        <AnimatePresence mode="wait">
          {orders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center px-1 mb-2">
                <span className="text-xs font-bold text-surface-muted">
                  Found {orders.length} order{orders.length > 1 ? 's' : ''}
                </span>
              </div>

              {orders.map((ord) => {
                const isExpanded = expandedOrderId === ord.id;
                const statusInfo = getStatusProgress(ord);
                const orderDate = ord.created_at 
                  ? new Date(ord.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A';

                return (
                  <div 
                    key={ord.id}
                    className={`glass-dark rounded-xl border transition-all duration-300 overflow-hidden ${
                      isExpanded ? 'border-brand/35 shadow-glow-sm' : 'border-base-800 hover:border-brand/20'
                    }`}
                  >
                    {/* Collapsible Accordion Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                      className="w-full text-left p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-base-950/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isExpanded ? 'bg-brand/10 text-brand' : 'bg-base-800 text-surface-muted'
                        }`}>
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-surface-primary flex items-center gap-2">
                            <span>{ord.id}</span>
                            <span className="text-[10px] font-bold text-surface-muted">· {orderDate}</span>
                          </h3>
                          <p className="text-xs text-surface-secondary mt-0.5">
                            Recipient: {ord.customer_name} ({ord.phone})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-surface-muted">Amount</p>
                          <p className="text-sm font-black text-brand">৳ {ord.amount?.toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${getStatusBadgeStyle(ord.status)}`}>
                          {ord.status || 'New'}
                        </span>
                      </div>
                    </button>

                    {/* Expandable Content Container */}
                    {isExpanded && statusInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-base-800 p-5 sm:p-6 space-y-6 bg-base-950/15"
                      >
                        {/* Status Description Box */}
                        <div className="bg-base-900/60 p-4 rounded-xl border border-base-800/80">
                          <h4 className="font-bold text-sm sm:text-base text-surface-primary flex items-center gap-2">
                            <span>Current Status:</span>
                            <span className="text-brand font-black">{statusInfo.label}</span>
                          </h4>
                          <p className="text-surface-secondary text-xs sm:text-sm mt-1 leading-relaxed">
                            {statusInfo.description}
                          </p>
                        </div>

                        {/* Progress bar timeline (5 steps) */}
                        {statusInfo.step > 0 && (
                          <div className="pt-2 pb-4">
                            <div className="relative flex justify-between items-center max-w-lg mx-auto px-2">
                              {/* Connection Line */}
                              <div className="absolute left-6 right-6 h-1 bg-base-800 -z-10 top-4" />
                              <div
                                className="absolute left-6 h-1 bg-brand -z-10 transition-all duration-500 top-4"
                                style={{ width: `${((Math.min(5, statusInfo.step) - 1) / 4) * 88}%` }}
                              />

                              {/* Step 1: Placed */}
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  statusInfo.step >= 1 ? 'bg-brand text-white shadow-glow-sm scale-105' : 'bg-base-800 text-surface-muted'
                                }`}>
                                  <ClipboardList size={14} />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-bold text-surface-secondary mt-2">Placed</span>
                              </div>

                              {/* Step 2: Confirmed */}
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  statusInfo.step >= 2 ? 'bg-brand text-white shadow-glow-sm scale-105' : 'bg-base-800 text-surface-muted'
                                }`}>
                                  <ShieldCheck size={14} />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-bold text-surface-secondary mt-2">Confirmed</span>
                              </div>

                              {/* Step 3: Factory */}
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  statusInfo.step >= 3 ? 'bg-brand text-white shadow-glow-sm scale-105' : 'bg-base-800 text-surface-muted'
                                }`}>
                                  <Factory size={14} />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-bold text-surface-secondary mt-2">Factory</span>
                              </div>

                              {/* Step 4: Shipped */}
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  statusInfo.step >= 4 ? 'bg-brand text-white shadow-glow-sm scale-105' : 'bg-base-800 text-surface-muted'
                                }`}>
                                  <Truck size={14} />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-bold text-surface-secondary mt-2">Shipped</span>
                              </div>

                              {/* Step 5: Delivered */}
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  statusInfo.step >= 5 ? 'bg-emerald-500 text-white shadow-glow-sm scale-105' : 'bg-base-800 text-surface-muted'
                                }`}>
                                  <CheckCircle2 size={14} />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-bold text-surface-secondary mt-2">Delivered</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Order Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Items Summary Card */}
                          <div className="glass-dark-accent p-4 rounded-xl border border-base-800/50 space-y-4">
                            <h4 className="font-bold text-xs text-surface-secondary uppercase tracking-wider border-b border-base-800 pb-2">
                              Ordered Items
                            </h4>
                            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                              {ord.ordered_items && ord.ordered_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-3">
                                    {item.image && (
                                      <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-base-800" />
                                    )}
                                    <div>
                                      <p className="font-bold text-surface-primary line-clamp-1">{item.name}</p>
                                      <p className="text-surface-muted text-xs">
                                        Size: {item.size || 'N/A'}{item.color && item.color !== 'None' ? ` / Color: ${item.color}` : ''} × {item.quantity}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="font-bold text-surface-primary">৳ {item.line_total?.toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Delivery Address & Logistics */}
                          <div className="glass-dark-accent p-4 rounded-xl border border-base-800/50 space-y-4 text-sm">
                            <h4 className="font-bold text-xs text-surface-secondary uppercase tracking-wider border-b border-base-800 pb-2">
                              Delivery & Logistics
                            </h4>
                            <div className="space-y-4">
                              <div className="flex gap-3 items-start">
                                <MapPin size={16} className="text-brand flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-surface-muted text-xs">Address</p>
                                  <p className="font-medium text-surface-primary mt-0.5">{ord.address}</p>
                                </div>
                              </div>

                              <div className="flex gap-3 items-start">
                                <Truck size={16} className="text-brand flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-surface-muted text-xs">Courier Service</p>
                                  <p className="font-medium text-surface-primary mt-0.5">
                                    {ord.courier_name ? `${ord.courier_name} (${ord.courier_status || 'In Transit'})` : 'Awaiting courier assignment'}
                                  </p>
                                  {ord.tracking_id && (
                                    <p className="text-surface-secondary text-xs mt-1">Waybill: <code className="font-mono text-brand bg-brand/5 px-1.5 py-0.5 rounded border border-brand/10">{ord.tracking_id}</code></p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
