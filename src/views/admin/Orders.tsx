'use client';
// @ts-nocheck
// src/pages/admin/Orders.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ShoppingBag, RefreshCw, ChevronDown, Phone, MapPin, Package, Edit2, Trash2, X, Save, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const formatPrice = (p) => `৳${Number(p).toLocaleString('en-BD')}`;

function getOrderEmail(order) {
  if (order.email) return order.email;
  if (order.note && order.note.startsWith('[Email: ')) {
    const match = order.note.match(/^\[Email:\s*([^\]]+)\]/);
    if (match) return match[1];
  }
  return null;
}

function getCleanNote(note) {
  if (!note) return null;
  if (note.startsWith('[Email: ')) {
    return note.replace(/^\[Email:\s*([^\]]+)\]\s*\n?/, '');
  }
  return note;
}

const statusConfig = {
  pending:    { cls: 'badge-warning',  label: 'Pending',    next: 'processing' },
  processing: { cls: 'badge-brand',    label: 'Processing', next: 'shipped' },
  shipped:    { cls: 'badge-brand',    label: 'Shipped',    next: 'delivered' },
  delivered:  { cls: 'badge-success',  label: 'Delivered',  next: null },
  cancelled:  { cls: 'badge-danger',   label: 'Cancelled',  next: null },
};

