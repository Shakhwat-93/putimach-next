'use client';
// @ts-nocheck
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactDOM from 'react-dom';
import { FileText, AlertTriangle, Phone, Copy, MessageCircle, Edit2, Printer, Trash2 } from 'lucide-react';
import CurrencyIcon from './CurrencyIcon';
import { ResponseTimer } from './ResponseTimer';
import { StatusBadge } from './StatusBadge';
import './OrderRow.css';

/**
 * Returns a styled source badge.
 */
const SourceBadge = ({ traffic_source, source }) => {
  const raw = traffic_source || source;
  if (!raw) return null;
  const s = String(raw).toLowerCase();

  let label = raw;
  let cls   = 'source-badge-default';

  if (s.includes('facebook') || s === 'fb' || s.includes('l.facebook.com') || s.includes('m.facebook.com')) {
    cls   = 'source-badge-fb';
    label = 'Facebook';
  } else if (s.includes('tiktok') || s.includes('ttclid')) {
    cls   = 'source-badge-tiktok';
    label = 'TikTok';
  } else if (s.includes('instagram') || s === 'ig' || s.includes('l.instagram.com')) {
    cls   = 'source-badge-ig';
    label = 'Instagram';
  } else if (s.includes('youtube') || s === 'yt') {
    cls   = 'source-badge-yt';
    label = 'YouTube';
  } else if (s.includes('google') || s === 'cpc') {
    cls   = 'source-badge-google';
    label = 'Google';
  } else if (s.includes('website') || s.includes('web') || s.includes('new web') || s.includes('stb-landing') || s.includes('-landing')) {
    cls   = 'source-badge-web';
    label = 'Website';
  } else if (s.includes('direct')) {
    cls   = 'source-badge-direct';
    label = 'Direct';
  } else if (s.includes('whatsapp')) {
    cls   = 'source-badge-wa';
    label = 'WhatsApp';
  }

  return <span className={`source-badge ${cls}`}>{label}</span>;
};

