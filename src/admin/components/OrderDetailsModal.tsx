'use client';
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { 
  User, Phone, MapPin, Package, Calendar, Clock, 
  History, Edit2, X, Clipboard, Copy, ExternalLink, 
  Truck, CheckCircle2, AlertCircle, Info, RotateCcw, Loader2, Printer, Tag,
  Globe, Check
} from 'lucide-react';
import CurrencyIcon from './CurrencyIcon';
import api from '../lib/api';
import { useCourierRatio } from '../context/CourierRatioContext';
import { PrintStudioModal } from './PrintStudioModal';
import './OrderDetailsModal.css';

export const OrderDetailsModal = ({ isOpen, onClose, order, onEdit }) => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savedNotesOverride, setSavedNotesOverride] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'history'
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  
  // Note Quick Templates States
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('orderflow_custom_notes_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [newTemplateText, setNewTemplateText] = useState('');
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  const applyTemplate = (templateText) => {
    if (noteDraft.trim()) {
      setNoteDraft(prev => prev.trim() + '\n' + templateText);
    } else {
      setNoteDraft(templateText);
    }
  };

  const saveCustomTemplate = () => {
    if (!newTemplateText.trim()) return;
    const updated = [...customTemplates, newTemplateText.trim()];
    setCustomTemplates(updated);
    (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem('orderflow_custom_notes_templates', JSON.stringify(updated));
    setNewTemplateText('');
    setShowAddTemplate(false);
  };

  const deleteCustomTemplate = (indexToDelete, e) => {
    e.stopPropagation();
    const updated = customTemplates.filter((_, idx) => idx !== indexToDelete);
    setCustomTemplates(updated);
    (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem('orderflow_custom_notes_templates', JSON.stringify(updated));
  };

  // Inline field editing state
  const [editingField, setEditingField] = useState(null); // 'phone' | 'address' | 'delivery_charge'
  const [editValue, setEditValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [localOrder, setLocalOrder] = useState(null); // optimistic local update
  const copyTimeoutRef = useRef(null);
  const editInputRef = useRef(null);
  const { user, profile, userRoles } = useAuth();
  const { checkPhone, getRatio } = useCourierRatio();

  // Effective order = local override (optimistic) or prop
  const effectiveOrder = localOrder || order;

  const refreshLogs = async () => {
    if (!order?.id) return;
    setIsLoadingLogs(true);
    try {
      const logs = await api.getOrderActivity(order.id);
      setActivityLogs(logs || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen && order?.id) {
      // Track Recently Viewed for Premium Search
      const savedViewed = JSON.parse((typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('premium_search_viewed') || '[]');
      const newItem = { id: order.id, label: order.customer_name || 'Unnamed Order', sub: `#${order.id.replace('ORD-', '')}`, type: 'order' };
      const newViewed = [newItem, ...savedViewed.filter(item => item.id !== order.id)].slice(0, 10);
      (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem('premium_search_viewed', JSON.stringify(newViewed));
      setLocalOrder(null);
      setEditingField(null);
      setFieldError('');
      setActiveTab('details');
      refreshLogs();
    } else {
      setActivityLogs([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id]);

  useEffect(() => {
    setNoteDraft(String(order?.notes || ''));
    setSavedNotesOverride(null);
  }, [order?.id, order?.notes, isOpen]);

  useEffect(() => {
    if (isOpen && order?.phone) checkPhone(order.phone);
  }, [isOpen, order?.phone, checkPhone]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
  }, []);

  // Focus the edit input when a field opens
  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select?.();
    }
  }, [editingField]);

  if (!effectiveOrder) return null;

  // ── Inline field helpers ──────────────────────────────────────
  const openEdit = (field) => {
    const current = field === 'delivery_charge'
      ? String(Number(effectiveOrder?.delivery_charge) || Number(effectiveOrder?.pricing_summary?.delivery_charge) || 0)
      : String(effectiveOrder?.[field] || '');
    setEditingField(field);
    setEditValue(current);
    setFieldError('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setFieldError('');
  };

  const saveField = async () => {
    if (!effectiveOrder?.id || !user?.id) return;
    const trimmed = editValue.trim();
    if (!trimmed) { setFieldError('Value cannot be empty.'); return; }
    if (editingField === 'delivery_charge' && isNaN(Number(trimmed))) {
      setFieldError('Must be a valid number.'); return;
    }
    setIsSavingField(true);
    setFieldError('');
    try {
      const payload = editingField === 'delivery_charge'
        ? { delivery_charge: Number(trimmed) }
        : { [editingField]: trimmed };

      const userName = profile?.name || user?.email || 'Unknown User';
      await api.updateOrder(effectiveOrder.id, payload, user.id, userName, userRoles);

      // Optimistic local update so modal reflects change immediately
      setLocalOrder(prev => ({ ...(prev || effectiveOrder), ...payload }));
      setEditingField(null);
      setEditValue('');
      // Refresh activity log to show the new entry with user name
      await refreshLogs();
    } catch (err) {
      console.error('[OrderDetailsModal] saveField failed:', err);
      setFieldError(err.message || 'Save failed. Try again.');
    } finally {
      setIsSavingField(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && editingField !== 'address') saveField();
    if (e.key === 'Escape') cancelEdit();
  };

  /** Renders an editable info row */
  const EditableField = ({ field, label, icon: Icon, type = 'text', multiline = false }) => {
    const isEditing = editingField === field;
    const rawVal = field === 'delivery_charge'
      ? (Number(effectiveOrder?.delivery_charge) || Number(effectiveOrder?.pricing_summary?.delivery_charge) || null)
      : effectiveOrder?.[field];
    const displayVal = rawVal !== null && rawVal !== undefined && rawVal !== '' ? rawVal : '—';

    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 py-2.5 ${multiline ? 'items-start' : ''}`}>
        <span className="text-xs font-semibold text-muted-foreground shrink-0 sm:w-28">{label}</span>
        {isEditing ? (
          <div className="flex-1 w-full space-y-1.5">
            {multiline ? (
              <textarea
                ref={editInputRef}
                className="w-full rounded-lg border border-input bg-background p-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={isSavingField}
              />
            ) : (
              <input
                ref={editInputRef}
                type={type}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSavingField}
              />
            )}
            {fieldError && <span className="text-[11px] text-destructive block">{fieldError}</span>}
            <div className="flex items-center gap-1.5 justify-end">
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-bold bg-primary text-primary-foreground rounded-md shadow-2xs hover:bg-primary/90 transition-colors"
                onClick={saveField}
                disabled={isSavingField}
              >
                {isSavingField ? 'Saving...' : '✓ Save'}
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-semibold bg-secondary text-muted-foreground hover:text-foreground rounded-md transition-colors"
                onClick={cancelEdit}
                disabled={isSavingField}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
            {Icon && !multiline && <Icon size={13} className="text-muted-foreground shrink-0" />}
            <span className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-md">
              {field === 'delivery_charge' && rawVal !== null ? `৳${Number(rawVal).toLocaleString()}` : displayVal}
            </span>
            <button
              type="button"
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
              onClick={() => openEdit(field)}
              title={`Edit ${label}`}
            >
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const parseEmbeddedDeliveryCharge = (value) => {
    const text = String(value || '');
    const matches = [...text.matchAll(/(\d{2,5})/g)];
    if (matches.length === 0) return null;

    const parsed = Number(matches[matches.length - 1][1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const getCleanShippingZone = () => {
    const text = String(order.shipping_zone || '').trim();
    return text.replace(/\s*\([^)]*\d[^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || 'Delivery Zone';
  };

  const getStoredDeliveryCharge = () => {
    const embeddedCharge = parseEmbeddedDeliveryCharge(order.shipping_zone);
    if (embeddedCharge !== null) return embeddedCharge;

    const directCharge = Number(order.delivery_charge);
    if (Number.isFinite(directCharge) && directCharge > 0) return directCharge;

    const summaryCharge = Number(order.pricing_summary?.delivery_charge);
    if (Number.isFinite(summaryCharge) && summaryCharge > 0) return summaryCharge;

    return null;
  };

  const deliveryCharge = getStoredDeliveryCharge();
  const shippingZoneLabel = getCleanShippingZone();

  const getStatusVariant = (status) => {
    const s = String(status || '').toLowerCase();
    if (['confirmed', 'completed', 'delivered'].includes(s)) return 'success';
    if (s === 'bulk exported') return 'courier';
    if (['cancelled', 'returned', 'failed'].includes(s)) return 'danger';
    if (['pending', 'new', 'hold', 'pending call'].includes(s)) return 'warning';
    return 'neutral';
  };

  const getPaymentVariant = (status) => {
    const s = String(status || '').toLowerCase();
    if (['paid', 'success', 'completed'].includes(s)) return 'success';
    if (['failed', 'cancelled', 'refunded'].includes(s)) return 'danger';
    return 'warning';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyOrderId = () => {
    copyToClipboard(effectiveOrder.id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const ipAddress = typeof order.ip_address === 'string'
    ? order.ip_address.trim()
    : order.ip_address
      ? String(order.ip_address)
      : '';

  const visibleNotes = savedNotesOverride ?? order.notes ?? '';
  const courierRatioData = getRatio(order?.phone);
  const courierBreakdownRows = courierRatioData?.couriers && typeof courierRatioData.couriers === 'object'
    ? Object.entries(courierRatioData.couriers)
        .map(([key, value]) => {
          const source = value && typeof value === 'object' ? value : {};
          const total = Number(source.total_parcel ?? source.total ?? 0) || 0;
          const success = Number(source.success_parcel ?? source.success_count ?? source.success ?? 0) || 0;
          const cancelled = Number(source.cancelled_parcel ?? source.cancelled_count ?? source.cancelled ?? 0) || 0;
          const ratio = Number(source.success_ratio ?? source.ratio ?? 0) || 0;

          return {
            key,
            name: source.name || key,
            logo: source.logo || '',
            total,
            success,
            cancelled,
            ratio: Math.max(0, Math.min(100, ratio))
          };
        })
        .filter((row) => row.name)
        .sort((a, b) => {
          if (b.ratio !== a.ratio) return b.ratio - a.ratio;
          if (b.success !== a.success) return b.success - a.success;
          return b.total - a.total;
        })
    : [];

  const orderDateTime = order.created_at
    ? new Date(order.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'N/A';

  const productDetails = Array.isArray(order.order_lines_payload) && order.order_lines_payload.length > 0
    ? order.order_lines_payload.map((item) => ({
        name: item.product_name || 'Unknown Product',
        quantity: item.quantity || 1,
        size: item.size || '',
        color: item.color || item.color_name || '',
        sku: item.sku || '',
        price: Number(item.line_total ?? ((item.unit_price || 0) * (item.quantity || 1))) || 0
      }))
    : Array.isArray(order.ordered_items) && order.ordered_items.length > 0 && typeof order.ordered_items[0] === 'object'
      ? order.ordered_items.map((item) => ({
          name: item.name || item.product_name || 'Unknown Product',
          quantity: item.quantity || 1,
          size: item.size || '',
          color: item.color || item.color_name || '',
          sku: item.sku || '',
          image: item.image || item.image_url || '',
          price: Number((item.price || 0) * (item.quantity || 1)) || 0
        }))
      : [{
          name: order.product_name || 'Unknown Product',
          quantity: order.quantity || 1,
          size: order.size || '',
          color: order.color || '',
          sku: order.sku || '',
          price: Number(order.total || order.subtotal || order.amount || 0) || 0
        }];

  const copyOrderSummary = () => {
    const productLines = productDetails
      .map((item, index) => {
        const sizeLabel = item.size ? `, Size: ${item.size}` : '';
        const colorLabel = item.color ? `, Color: ${item.color}` : '';
        return `${index + 1}. ${item.name} x${item.quantity}${sizeLabel}${colorLabel}, Price: ${item.price.toLocaleString()}`;
      })
      .join('\n');

    const summaryText = [
      `Customer Name: ${order.customer_name || 'N/A'}`,
      `Phone: ${order.phone || 'N/A'}`,
      `Address: ${order.address || 'N/A'}`,
      `Amount: ${Number(order.total || order.subtotal || order.amount || 0).toLocaleString()}`,
      `Date: ${orderDateTime}`,
      'Product Details:',
      productLines
    ].join('\n');

    copyToClipboard(summaryText);
    setCopiedSummary(true);
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedSummary(false);
    }, 1800);
  };

  const saveOrderNote = async () => {
    if (!order?.id || !user?.id) return;
    const trimmedNote = String(noteDraft || '').trim();

    setIsSavingNote(true);
    try {
      const updatedOrder = await api.appendOrderNote(
        order.id,
        trimmedNote,
        user.id,
        profile?.name || user?.email || 'Unknown User',
        userRoles,
        'Order Note'
      );
      setSavedNotesOverride(updatedOrder?.notes || '');
      setNoteDraft(updatedOrder?.notes || '');
    } catch (error) {
      console.error('Failed to save order note:', error);
      alert(error.message || 'Failed to save note.');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order Details: #${effectiveOrder.id.replace('ORD-', '')}`}
      size="3xl"
      className="max-w-4xl xl:max-w-5xl w-full"
    >
      <div className="space-y-4 text-foreground">
        
        {/* ── 1. Top Tabs & Action Bar ── */}
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'details'
                  ? 'bg-primary/10 text-primary border border-primary/25 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
              onClick={() => setActiveTab('details')}
            >
              <User size={14} />
              <span>Details</span>
            </button>
            <button
              type="button"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-primary/10 text-primary border border-primary/25 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
              onClick={() => setActiveTab('history')}
            >
              <History size={14} />
              <span>History / Audit Trail ({activityLogs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPrintStudioOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
            title="Open Print Studio for Invoice or Sticker"
          >
            <Printer size={13} className="text-primary" />
            <span>Print / Invoice</span>
          </button>
        </div>

        {/* ── 2. Top Summary Row (Order Reference & Total Amount) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4">
          
          {/* Order Reference Card */}
          <div className="md:col-span-8 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-sans">
                Order Reference
              </span>
              <Badge variant={getStatusVariant(order.status)} className="font-bold text-xs uppercase px-2.5 py-0.5">
                {order.status || 'New'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black font-mono text-foreground tracking-tight">
                {order.id}
              </h3>
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Copy Order Reference"
              >
                {copiedOrderId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Quick Meta Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/40 font-medium text-muted-foreground text-[11px]">
                <Calendar size={12} className="text-muted-foreground" />
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/40 font-medium text-muted-foreground text-[11px]">
                <Clock size={12} className="text-muted-foreground" />
                <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 font-bold text-primary text-[11px]">
                <Globe size={12} />
                <span>{order.source || 'main website'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/40 font-semibold text-[11px]">
                <span className="text-muted-foreground">Payment:</span>
                <span className={order.payment_status === 'Paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  {order.payment_status === 'Paid' ? 'PAID' : (order.payment_status || 'UNPAID')}
                </span>
              </div>
            </div>
          </div>

          {/* Total Amount Focus Card */}
          <div className="md:col-span-4 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs flex flex-col justify-between text-right space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-sans">
              Total Amount
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-primary flex items-center justify-end gap-1">
              <CurrencyIcon size={22} className="currency-icon-elite" />
              <span>{Number(effectiveOrder.amount || effectiveOrder.total || 0).toLocaleString()}</span>
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              <span>{shippingZoneLabel}</span>
              {deliveryCharge > 0 && (
                <span className="text-foreground ml-1">(৳{deliveryCharge.toLocaleString()})</span>
              )}
            </div>
          </div>

        </div>

        {/* ── 3. Main Details Tab View ── */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            
            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Customer Information & Order Note */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/70">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
                    <User size={15} className="text-primary" />
                    <span>Customer Information</span>
                  </div>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      copiedSummary
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={copyOrderSummary}
                    title="Copy customer and order summary"
                  >
                    <Copy size={12} />
                    <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Key-Value Aligned Rows */}
                <div className="divide-y divide-border/60 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <span className="font-semibold text-muted-foreground">Name</span>
                    <span className="font-bold text-foreground">{effectiveOrder.customer_name || 'Guest Customer'}</span>
                  </div>

                  <EditableField field="phone" label="Phone" icon={Phone} type="tel" />

                  <div className="flex items-center justify-between py-2">
                    <span className="font-semibold text-muted-foreground">IP Address</span>
                    <span className={`font-mono ${ipAddress ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {ipAddress || 'Not captured'}
                    </span>
                  </div>

                  <EditableField field="address" label="Delivery Address" icon={MapPin} multiline />

                  <EditableField field="delivery_charge" label="Delivery Charge" icon={Truck} type="number" />
                </div>

                {/* Order Note Sub-Section */}
                <div className="pt-2 border-t border-border/70 space-y-2.5">
                  <span className="text-xs font-bold text-foreground block">Order Note</span>
                  
                  <textarea
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Product should be fresh and no defects..."
                    rows={3}
                  />

                  {/* Quick Templates */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      QUICK TEMPLATES (Click to add)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Customer busy — call after 30 mins",
                        "Wrong address — needs correction",
                        "Confirmed. Delivery before 7 PM"
                      ].map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                          onClick={() => applyTemplate(tpl)}
                        >
                          {tpl}
                        </button>
                      ))}

                      {/* Custom Saved Templates */}
                      {customTemplates.map((tpl, idx) => (
                        <button
                          key={`custom-${idx}`}
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-primary text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          onClick={() => applyTemplate(tpl)}
                        >
                          <span>{tpl}</span>
                          <span 
                            className="text-destructive font-bold text-xs hover:scale-125 transition-transform"
                            onClick={(e) => deleteCustomTemplate(idx, e)}
                            title="Delete template"
                          >
                            ×
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Save draft as template shortcut */}
                    {noteDraft.trim() && (
                      <div className="text-right pt-0.5">
                        <button
                          type="button"
                          className="text-[10.5px] font-bold text-primary hover:underline cursor-pointer"
                          onClick={() => {
                            const trimmed = noteDraft.trim();
                            if (trimmed && !customTemplates.includes(trimmed) && trimmed.length < 100) {
                              const updated = [...customTemplates, trimmed];
                              setCustomTemplates(updated);
                              (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem('orderflow_custom_notes_templates', JSON.stringify(updated));
                            }
                          }}
                        >
                          + Save current note as template
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setNoteDraft(String(visibleNotes || ''))} 
                      disabled={isSavingNote}
                      className="h-7 text-xs font-semibold"
                    >
                      Reset
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={saveOrderNote} 
                      disabled={isSavingNote || noteDraft === String(visibleNotes || '')}
                      className="h-7 text-xs font-bold bg-primary text-primary-foreground shadow-2xs"
                    >
                      {isSavingNote ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>

                  {visibleNotes && (
                    <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground">
                      <span className="font-bold text-primary block text-[10px] uppercase tracking-wider mb-0.5">Current Note:</span>
                      <p className="whitespace-pre-wrap">{visibleNotes}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Ordered Products & Logistics */}
              <div className="space-y-4">
                
                {/* Ordered Products Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground pb-2 border-b border-border/70">
                    <Package size={15} className="text-primary" />
                    <span>Ordered Products</span>
                  </div>

                  <div className="space-y-2.5">
                    {Array.isArray(order.ordered_items) && order.ordered_items.length > 0 ? (
                      order.ordered_items.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center gap-3">
                          <div className="px-2 py-1 rounded-lg bg-secondary border border-border/70 text-xs font-bold font-mono shrink-0">
                            {item.quantity}x
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {item.name}
                              {item.toyBoxNumber && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">Box #{item.toyBoxNumber}</span>}
                            </p>
                            {(item.size || item.color) && (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                                {item.size && <span>Size: <b className="text-foreground">{item.size}</b></span>}
                                {item.color && item.color !== 'None' && <span>Color: <b className="text-foreground">{item.color}</b></span>}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold font-mono text-foreground">
                              ৳{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                              @৳{Number(item.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center gap-3">
                        <div className="px-2 py-1 rounded-lg bg-secondary border border-border/70 text-xs font-bold font-mono shrink-0">
                          {order.quantity || 1}x
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {order.product_name || 'Ordered Product'}
                          </p>
                          {order.size && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Size: <b className="text-foreground">{order.size}</b>
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono text-foreground">
                            ৳{Number(order.amount || order.total || order.subtotal || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Promotion / Discount Row */}
                  {((order.discount_amount && Number(order.discount_amount) > 0) || order.discount_code || order.free_shipping_discount) && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Tag size={13} />
                        <span>Promo: {order.discount_code ? <strong>{order.discount_code}</strong> : 'Discount Applied'}</span>
                        {order.free_shipping_discount && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Free Shipping</span>}
                      </div>
                      {Number(order.discount_amount || 0) > 0 && (
                        <span className="font-bold font-mono">
                          - ৳{Number(order.discount_amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Courier Ratio Intelligence */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border/70">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
                      <Truck size={15} className="text-primary" />
                      <span>Courier Ratio Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.phone && (
                        <button
                          type="button"
                          className="px-2 py-1 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-[11px] font-semibold text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkPhone(order.phone, true);
                          }}
                          disabled={courierRatioData?.loading}
                        >
                          {courierRatioData?.loading ? (
                            <Loader2 size={11} className="animate-spin text-primary" />
                          ) : (
                            <RotateCcw size={11} />
                          )}
                          <span>Sync Now</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!order.phone ? (
                    <p className="text-xs text-muted-foreground italic">No phone number available for courier verification.</p>
                  ) : courierRatioData?.loading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span>Analyzing courier history...</span>
                    </div>
                  ) : courierRatioData?.error ? (
                    <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2 border border-destructive/20">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{courierRatioData.raw?.error || courierRatioData.raw?.message || 'Courier ratio data unavailable.'}</span>
                    </div>
                  ) : courierRatioData?.fetched ? (
                    <div className="space-y-3">
                      {/* Metric summary boxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Success Ratio</span>
                          <strong className="text-sm font-bold text-foreground font-mono">{Number(courierRatioData.ratio || 0).toFixed(0)}%</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total Parcels</span>
                          <strong className="text-sm font-bold text-foreground font-mono">{Number(courierRatioData.total || 0)}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Successful</span>
                          <strong className="text-sm font-bold text-emerald-600 font-mono">{Number(courierRatioData.success_count || 0)}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Cancelled</span>
                          <strong className="text-sm font-bold text-rose-600 font-mono">{Number(courierRatioData.cancelled || 0)}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-secondary/40 border border-border col-span-2 sm:col-span-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Risk Level</span>
                          <strong className={`text-xs font-bold uppercase ${courierRatioData.riskLevel === 'high' ? 'text-rose-600' : courierRatioData.riskLevel === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {String(courierRatioData.riskLevel || 'low')}
                          </strong>
                        </div>
                      </div>

                      {/* Courier table breakdown */}
                      {courierBreakdownRows.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-secondary/60 text-muted-foreground uppercase text-[9px] tracking-wider border-b border-border">
                              <tr>
                                <th className="p-2 font-bold">Courier</th>
                                <th className="p-2 font-bold text-center">Total</th>
                                <th className="p-2 font-bold text-center">Success</th>
                                <th className="p-2 font-bold text-center">Cancelled</th>
                                <th className="p-2 font-bold">Ratio</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {courierBreakdownRows.map(row => (
                                <tr key={row.key} className="hover:bg-secondary/20 transition-colors">
                                  <td className="p-2 font-bold text-foreground flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-secondary text-[10px] font-mono font-black flex items-center justify-center border border-border">
                                      {String(row.name || '?').slice(0, 2).toUpperCase()}
                                    </span>
                                    <span>{row.name}</span>
                                  </td>
                                  <td className="p-2 text-center font-mono">{row.total}</td>
                                  <td className="p-2 text-center font-mono font-bold text-emerald-600">{row.success}</td>
                                  <td className="p-2 text-center font-mono font-bold text-rose-600">{row.cancelled}</td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-xs">{row.ratio.toFixed(1)}%</span>
                                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.ratio}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Courier ratio check not yet completed.</p>
                  )}
                </div>

                {/* Logistics & Steadfast Tracking */}
                {order.tracking_id && (
                  <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground pb-2 border-b border-border/70">
                      <Truck size={15} className="text-primary" />
                      <span>Logistics & Tracking</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Service</span>
                        <span className="font-bold text-foreground">Steadfast Logistics</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Tracking Code</span>
                        <span className="font-mono font-bold text-foreground">{order.tracking_id}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* ── 4. History / Audit Trail Tab View ── */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground pb-2 border-b border-border/70">
              <History size={15} className="text-primary" />
              <span>Activity Timeline & Audit Trail</span>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center gap-2 py-8 justify-center text-xs text-muted-foreground">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Loading activity history...</span>
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground italic">No activity records found for this order.</p>
            ) : (
              <div className="relative pl-6 space-y-4 border-l-2 border-border/80 my-2">
                {activityLogs.filter(log => String(log.action_description || '').trim()).map((log, i) => (
                  <div key={log.id || i} className="relative space-y-1">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span className="font-bold text-foreground px-2 py-0.5 rounded-md bg-secondary text-[11px]">
                        {log.changed_by_user_name || 'System'}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium">{log.action_description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 5. Modal Footer Actions ── */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
          <Button variant="secondary" onClick={() => setIsPrintStudioOpen(true)} className="h-9 px-3.5 text-xs font-bold">
            <Printer size={14} className="mr-1.5 text-primary" /> Print Invoice / Label
          </Button>
          <Button variant="secondary" onClick={onClose} className="h-9 px-3.5 text-xs font-bold">
            Close Window
          </Button>
          {onEdit && (
            <Button variant="primary" onClick={() => { onClose(); onEdit(effectiveOrder); }} className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-2xs">
              <Edit2 size={14} className="mr-1.5" /> Edit Full Order
            </Button>
          )}
        </div>

      </div>

      <PrintStudioModal 
        isOpen={isPrintStudioOpen} 
        onClose={() => setIsPrintStudioOpen(false)} 
        orders={[effectiveOrder]} 
      />
    </Modal>
  );
};