const statusTabs = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Expandable order row for desktop */
function OrderRow({ order, index, onStatusChange, onEditClick, onDeleteClick, onPrintClick, deletingId }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const s = statusConfig[order.status] || statusConfig.pending;
  const items = Array.isArray(order.items) ? order.items : [];

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      onStatusChange(order.id, newStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        className="cursor-pointer"
        onClick={() => setExpanded(p => !p)}
      >
        <td className="font-mono text-[10px] text-brand font-black">{order.order_number}</td>
        <td>
          <p className="font-bold text-xs text-surface-primary">{order.name}</p>
          <p className="text-[10px] text-surface-muted">{order.phone}</p>
          {getOrderEmail(order) && (
            <p className="text-[10px] text-brand/90 font-mono mt-0.5 break-all max-w-[150px]">{getOrderEmail(order)}</p>
          )}
        </td>
        <td>
          <p className="text-xs text-surface-primary">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          <p className="text-[10px] text-surface-muted line-clamp-1">{items.map(i => i.name).join(', ')}</p>
        </td>
        <td className="font-black text-xs text-brand">{formatPrice(order.total)}</td>
        <td>
          <select
            value={order.status}
            onClick={e => e.stopPropagation()}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updating}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer appearance-none bg-transparent disabled:opacity-50 ${
              order.status === 'delivered' ? 'text-emerald-400 border-emerald-500/30' :
              order.status === 'cancelled' ? 'text-red-400 border-red-500/30' :
              order.status === 'pending'   ? 'text-amber-400 border-amber-500/30' :
              'text-brand border-brand/30'
            }`}
          >
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k} className="bg-base-600 text-surface-primary">{v.label}</option>
            ))}
          </select>
        </td>
        <td className="text-xs text-surface-secondary">{order.city}</td>
        <td className="text-[10px] text-surface-muted whitespace-nowrap">{formatDate(order.created_at)}</td>
        <td>
          <ChevronDown size={14} className={`text-surface-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </td>
      </motion.tr>

      {/* Expanded order detail */}
      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <td colSpan={8} className="px-4 pb-4 pt-0 bg-base-500/30">
              <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-base-300/40">
                {/* Items */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-surface-muted mb-2">Items Ordered</p>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        {item.image && (
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-base-500 flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-surface-primary line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-surface-muted">
                            Size: {item.size}{item.color && item.color !== 'None' ? ` · Color: ${item.color}` : ''} · Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-black text-brand flex-shrink-0">{formatPrice(item.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery + Totals */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-surface-muted mb-1.5">Delivery Address</p>
                      <p className="text-xs text-surface-secondary">{order.address}</p>
                      <p className="text-xs text-surface-muted">{order.city}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-surface-muted mb-1.5">Customer Info</p>
                      <p className="text-xs text-surface-secondary">Phone: <span className="font-mono">{order.phone}</span></p>
                      {getOrderEmail(order) && (
                        <p className="text-xs text-surface-secondary mt-0.5">Email: <span className="font-mono text-brand break-all">{getOrderEmail(order)}</span></p>
                      )}
                    </div>
                  </div>
                  {getCleanNote(order.note) && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-surface-muted mb-1">Note</p>
                      <p className="text-xs text-surface-secondary italic">"{getCleanNote(order.note)}"</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-base-300/40 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-muted">Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-muted">Shipping</span>
                      <span>{formatPrice(order.shipping)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black">
                      <span>Total</span>
                      <span className="text-brand">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                  {/* Action Bar */}
                  <div className="flex items-center gap-2 pt-3 border-t border-base-300/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintClick(order);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white transition-all duration-200 text-[10px] font-bold"
                    >
                      <Printer size={11} />
                      Print Invoice
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick(order);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/30 text-brand bg-brand/5 hover:bg-brand hover:text-white transition-all duration-200 text-[10px] font-bold"
                    >
                      <Edit2 size={11} />
                      Edit Details
                    </button>
                    <button
                      disabled={deletingId === order.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick(order.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all duration-200 text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === order.id ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={11} />
                          Delete Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* Mobile order card */
function OrderCard({ order, index, onStatusChange, onEditClick, onDeleteClick, onPrintClick, deletingId }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const s = statusConfig[order.status] || statusConfig.pending;
  const items = Array.isArray(order.items) ? order.items : [];

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      onStatusChange(order.id, newStatus);
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card overflow-hidden"
    >
      <div className="p-3 space-y-2.5" onClick={() => setExpanded(p => !p)}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-brand font-black">{order.order_number}</span>
          <div className="flex items-center gap-2">
            <span className={`badge text-[10px] ${s.cls}`}>{s.label}</span>
            <ChevronDown size={13} className={`text-surface-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-surface-primary">{order.name}</p>
            <p className="text-[10px] text-surface-muted flex items-center gap-1 mt-0.5">
              <Phone size={9} />{order.phone}
            </p>
          </div>
          <p className="text-sm font-black text-brand">{formatPrice(order.total)}</p>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-base-300/50">
          <p className="text-[10px] text-surface-muted flex items-center gap-1">
            <MapPin size={9} />{order.city}
          </p>
          <p className="text-[10px] text-surface-muted">{formatDate(order.created_at)}</p>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 border-t border-base-300/50 space-y-3">
              {/* Items */}
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {item.image && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-base-500 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-surface-primary line-clamp-1">{item.name}</p>
                      <p className="text-[9px] text-surface-muted">
                        Sz {item.size}{item.color && item.color !== 'None' ? ` · Clr ${item.color}` : ''} · ×{item.quantity}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-brand">{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>

              {getOrderEmail(order) && (
                <p className="text-[10px] text-brand/90 font-mono">Email: {getOrderEmail(order)}</p>
              )}

              {order.address && (
                <p className="text-[10px] text-surface-muted">{order.address}, {order.city}</p>
              )}

              {getCleanNote(order.note) && (
                <p className="text-[10px] text-surface-muted italic">Note: "{getCleanNote(order.note)}"</p>
              )}

              {/* Status changer */}
              <div>
                <p className="text-[10px] text-surface-muted mb-1">Change Status</p>
                <select
                  value={order.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className="input text-xs h-8 py-0 px-2"
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-base-300/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrintClick(order);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white transition-all duration-200 text-[10px] font-bold"
                >
                  <Printer size={11} />
                  Print
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(order);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-brand/30 text-brand bg-brand/5 hover:bg-brand hover:text-white transition-all duration-200 text-[10px] font-bold"
                >
                  <Edit2 size={11} />
                  Edit
                </button>
                <button
                  disabled={deletingId === order.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(order.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all duration-200 text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingId === order.id ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={11} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* Edit Order Modal Component */
function EditOrderModal({ order, onClose, onSave }) {
  const [form, setForm] = useState({
    name: order.name || '',
    phone: order.phone || '',
    email: getOrderEmail(order) || '',
    city: order.city || '',
    address: order.address || '',
    note: getCleanNote(order.note) || '',
    shipping: order.shipping || 0,
    subtotal: order.subtotal || 0,
  });
  const [saving, setSaving] = useState(false);

  const total = Number(form.subtotal) + Number(form.shipping);

  const setField = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(order.id, form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg glass-dark border border-base-300 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-base-300/40 mb-4">
          <div>
            <h3 className="font-black text-sm text-surface-primary uppercase tracking-wider flex items-center gap-1.5">
              <Edit2 size={14} className="text-brand" />
              Edit Order Details
            </h3>
            <p className="text-[10px] text-surface-muted font-mono mt-0.5">{order.order_number}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-base-500/50 text-surface-secondary hover:text-surface-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Customer Name</label>
              <input required type="text" className="input text-xs" value={form.name} onChange={setField('name')} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Phone Number</label>
              <input required type="text" className="input text-xs" value={form.phone} onChange={setField('phone')} />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Email Address</label>
            <input type="email" className="input text-xs" value={form.email} onChange={setField('email')} placeholder="customer@email.com" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">City / District</label>
              <input required type="text" className="input text-xs" value={form.city} onChange={setField('city')} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Subtotal (৳)</label>
              <input required type="number" min="0" className="input text-xs font-mono" value={form.subtotal} onChange={setField('subtotal')} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Shipping (৳)</label>
              <input required type="number" min="0" className="input text-xs font-mono" value={form.shipping} onChange={setField('shipping')} />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Shipping Address</label>
            <textarea required rows={2} className="input text-xs resize-none" value={form.address} onChange={setField('address')} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-surface-secondary block mb-1">Order Note</label>
            <textarea rows={2} className="input text-xs resize-none" value={form.note} onChange={setField('note')} />
          </div>

          {/* Totals Preview */}
          <div className="p-3.5 rounded-xl bg-base-950/80 border border-base-300/40 flex items-center justify-between text-xs font-black">
            <span className="text-surface-secondary">Calculated Total</span>
            <span className="text-brand text-sm">৳{total.toLocaleString('en-BD')}</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-base-300/40">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold bg-base-500/50 hover:bg-base-500 text-surface-primary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-brand hover:bg-brand-400 text-white shadow-glow transition-all duration-200 disabled:opacity-50">
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={12} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setOrders(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusChange = (id, newStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Please allow popups to print invoices.");
      return;
    }
    
    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const items = Array.isArray(order.items) ? order.items : [];
    const formatTk = (val) => `Tk ${Number(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const orderNum = order.order_number || `#${order.id}`;
    const cleanAddr = order.address || '';
    const cleanCity = order.city || '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${orderNum}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #000;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .header-meta {
      text-align: right;
    }
    .header-meta .order-num {
      font-size: 13px;
      font-weight: bold;
      margin: 0;
    }
    .header-meta .date {
      color: #333;
      font-size: 11px;
      margin-top: 3px;
    }
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1.2fr;
      gap: 24px;
      margin-bottom: 30px;
    }
    .address-col h3 {
      font-size: 11px;
      font-weight: bold;
      margin: 0 0 6px 0;
      text-transform: capitalize;
    }
    .address-col p {
      margin: 0;
      color: #000;
      white-space: pre-wrap;
    }
    hr {
      border: none;
      border-top: 1.5px solid #000;
      margin: 0 0 20px 0;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    th, td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 0.5px solid #ddd;
    }
    th {
      font-weight: bold;
      border-top: 0.5px solid #000;
      border-bottom: 0.5px solid #000;
      text-transform: capitalize;
    }
    .align-right {
      text-align: right;
    }
    .align-center {
      text-align: center;
    }
    
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .totals-table td {
      padding: 6px 10px;
      border-bottom: 0.5px solid #eee;
    }
    .totals-table tr.total-row td {
      border-top: 1px solid #000;
      border-bottom: 1.5px solid #000;
      font-weight: bold;
    }
    .totals-table tr.outstanding-row td {
      border-bottom: 2px double #000;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      font-size: 10px;
      color: #000;
      border-top: 0.5px solid #ddd;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Invoice</h1>
    <div class="header-meta">
      <p class="order-num">${orderNum.startsWith('Order #') ? orderNum : `Order #${orderNum}`}</p>
      <p class="date">${orderDate}</p>
    </div>
  </div>

  <div class="addresses">
    <div class="address-col">
      <h3>From</h3>
      <p><strong>Rust & Revive</strong></p>
      <p>205, New Paltan Line, Azimpur</p>
      <p>Dhaka 1205</p>
      <p>Bangladesh</p>
      <p>+8801340185659</p>
    </div>
    
    <div class="address-col">
      <h3>Bill to</h3>
      <p><strong>${order.name}</strong></p>
      <p>${cleanAddr}</p>
      <p>${cleanCity}</p>
      <p>Bangladesh</p>
    </div>
    
    <div class="address-col">
      <h3>Ship to</h3>
      <p><strong>${order.name}</strong></p>
      <p>${cleanAddr}</p>
      <p>${cleanCity}</p>
      <p>Bangladesh</p>
      <p>${order.phone}</p>
    </div>
  </div>

  <hr />

  <p class="section-title">Order Details</p>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Qty</th>
        <th style="width: 70%;">Item</th>
        <th style="width: 20%;" class="align-right">Price</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.quantity}</td>
          <td>${item.name} ${item.size ? `- ${item.size}` : ''}</td>
          <td class="align-right">${formatTk(item.price)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-container">
    <table class="totals-table">
      <tbody>
        <tr>
          <td>Subtotal</td>
          <td class="align-right">${formatTk(order.subtotal)}</td>
        </tr>
        <tr>
          <td>Tax</td>
          <td class="align-right">${formatTk(0)}</td>
        </tr>
        <tr>
          <td>Shipping</td>
          <td class="align-right">${formatTk(order.shipping)}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="align-right">${formatTk(order.total)}</td>
        </tr>
        <tr>
          <td>Total Paid</td>
          <td class="align-right">${formatTk(0)}</td>
        </tr>
        <tr class="outstanding-row">
          <td>Outstanding Amount</td>
          <td class="align-right" style="font-weight: 850;">${formatTk(order.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    If you have any questions, please send an email to <strong>rustandrevive@gmail.com</strong>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const { error: dbError } = await supabase.from('orders').delete().eq('id', id);
      if (dbError) throw dbError;
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete order: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveOrder = async (id, updatedForm) => {
    const payload = {
      name: updatedForm.name.trim(),
      phone: updatedForm.phone.trim(),
      email: updatedForm.email.trim() || null,
      city: updatedForm.city.trim(),
      address: updatedForm.address.trim(),
      note: updatedForm.note.trim() || null,
      shipping: Number(updatedForm.shipping),
      subtotal: Number(updatedForm.subtotal),
      total: Number(updatedForm.subtotal) + Number(updatedForm.shipping),
    };

    let { error: dbError } = await supabase.from('orders').update(payload).eq('id', id);

    // Fallback logic for missing email column:
    if (dbError && (dbError.message?.toLowerCase().includes('email') || dbError.code === 'PGRST204')) {
      console.warn('Orders table does not support email column. Retrying with email in notes...');
      const fallbackPayload = { ...payload };
      delete fallbackPayload.email;
      fallbackPayload.note = `[Email: ${payload.email || ''}]` + (payload.note ? `\n${payload.note}` : '');
      
      const { error: retryError } = await supabase.from('orders').update(fallbackPayload).eq('id', id);
      dbError = retryError;
    }

    if (dbError) {
      alert("Failed to save changes: " + dbError.message);
      throw new Error(dbError.message);
    }

    // Update local state:
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          ...payload,
          note: dbError ? `[Email: ${payload.email || ''}]` + (payload.note ? `\n${payload.note}` : '') : payload.note
        };
      }
      return o;
    }));
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search) ||
      o.city?.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'All' || o.status === activeTab.toLowerCase();
    return matchSearch && matchTab;
  });

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);

  const tabCount = (tab) => tab === 'All'
    ? orders.length
    : orders.filter(o => o.status === tab.toLowerCase()).length;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg">Orders</h2>
          <p className="text-surface-muted text-xs mt-0.5">
            {loading ? 'Loading...' : `${orders.length} total · ${formatPrice(totalRevenue)} revenue`}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-muted hover:text-brand hover:bg-brand/10 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error} — Make sure the <code className="font-mono bg-red-500/10 px-1 rounded">orders</code> table exists in Supabase.
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === tab ? 'bg-brand text-white shadow-glow-sm' : 'glass text-surface-secondary hover:text-surface-primary'
            }`}
          >
            {tab} <span className="opacity-50 font-normal ml-0.5">{tabCount(tab)}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input
          type="text"
          placeholder="Search by name, phone, order no, city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-8 text-xs h-9 w-full"
          id="orders-search"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="card py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="text-brand animate-spin" />
          <p className="text-surface-muted text-xs">Loading orders from Supabase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 flex flex-col items-center justify-center gap-3">
          <ShoppingBag size={28} className="text-surface-muted" />
          <p className="text-surface-muted text-xs">
            {orders.length === 0 ? 'No orders yet. Orders will appear here after customers checkout.' : 'No orders match your filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onStatusChange={handleStatusChange} onEditClick={setEditingOrder} onDeleteClick={handleDeleteOrder} onPrintClick={handlePrintInvoice} deletingId={deletingId} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order No.</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>City</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <OrderRow key={order.id} order={order} index={i} onStatusChange={handleStatusChange} onEditClick={setEditingOrder} onDeleteClick={handleDeleteOrder} onPrintClick={handlePrintInvoice} deletingId={deletingId} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveOrder}
        />
      )}
    </div>
  );
}