export const OrderRow = ({ order, onDetails, onStatusChange, onEdit, onPrint, onDelete, isSelected, onSelect, fraudFlag, automationFlag, isUnread = false, duplicateWarning = null }) => {
  const [copied, setCopied] = useState(false);

  // Derive row-level SLA class for left border highlight
  const CALL_STATUSES = new Set(['New', 'Pending Call', 'Final Call Pending']);
  const hasAttempt = Number(order?.call_attempts || 0) > 0 || !!(order?.first_call_time || order?.last_call_at);
  const rowSlaClass = (() => {
    if (!CALL_STATUSES.has(order?.status)) return '';
    if (hasAttempt) return 'rt-row-ontime';
    const minsElapsed = order?.created_at
      ? (Date.now() - new Date(order.created_at)) / 60000
      : 0;
    if (minsElapsed > 15) return 'rt-row-critical';
    if (minsElapsed > 10) return 'rt-row-warning';
    return 'rt-row-ontime';
  })();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const statusBtnRef = useRef(null);

  const toggleStatusMenu = () => {
    if (!showStatusMenu && statusBtnRef.current) {
      const rect = statusBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 280;
      if (spaceBelow > menuHeight) {
        setMenuPos({ top: rect.bottom + 4, left: rect.left });
      } else {
        setMenuPos({ top: rect.top - menuHeight, left: rect.left });
      }
    }
    setShowStatusMenu(!showStatusMenu);
  };

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stopRowClick = (e) => e.stopPropagation();

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'New': return 'new';
      case 'Pending Call': return 'pending-call';
      case 'Final Call Pending': return 'final-call-pending';
      case 'Confirmed': return 'confirmed';
      case 'Bulk Exported': return 'bulk-exported';
      case 'Fake Order': return 'fake-order';
      case 'Cancelled': return 'cancelled';
      case 'Courier Submitted': return 'courier';
      case 'Factory Processing': return 'factory';
      case 'Completed': return 'completed';
      case 'Test': return 'test';
      default: return 'default';
    }
  };

  const ORDER_STATUSES = [
    'New', 'Pending Call', 'Final Call Pending', 'Confirmed', 'Bulk Exported', 'Courier Submitted',
    'Factory Processing', 'Completed', 'Fake Order', 'Cancelled', 'Test'
  ];

  const orderTimestamp = order.created_at
    ? new Date(order.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'N/A';

  const productName = String(order.product_name || 'Unknown Product').trim() || 'Unknown Product';
  const rawPhone = String(order.phone || '').trim();
  const normalizedPhone = rawPhone.replace(/\D/g, '');
  const whatsappPhone = normalizedPhone.startsWith('880')
    ? normalizedPhone
    : normalizedPhone.startsWith('0')
      ? `88${normalizedPhone}`
      : normalizedPhone;
  const whatsappLink = whatsappPhone ? `https://wa.me/${whatsappPhone}` : null;

  return (
    <motion.tr 
      className={`order-row border-b border-border/40 hover:bg-secondary/40 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''} ${rowSlaClass}`}
      onClick={() => onDetails(order)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 1. Checkbox */}
      <td className="px-4 py-3.5 w-10 align-middle" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          className="rounded border-input text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer" 
          checked={isSelected}
          onChange={() => onSelect(order.id)}
        />
      </td>

      {/* 2. Order Reference */}
      <td className="px-4 py-3.5 align-middle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-mono font-bold text-foreground tracking-tight">
            #{String(order.id).replace('ORD-', '').replace('STB-', '').replace('MGB-', '').slice(0, 10)}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {orderTimestamp}
          </span>
          {duplicateWarning && (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold border border-rose-200/60 w-max" title={duplicateWarning.title}>
              <AlertTriangle size={10} className="shrink-0" />
              <span>Dup: {duplicateWarning.label}</span>
            </div>
          )}
        </div>
      </td>

      {/* 3. Customer */}
      <td className="px-4 py-3.5 align-middle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold text-foreground truncate max-w-[170px]" title={order.customer_name}>
            {order.customer_name || 'Customer'}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
            <span>{rawPhone || 'No phone'}</span>
            <div className="inline-flex items-center gap-0.5 shrink-0 ml-1" onClick={stopRowClick}>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title={copied ? 'Copied' : 'Copy phone'}
                onClick={(e) => handleCopy(e, rawPhone)}
                disabled={!rawPhone}
              >
                <Copy size={11} />
              </button>
              <a
                href={rawPhone ? `tel:${rawPhone}` : undefined}
                className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="Call customer"
                onClick={stopRowClick}
              >
                <Phone size={11} />
              </a>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-0.5 rounded hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors"
                  title="Open WhatsApp"
                  onClick={stopRowClick}
                >
                  <MessageCircle size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 4. Status */}
      <td className="px-4 py-3.5 whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-block" ref={statusBtnRef}>
          <button 
            type="button"
            className="cursor-pointer hover:opacity-85 transition-opacity"
            onClick={toggleStatusMenu}
            title="Click to change status"
          >
            <StatusBadge status={order.status} size="sm" />
          </button>
          
          {showStatusMenu && ReactDOM.createPortal(
            <>
              <div className="fixed inset-0 z-[99990]" onClick={() => setShowStatusMenu(false)} />
              <div 
                className="fixed z-[99999] rounded-xl border border-border bg-card shadow-2xl p-1 min-w-[150px] animate-in fade-in zoom-in-95 duration-150"
                style={{ 
                  top: menuPos.top, 
                  left: menuPos.left,
                }}
              >
                {ORDER_STATUSES.map(status => (
                  <button 
                    key={status}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-between ${order.status === status ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
                    onClick={() => {
                      onStatusChange(order.id, status);
                      setShowStatusMenu(false);
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
        </div>
      </td>

      {/* 5. Payment */}
      <td className="px-4 py-3.5 whitespace-nowrap align-middle">
        <div className="flex flex-col gap-0.5">
          <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
            order.status === 'Completed' || order.status === 'Delivered'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {order.payment_status || (order.status === 'Completed' || order.status === 'Delivered' ? 'COD_COLLECTED' : 'PENDING_COD')}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {order.payment_method || 'Cash On Delivery'}
          </span>
        </div>
      </td>

      {/* 6. Items */}
      <td className="px-4 py-3.5 whitespace-nowrap align-middle">
        <span className="text-xs font-medium text-foreground">
          {order.items || 1} item{order.items > 1 ? 's' : ''}
        </span>
      </td>

      {/* 7. Total (BDT) */}
      <td className="px-4 py-3.5 whitespace-nowrap align-middle">
        <span className="text-sm font-extrabold font-mono text-foreground">
          ৳{Number(order.total || order.subtotal || order.amount || 0).toLocaleString()}
        </span>
      </td>

      {/* 8. Action */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap align-middle" onClick={stopRowClick}>
        <div className="inline-flex items-center gap-1.5 justify-end">
          <button 
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer border border-border/40"
            onClick={() => onDetails(order)}
          >
            <FileText size={13} />
            <span>View</span>
          </button>
          <button 
            type="button"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            onClick={() => onEdit(order)}
            title="Edit Order"
          >
            <Edit2 size={13} />
          </button>
          <button 
            type="button"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            onClick={() => onDelete(order.id)}
            title="Delete Order"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};
