'use client';
// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { cn } from '../lib/utils';

export const ORDER_STATUSES = [
  'New',
  'Pending Call',
  'Final Call Pending',
  'Confirmed',
  'Bulk Exported',
  'Courier Submitted',
  'Factory Processing',
  'Completed',
  'Fake Order',
  'Cancelled',
  'Test'
];

interface OrderStatusDropdownProps {
  currentStatus: string;
  orderId: string | number;
  onStatusChange: (orderId: string | number, newStatus: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  triggerBadge?: boolean;
}

const getStatusColorDot = (status: string) => {
  const s = String(status || '').toLowerCase().trim();
  if (s.includes('new')) return 'bg-blue-500';
  if (s.includes('pending call') || s.includes('final call')) return 'bg-amber-500';
  if (s.includes('confirmed')) return 'bg-emerald-500';
  if (s.includes('bulk exported')) return 'bg-indigo-500';
  if (s.includes('courier')) return 'bg-purple-500';
  if (s.includes('factory')) return 'bg-cyan-500';
  if (s.includes('completed') || s.includes('delivered')) return 'bg-teal-500';
  if (s.includes('fake') || s.includes('spam')) return 'bg-rose-500';
  if (s.includes('cancelled')) return 'bg-red-500';
  if (s.includes('test')) return 'bg-zinc-400';
  return 'bg-primary';
};

export const OrderStatusDropdown = ({
  currentStatus,
  orderId,
  onStatusChange,
  disabled = false,
  size = 'sm',
  className = '',
  triggerBadge = true,
}: OrderStatusDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculate dynamic position based on available viewport space
  // ─────────────────────────────────────────────────────────────────────────────
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if trigger button is completely scrolled off-screen
    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    const spaceAbove = rect.top - 8;
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const menuWidth = Math.min(176, viewportWidth - 24);
    const idealHeight = 310; // height for 11 compact items + padding

    const style: React.CSSProperties = {
      position: 'fixed',
      width: `${menuWidth}px`,
      zIndex: 99999,
    };

    // 1. Vertical Positioning: Open downward if enough space, else upward
    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      // Open downward
      style.top = `${Math.round(rect.bottom + 4)}px`;
      style.maxHeight = `${Math.max(140, Math.min(idealHeight, spaceBelow - 8))}px`;
    } else {
      // Open upward
      style.bottom = `${Math.round(viewportHeight - rect.top + 4)}px`;
      style.maxHeight = `${Math.max(140, Math.min(idealHeight, spaceAbove - 8))}px`;
    }

    // 2. Horizontal Positioning: Align with button left, but keep fully inside viewport
    let left = rect.left;
    if (left + menuWidth > viewportWidth - 12) {
      left = viewportWidth - menuWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }
    style.left = `${Math.round(left)}px`;

    setMenuStyle(style);
  }, []);

  // Recalculate position when open or on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, calculatePosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) calculatePosition();
    setIsOpen(!isOpen);
  };

  const handleSelect = (status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (status !== currentStatus) {
      onStatusChange(orderId, status);
    }
  };

  return (
    <div className={cn("relative inline-block", className)} ref={triggerRef} onClick={(e) => e.stopPropagation()}>
      {triggerBadge ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none"
          title="Click to update status"
        >
          <StatusBadge status={currentStatus} size={size} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-secondary transition-colors focus:outline-none"
        >
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusColorDot(currentStatus))} />
          <span className="truncate max-w-[110px]">{currentStatus}</span>
          <ChevronDown size={12} className={cn("text-muted-foreground transition-transform duration-150", isOpen && "rotate-180")} />
        </button>
      )}

      {isOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          {/* Backdrop for click outside / mobile touch dismissal */}
          <div
            className="fixed inset-0 z-[99990] bg-black/10 dark:bg-black/30 backdrop-blur-[0.5px]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Intelligently Clamped Dropdown Popover */}
          <div
            ref={menuRef}
            style={menuStyle}
            className="rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header pill */}
            <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Change Status</span>
              <span className="font-mono text-[9px]">#{String(orderId).slice(-6)}</span>
            </div>

            {/* Scrollable list with auto max-height */}
            <div className="overflow-y-auto overscroll-contain p-1 space-y-0.5 scrollbar-thin">
              {ORDER_STATUSES.map((status) => {
                const isActive = currentStatus === status;
                const dotColor = getStatusColorDot(status);

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={(e) => handleSelect(status, e)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer select-none",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-foreground hover:bg-secondary active:bg-secondary/80"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                      <span className="truncate">{status}</span>
                    </div>
                    {isActive && (
                      <Check size={13} className="text-primary shrink-0 ml-1.5 stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default OrderStatusDropdown;
