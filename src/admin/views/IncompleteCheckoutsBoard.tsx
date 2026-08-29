'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, AlertCircle, CheckCircle2, Clock, 
  Search, RefreshCw, Filter, Phone, Mail, MapPin, 
  ArrowUpRight, ExternalLink, MessageCircle, X, 
  ChevronRight, ArrowUpDown, DollarSign, User, Package,
  Trash2, Download, AlertTriangle, Eye, Sparkles
} from 'lucide-react';
import { getIncompleteCheckouts, IncompleteCheckoutRecord } from '@/lib/checkout/session';
import { supabase } from '../lib/supabase';
import { formatPrice } from '@/lib/utils';
import { cn } from '../lib/utils';
import Swal from 'sweetalert2';

export default function IncompleteCheckoutsBoard() {
  const [checkouts, setCheckouts] = useState<IncompleteCheckoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<IncompleteCheckoutRecord | null>(null);

  const fetchRecords = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await getIncompleteCheckouts({
        status: statusFilter,
        searchQuery: searchQuery
      });
      setCheckouts(data || []);
    } catch (err) {
      console.error('Failed to load incomplete checkouts:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(true);

    const channel = supabase
      .channel('incomplete-checkouts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incomplete_checkouts' },
        () => {
          fetchRecords(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = checkouts.length;
    const abandoned = checkouts.filter(c => c.status === 'ABANDONED');
    const inProgress = checkouts.filter(c => c.status === 'IN_PROGRESS');
    const converted = checkouts.filter(c => c.status === 'CONVERTED');

    const totalLostRevenue = abandoned.reduce((sum, c) => sum + (Number(c.estimated_total) || 0), 0);
    const convertedRevenue = converted.reduce((sum, c) => sum + (Number(c.estimated_total) || 0), 0);
    const recoveryRate = totalCount > 0 ? Math.round((converted.length / totalCount) * 100) : 0;

    return {
      totalCount,
      abandonedCount: abandoned.length,
      inProgressCount: inProgress.length,
      convertedCount: converted.length,
      totalLostRevenue,
      convertedRevenue,
      recoveryRate
    };
  }, [checkouts]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ABANDONED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
            <AlertTriangle size={11} className="shrink-0" />
            <span>Abandoned</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
            <Clock size={11} className="shrink-0 animate-spin" />
            <span>In Progress</span>
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 size={11} className="shrink-0" />
            <span>Converted</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const formatActivityTime = (isoString: string) => {
    if (!isoString) return 'Unknown';
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleSendWhatsApp = (record: IncompleteCheckoutRecord) => {
    const raw = String(record.customer_phone || '').replace(/[^0-9]/g, '');
    if (!raw) {
      Swal.fire({ title: 'No Phone Number', text: 'This checkout attempt does not have a valid phone number.', icon: 'info' });
      return;
    }
    const clean = raw.startsWith('880') ? raw : raw.startsWith('0') ? `88${raw}` : `880${raw}`;
    const name = record.customer_name || 'Customer';
    const itemsCount = Array.isArray(record.cart_snapshot) ? record.cart_snapshot.length : 1;
    const msg = encodeURIComponent(`Hi ${name}! We noticed you left ${itemsCount} item(s) in your cart at PutiMach. Would you like assistance completing your order today?`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-16">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                Incomplete Checkouts
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track, analyze, and recover customers who initiated checkout without placing an order.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={cn(loading ? "animate-spin" : "")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Abandoned Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Lost Revenue</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
              <AlertTriangle size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatPrice(metrics.totalLostRevenue)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            From {metrics.abandonedCount} abandoned checkouts
          </p>
        </div>

        {/* In-Progress Sessions */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>In Progress</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
              <Clock size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {metrics.inProgressCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Active within last 30 minutes
          </p>
        </div>

        {/* Recovered Orders */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Recovered Orders</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {metrics.convertedCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatPrice(metrics.convertedRevenue)} recovered
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Conversion Rate</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {metrics.recoveryRate}%
          </p>
          <p className="text-[11px] text-muted-foreground">
            {metrics.totalCount} total captured attempts
          </p>
        </div>

      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'ABANDONED', label: 'Abandoned' },
            { key: 'IN_PROGRESS', label: 'In Progress' },
            { key: 'CONVERTED', label: 'Converted' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

      </div>

      {/* ── Incomplete Checkouts Table ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Cart Items</th>
                <th className="px-4 py-3.5">Estimated Total</th>
                <th className="px-4 py-3.5">Last Activity</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-primary" />
                      <span>Loading checkout records...</span>
                    </div>
                  </td>
                </tr>
              ) : checkouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
                      <ShoppingCart size={22} />
                    </div>
                    <p className="font-bold text-foreground">No incomplete checkouts found</p>
                    <p className="text-xs max-w-sm mx-auto">
                      When customers start checkout and provide contact details without ordering, they will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                checkouts.map((record) => {
                  const itemsCount = Array.isArray(record.cart_snapshot) 
                    ? record.cart_snapshot.reduce((s, i) => s + (Number(i.quantity) || 1), 0)
                    : 1;

                  return (
                    <tr 
                      key={record.id || record.checkout_session_id} 
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRecord(record)}
                    >
                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {record.customer_name || 'Guest Customer'}
                        </div>
                        {record.city && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            <span>{record.city}</span>
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-semibold text-foreground">
                          {record.customer_phone || '—'}
                        </div>
                        {record.customer_email && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                            {record.customer_email}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px]">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                          </span>
                          {record.cart_snapshot?.[0]?.name && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                              {record.cart_snapshot[0].name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estimated Total */}
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        {formatPrice(record.estimated_total || 0)}
                      </td>

                      {/* Last Activity */}
                      <td className="px-4 py-3.5 text-muted-foreground text-[11px]">
                        {formatActivityTime(record.last_activity_at || record.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {getStatusBadge(record.status)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {record.customer_phone && record.status === 'ABANDONED' && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(record)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer"
                              title="Send WhatsApp recovery message"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Slide-Over Detail Drawer ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-card border-l border-border p-6 shadow-2xl overflow-y-auto space-y-6 flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">Checkout Attempt</h3>
                  {getStatusBadge(selectedRecord.status)}
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  ID: #{selectedRecord.checkout_session_id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversion Banner if Converted */}
            {selectedRecord.status === 'CONVERTED' && selectedRecord.converted_order_id && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Successfully converted to <strong>Order #{selectedRecord.converted_order_id}</strong></span>
                </div>
                <a
                  href={`/admin/orders`}
                  className="font-bold underline hover:text-emerald-900 dark:hover:text-white inline-flex items-center gap-1 shrink-0"
                >
                  <span>View</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* Customer Details Card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Customer Information
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-bold text-foreground">{selectedRecord.customer_name || 'Not provided'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-mono font-bold text-foreground">{selectedRecord.customer_phone || 'Not provided'}</span>
                </div>

                {selectedRecord.customer_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-semibold text-foreground">{selectedRecord.customer_email}</span>
                  </div>
                )}

                {selectedRecord.shipping_address && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground block mb-0.5">Shipping Address:</span>
                    <p className="text-foreground font-medium leading-relaxed">{selectedRecord.shipping_address}</p>
                  </div>
                )}
              </div>

              {/* Quick Contact Actions */}
              {selectedRecord.customer_phone && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(selectedRecord)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp Customer</span>
                  </button>

                  <a
                    href={`tel:${selectedRecord.customer_phone}`}
                    className="py-2 px-3 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone size={14} />
                    <span>Call</span>
                  </a>
                </div>
              )}
            </div>

            {/* Cart Items Snapshot */}
            <div className="space-y-3 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cart Items Snapshot ({Array.isArray(selectedRecord.cart_snapshot) ? selectedRecord.cart_snapshot.length : 0})
              </h4>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {Array.isArray(selectedRecord.cart_snapshot) && selectedRecord.cart_snapshot.length > 0 ? (
                  selectedRecord.cart_snapshot.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-border bg-card flex items-center gap-3">
                      <div className="w-12 h-14 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
                        <img 
                          src={item.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-bold text-foreground truncate">{item.name || 'Product'}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Size: {item.size || 'Default'} {item.color && item.color !== 'None' ? `· Color: ${item.color}` : ''} · Qty: {item.quantity || 1}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-xs text-foreground shrink-0">
                        {formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No items recorded in snapshot.</p>
                )}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono text-foreground font-semibold">{formatPrice(selectedRecord.subtotal || 0)}</span>
              </div>

              {Number(selectedRecord.discount || 0) > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                  <span>Discount</span>
                  <span className="font-mono">- {formatPrice(selectedRecord.discount || 0)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Shipping Fee</span>
                <span className="font-mono text-foreground font-semibold">{formatPrice(selectedRecord.shipping_cost || 0)}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
                <span>Estimated Total</span>
                <span className="font-mono text-base">{formatPrice(selectedRecord.estimated_total || 0)}</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
