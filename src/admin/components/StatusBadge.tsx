'use client';

import React from 'react';
import { 
  CheckCircle2, Clock, Truck, Package, XCircle, AlertTriangle, 
  PauseCircle, Ban, RefreshCw, ShieldAlert, Sparkles 
} from 'lucide-react';

export type ERPStatus = 
  | 'Pending' 
  | 'Confirmed' 
  | 'Processing' 
  | 'In Transit' 
  | 'Sent to Courier' 
  | 'Delivered' 
  | 'Cancelled' 
  | 'On Hold' 
  | 'Fake' 
  | 'Spam' 
  | 'Returned' 
  | 'Active' 
  | 'Inactive' 
  | 'In Stock' 
  | 'Low Stock' 
  | 'Out of Stock'
  | string;

interface StatusBadgeProps {
  status: ERPStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  // Orders & Courier
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    icon: RefreshCw,
  },
  'in transit': {
    label: 'In Transit',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    icon: Truck,
  },
  'sent to courier': {
    label: 'Sent to Courier',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/60',
    icon: Package,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    icon: XCircle,
  },
  'on hold': {
    label: 'On Hold',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800/60',
    icon: PauseCircle,
  },
  fake: {
    label: 'Fake / Spam',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800/60',
    icon: Ban,
  },
  spam: {
    label: 'Fake / Spam',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800/60',
    icon: Ban,
  },
  returned: {
    label: 'Returned',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    icon: RefreshCw,
  },

  // Stock & Inventory
  'in stock': {
    label: 'In Stock',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: CheckCircle2,
  },
  'low stock': {
    label: 'Low Stock',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: AlertTriangle,
  },
  'out of stock': {
    label: 'Out of Stock',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    icon: XCircle,
  },

  // User & General
  active: {
    label: 'Active',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-zinc-100 dark:bg-zinc-800/60',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
    icon: PauseCircle,
  },
};

export function StatusBadge({ status, size = 'sm', showIcon = true, className = '' }: StatusBadgeProps) {
  if (!status) return null;

  const key = String(status).trim().toLowerCase();
  const conf = statusConfig[key] || {
    label: status,
    bg: 'bg-zinc-100 dark:bg-zinc-800/60',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-200 dark:border-zinc-700',
    icon: Sparkles,
  };

  const Icon = conf.icon;

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] font-semibold gap-1',
    md: 'px-3 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3.5 py-1.5 text-xs font-bold gap-2',
  }[size];

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 14,
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs select-none tracking-wide font-sans ${conf.bg} ${conf.text} ${conf.border} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon size={iconSizes} className="shrink-0" />}
      <span className="truncate">{conf.label}</span>
    </span>
  );
}

export default StatusBadge;