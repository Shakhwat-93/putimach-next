'use client';
// @ts-nocheck
﻿import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import {
  PlusCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XSquare,
  Package,
  ArrowRightCircle,
  Phone,
  Truck,
  FileText,
  Activity
} from 'lucide-react';

const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return 'just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return new Date(date).toLocaleDateString();
};

export const LiveActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getClearedAt = () => {
      const raw = (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('activity_cleared_at');
      return raw ? new Date(raw) : null;
    };

    const applyClearedFilter = (items = []) => {
      const clearedAt = getClearedAt();
      if (!clearedAt) return items;
      return items.filter(item => {
        const ts = item?.timestamp ? new Date(item.timestamp) : null;
        return ts && ts > clearedAt;
      });
    };

    const loadActivity = async () => {
      try {
        const data = await api.getRecentActivity(50);
        setActivities(applyClearedFilter(data));
      } catch (err) {
        console.error('Failed to load initial activity:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();

    const subscription = supabase
      .channel('live-activity')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_activity_logs'
      }, (payload) => {
        setActivities(prev => {
          const filtered = applyClearedFilter([payload.new, ...prev]);
          const unique = filtered.filter((v, i, a) => 
            a.findIndex(t => (t.id === v.id || (t.order_id === v.order_id && t.timestamp === v.timestamp))) === i
          );
          return unique.slice(0, 50);
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'order_activity_logs'
      }, (payload) => {
        setActivities(prev => prev.filter(item => item.id !== payload.old?.id));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'order_activity_logs'
      }, () => {
        loadActivity();
      })
      .subscribe();

    const onStorage = (event) => {
      if (event.key === 'activity_cleared_at') {
        loadActivity();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      supabase.removeChannel(subscription);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const getActionIcon = (type) => {
    switch (type) {
      case 'CREATE': return <PlusCircle size={15} className="text-emerald-500" />;
      case 'UPDATE': return <RefreshCw size={15} className="text-sky-500" />;
      case 'STATUS_CHANGE': return <ArrowRightCircle size={15} className="text-amber-500" />;
      case 'DELETE': return <Trash2 size={15} className="text-rose-500" />;
      case 'CALL_ATTEMPT': return <Phone size={15} className="text-purple-500" />;
      case 'TRACKING_UPDATE': return <Truck size={15} className="text-blue-500" />;
      case 'NOTE_ADDED': return <FileText size={15} className="text-slate-500" />;
      default: return <Package size={15} className="text-muted-foreground" />;
    }
  };

  const getEnhancedIcon = (activity) => {
    const desc = (activity.action_description || '').toLowerCase();
    if (desc.includes('call attempt')) return <Phone size={15} className="text-purple-500" />;
    if (desc.includes('tracking id')) return <Truck size={15} className="text-blue-500" />;
    if (desc.includes('note')) return <FileText size={15} className="text-slate-500" />;
    return getActionIcon(activity.action_type);
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={13} className="text-emerald-500" />;
      case 'Cancelled': return <XSquare size={13} className="text-rose-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[560px] bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground m-0">Live Activity</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Activity Scroll Area — Dynamically fills card height without empty whitespace */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 divide-y divide-border/30 scrollbar-thin">
        {activities.map((activity, idx) => (
          <div key={activity.id || idx} className="relative flex items-start gap-3 py-3 first:pt-0 last:pb-0 group">
            {/* Action Icon */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-secondary/80 border border-border/50 text-foreground shadow-2xs mt-0.5">
              {getEnhancedIcon(activity)}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-snug break-words">
                {activity.action_description ? (
                  activity.action_description
                ) : (
                  <span><strong className="font-bold">{activity.changed_by_user_name || 'System'}</strong> updated order details</span>
                )}
              </p>
              
              <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                {activity.order_id && (
                  <span className="inline-block text-[10px] font-mono font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/40">
                    Order: {activity.order_id}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/70 font-medium ml-auto">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>

              {activity.new_status && (
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold text-foreground">
                  {getStatusIndicator(activity.new_status)}
                  <span>{activity.new_status}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground text-center">
            <Package size={28} className="opacity-40" />
            <p className="text-xs font-medium m-0">No recent activity logs.</p>
          </div>
        )}
      </div>
    </div>
  );
};

