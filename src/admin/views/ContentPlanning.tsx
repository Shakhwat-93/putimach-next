'use client';
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ContentPlanning.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, User, Layers, Search, RefreshCw, Plus, Filter,
  X, Check, AlertTriangle, ChevronDown, Eye, Edit2, Trash2,
  ExternalLink, DollarSign, CheckCircle2, Clock, TrendingUp,
  LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { ContentDetailDrawer, StatusBadge, WORKFLOW_STAGES, STATUS_CONFIG } from './ContentDetailDrawer';
import { ContentAddEditModal } from './ContentAddEditModal';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { cn } from '../lib/utils';

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—';
const computeCost = (p) =>
  (p.model_remuneration||0)+(p.photographer_cost||0)+(p.videographer_cost||0)+(p.editing_cost||0)+(p.other_cost||0);
const isOverdue = (p) => {
  if (!p.delivery_deadline) return false;
  const done = ['Published','Archived','Content Received'];
  return new Date(p.delivery_deadline) < new Date() && !done.includes(p.workflow_status);
};

// ── Custom Platform Badge Component ────────────────────────────────
const PlatformBadge = ({ platform }) => {
  if (!platform) return <span className="text-xs text-muted-foreground font-semibold">—</span>;
  const p = platform.toLowerCase();
  let colorClasses = "bg-secondary text-secondary-foreground border-border";
  if (p.includes('facebook')) {
    colorClasses = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  } else if (p.includes('instagram')) {
    colorClasses = "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
  } else if (p.includes('tiktok')) {
    colorClasses = "bg-slate-900/10 dark:bg-slate-100/10 text-slate-800 dark:text-slate-200 border-slate-500/20";
  } else if (p.includes('youtube')) {
    colorClasses = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  } else if (p.includes('website')) {
    colorClasses = "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
  }

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-2xs shrink-0", colorClasses)}>
      {platform}
    </span>
  );
};

// ── Custom Status Badge Component ─────────────────────────────────
const CustomStatusBadge = ({ status }) => {
  const st = status || 'Planning';
  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  let dotColor = "bg-slate-400";

  switch (st) {
    case 'Draft':
    case 'Planning':
      badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      dotColor = "bg-slate-400";
      break;
    case 'Assigned':
      badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
      dotColor = "bg-sky-500";
      break;
    case 'Shooting':
      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      dotColor = "bg-amber-500";
      break;
    case 'Editing':
      badgeStyle = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      dotColor = "bg-purple-500";
      break;
    case 'Review':
      badgeStyle = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800";
      dotColor = "bg-teal-500";
      break;
    case 'Revision Required':
      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      dotColor = "bg-rose-500";
      break;
    case 'Approved':
    case 'Content Received':
      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      dotColor = "bg-emerald-500";
      break;
    case 'Scheduled':
      badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      dotColor = "bg-blue-500";
      break;
    case 'Published':
      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      dotColor = "bg-emerald-500";
      break;
    case 'Failed':
      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      dotColor = "bg-rose-500";
      break;
    case 'Archived':
      badgeStyle = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      dotColor = "bg-slate-400";
      break;
    default:
      break;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 transition-all", badgeStyle)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
      <span>{st}</span>
    </span>
  );
};

// ── Progress Mini Bar ─────────────────────────────────────────────
const MiniProgress = ({ status }) => {
  const idx = WORKFLOW_STAGES.indexOf(status);
  const pct = idx < 0 ? 0 : Math.round((idx / (WORKFLOW_STAGES.length - 1)) * 100);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Planning'];
  return (
    <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden" title={`${pct}% — ${status}`}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
    </div>
  );
};

// ── Summary Stat Card ─────────────────────────────────────────────
const SumCard = ({ label, value, color, bg, icon: Icon, sub }) => (
  <Card className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all duration-200 flex items-center gap-3.5 animate-slide-up shadow-xs">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
      style={{ backgroundColor: bg || 'rgba(13, 148, 136, 0.1)', color: color || 'var(--primary)' }}
    >
      <Icon size={18} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
      <h3 className="text-xl font-bold font-display text-foreground leading-tight tracking-tight mt-0.5">{value}</h3>
      {sub && <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  </Card>
);

// ── Main Component ────────────────────────────────────────────────
export const ContentPlanning = () => {
  const { profile } = useAuth();
  const actorName = profile?.name || 'System';

  // ── State ─────────────────────────────────────────────────────
  const [plans, setPlans] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [activityLogs, setActivityLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  const monthOptions = useMemo(() => {
    const list = []; const d = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    for (let i = -6; i <= 6; i++) {
      const t = new Date(d.getFullYear(), d.getMonth() + i, 1);
      list.push(`${months[t.getMonth()]} ${t.getFullYear()}`);
    }
    return list;
  }, []);

  // Filters
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [filters, setFilters]           = useState({ status:'', type:'', platform:'', priority:'', assignedTo:'', model:'' });

  // Modals / Drawer
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editItem, setEditItem]           = useState(null);
  const [drawerItem, setDrawerItem]       = useState(null);

  // Risk Modal
  const [riskModal, setRiskModal] = useState({ isOpen:false, title:'', message:'', onConfirm:null, onCancel:null });

  // ── Data Fetch ────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    const { data } = await supabase.from('inventory').select('id,name,unit_price').order('name');
    setInventoryProducts(data || []);
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_plans').select('*').eq('month', selectedMonth).order('created_at', { ascending: true });
      if (error) throw error;
      setPlans(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedMonth]);

  const fetchLogsForItem = useCallback(async (planId) => {
    const { data } = await supabase
      .from('content_activity_logs')
      .select('*').eq('content_plan_id', planId).order('created_at', { ascending: false });
    setActivityLogs(prev => ({ ...prev, [planId]: data || [] }));
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── Activity Logger ───────────────────────────────────────────
  const logActivity = useCallback(async (planId, actionType, desc, oldVal = null, newVal = null) => {
    await supabase.from('content_activity_logs').insert([{
      content_plan_id: planId,
      user_name: actorName,
      action_type: actionType,
      action_description: desc,
      old_value: oldVal,
      new_value: newVal,
    }]);
  }, [actorName]);

  // ── Aggregates / Summary ──────────────────────────────────────
  const summary = useMemo(() => {
    const count = (st) => plans.filter(p => p.workflow_status === st).length;
    return {
      total:     plans.length,
      assigned:  count('Assigned'),
      shooting:  count('Shooting'),
      editing:   count('Editing'),
      review:    count('Review') + count('Revision Required'),
      revision:  count('Revision Required'),
      received:  count('Content Received'),
      published: count('Published'),
      overdue:   plans.filter(isOverdue).length,
      totalCost: plans.reduce((s, p) => s + computeCost(p), 0),
    };
  }, [plans]);

  // ── Filtered Plans ─────────────────────────────────────────────
  const filteredPlans = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return plans.filter(p => {
      if (q && !((p.content_title||p.product_name||'').toLowerCase().includes(q) ||
                 (p.assigned_to||'').toLowerCase().includes(q) ||
                 (p.model_creator||'').toLowerCase().includes(q))) return false;
      if (filters.status   && p.workflow_status !== filters.status)   return false;
      if (filters.type     && p.content_type    !== filters.type)     return false;
      if (filters.platform && p.platform        !== filters.platform) return false;
      if (filters.priority && p.priority        !== filters.priority) return false;
      if (filters.assignedTo && !(p.assigned_to||'').toLowerCase().includes(filters.assignedTo.toLowerCase())) return false;
      if (filters.model    && !(p.model_creator||'').toLowerCase().includes(filters.model.toLowerCase())) return false;
      return true;
    });
  }, [plans, searchQuery, filters]);

  const activeFilters = Object.values(filters).filter(Boolean).length;

  // ── Handlers ──────────────────────────────────────────────────
  const handleSaveItem = async (formData) => {
    setActionLoading(true);
    try {
      const payload = { ...formData, month: selectedMonth };
      if (editItem) {
        const { error } = await supabase.from('content_plans').update(payload).eq('id', editItem.id);
        if (error) throw error;
        await logActivity(editItem.id, 'UPDATE', `${actorName} updated content item`);
      } else {
        const { data, error } = await supabase.from('content_plans').insert([payload]).select().single();
        if (error) throw error;
        await logActivity(data.id, 'CREATE', `${actorName} created content item: ${formData.content_title || formData.product_name}`);
      }
      setShowAddModal(false);
      setEditItem(null);
      fetchPlans();
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
    finally { setActionLoading(false); }
  };

  const handleStatusChange = async (planId, newStatus) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan || plan.workflow_status === newStatus) return;
    const oldStatus = plan.workflow_status;

    setRiskModal({
      isOpen: true,
      title: `Move to "${newStatus}"?`,
      message: `Change status of "${plan.content_title || plan.product_name}" from "${oldStatus}" to "${newStatus}".`,
      onConfirm: async () => {
        try {
          const updates = { workflow_status: newStatus, updated_at: new Date() };
          if (newStatus === 'Content Received') updates.content_received = true;
          if (newStatus === 'Assigned' && !plan.assignment_date) updates.assignment_date = new Date().toISOString().split('T')[0];
          await supabase.from('content_plans').update(updates).eq('id', planId);
          await logActivity(planId, 'STATUS_CHANGE', `Status changed: ${oldStatus} → ${newStatus}`, oldStatus, newStatus);
          // refresh drawer if open
          if (drawerItem?.id === planId) {
            setDrawerItem(p => ({ ...p, workflow_status: newStatus, ...updates }));
          }
          fetchPlans();
          fetchLogsForItem(planId);
        } catch (e) { console.error(e); }
        finally { setRiskModal(p => ({ ...p, isOpen: false })); }
      },
      onCancel: () => setRiskModal(p => ({ ...p, isOpen: false })),
    });
  };

  const handleDelete = (plan) => {
    setRiskModal({
      isOpen: true,
      title: '🗑️ Delete Content Item',
      message: `Delete "${plan.content_title || plan.product_name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await supabase.from('content_plans').delete().eq('id', plan.id);
          if (drawerItem?.id === plan.id) setDrawerItem(null);
          fetchPlans();
        } catch (e) { console.error(e); }
        finally { setRiskModal(p => ({ ...p, isOpen: false })); }
      },
      onCancel: () => setRiskModal(p => ({ ...p, isOpen: false })),
    });
  };

  const openDrawer = async (plan) => {
    setDrawerItem(plan);
    if (!activityLogs[plan.id]) fetchLogsForItem(plan.id);
  };

  const openEdit = (plan) => {
    setEditItem(plan);
    setShowAddModal(true);
    setDrawerItem(null);
  };

  const priorityColor = (p) => ({ 'High':'#ef4444','Medium':'#f59e0b','Low':'#22c55e' }[p] || '#94a3b8');

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">Content Production</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">End-to-end content lifecycle management — plan, assign, track, deliver</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Month Picker */}
          <div className="relative flex items-center">
            <Calendar size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer"
            >
              {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className="relative"
          >
            <Filter size={14} />
            <span>Filters</span>
            {activeFilters > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-primary text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </Button>

          {/* Add Content Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setEditItem(null); setShowAddModal(true); }}
          >
            <Plus size={15} />
            <span>Add Content</span>
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        <SumCard label="Total Planned"  value={summary.total}     color="#0d9488" bg="rgba(13, 148, 136,0.1)"  icon={Layers}       sub={`${selectedMonth}`} />
        <SumCard label="Assigned"       value={summary.assigned}   color="#3b82f6" bg="rgba(59,130,246,0.1)"  icon={User}         />
        <SumCard label="Shooting"       value={summary.shooting}   color="#f59e0b" bg="rgba(245,158,11,0.1)"  icon={TrendingUp}   />
        <SumCard label="Editing"        value={summary.editing}    color="#a855f7" bg="rgba(168,85,247,0.1)"  icon={RefreshCw}    />
        <SumCard label="In Review"      value={summary.review}     color="#0d9488" bg="rgba(13, 148, 136,0.1)"  icon={Eye}          sub={`${summary.revision} revisions`} />
        <SumCard label="Received"       value={summary.received}   color="#22c55e" bg="rgba(34,197,94,0.1)"   icon={CheckCircle2} />
        <SumCard label="Published"      value={summary.published}  color="#10b981" bg="rgba(16,185,129,0.12)" icon={ExternalLink} />
        <SumCard label="Overdue"        value={summary.overdue}    color="#ef4444" bg="rgba(239,68,68,0.1)"   icon={Clock}        />
        <SumCard label="Total Cost"     value={`৳${summary.totalCost.toLocaleString()}`} color="#f59e0b" bg="rgba(245,158,11,0.1)" icon={DollarSign} />
      </div>

      {/* ── Filter Bar ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 p-4 rounded-2xl bg-card border border-border animate-slide-up shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 flex-1">
                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <select
                    value={filters.status}
                    onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Statuses</option>
                    {WORKFLOW_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Content Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Content Type</label>
                  <select
                    value={filters.type}
                    onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Types</option>
                    {['UGC','Lifestyle','Review','Demo','Hook','Voice Over','Image','Reel','Carousel','Tutorial','Unboxing','Testimonial'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Platform */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Platform</label>
                  <select
                    value={filters.platform}
                    onChange={e => setFilters(p => ({ ...p, platform: e.target.value }))}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Platforms</option>
                    {['Facebook','Instagram','TikTok','YouTube','Website'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Assigned To */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned To</label>
                  <Input
                    type="text"
                    placeholder="Name…"
                    value={filters.assignedTo}
                    onChange={e => setFilters(p => ({ ...p, assignedTo: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Model / Creator */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Model / Creator</label>
                  <Input
                    type="text"
                    placeholder="Name…"
                    value={filters.model}
                    onChange={e => setFilters(p => ({ ...p, model: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Clear button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ status:'', type:'', platform:'', priority:'', assignedTo:'', model:'' })}
                className="self-end text-xs text-muted-foreground hover:text-foreground mt-2 md:mt-0"
              >
                <X size={13} /> Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Section (Header controls & Board Views) ── */}
      <Card className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
        {/* Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h3 className="text-lg font-bold font-display text-foreground tracking-tight">Content Production Board</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredPlans.length} item{filteredPlans.length !== 1 ? 's' : ''} {activeFilters > 0 ? '(filtered)' : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle Pill Tabs */}
            <div className="inline-flex items-center p-1 bg-secondary/80 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'table'
                    ? "bg-card text-primary shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TableIcon size={14} /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'grid'
                    ? "bg-card text-primary shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center min-w-[220px]">
              <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search title, product, assignee…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-8 text-xs font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={12}/>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <p className="text-sm font-semibold">Loading content production data…</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center">
              <Layers size={36} />
            </div>
            <h3 className="text-base font-bold font-display text-foreground">
              {plans.length === 0 ? `No content planned for ${selectedMonth}` : 'No items match your filters'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {plans.length === 0 ? 'Start by adding your first content item for this production cycle.' : 'Try adjusting your search query or clear existing filter selections.'}
            </p>
            {plans.length === 0 && (
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={() => { setEditItem(null); setShowAddModal(true); }}
              >
                <Plus size={15} /> Add First Item
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Content Cards Grid View ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredPlans.map(plan => {
              const isOD = isOverdue(plan);
              const cost = computeCost(plan);
              return (
                <div
                  key={plan.id}
                  onClick={() => openDrawer(plan)}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-4 space-y-3 animate-slide-up hover:border-primary/40 hover:shadow-md transition-all cursor-pointer relative group",
                    isOD && "border-rose-500/40 bg-rose-500/5",
                    drawerItem?.id === plan.id && "ring-2 ring-primary border-primary"
                  )}
                >
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {plan.priority && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: priorityColor(plan.priority) }}
                            title={`Priority: ${plan.priority}`}
                          />
                        )}
                        <h4 className="text-sm font-bold font-display text-foreground truncate">
                          {plan.content_title || plan.product_name}
                        </h4>
                      </div>
                      {plan.content_title && (
                        <p className="text-xs text-muted-foreground truncate">{plan.product_name}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(plan)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={plan.platform} />
                    {plan.content_type && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border">
                        {plan.content_type}
                      </span>
                    )}

                    {/* Status Dropdown Badge */}
                    <div className="relative inline-flex items-center ml-auto" onClick={e => e.stopPropagation()}>
                      <select
                        value={plan.workflow_status || 'Planning'}
                        onChange={e => handleStatusChange(plan.id, e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      >
                        {WORKFLOW_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="flex items-center gap-1 cursor-pointer">
                        <CustomStatusBadge status={plan.workflow_status || 'Planning'} />
                        <ChevronDown size={11} className="text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Dates & People Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/50 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Shoot Date</span>
                      <span className="text-xs text-muted-foreground font-semibold">{fmt(plan.shoot_date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Deadline</span>
                      <span className={cn("text-xs font-semibold flex items-center gap-1", isOD ? "text-rose-500" : "text-muted-foreground")}>
                        {fmt(plan.delivery_deadline)}
                        {isOD && <Clock size={10} />}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Assigned To</span>
                      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 truncate">
                        <User size={10} className="shrink-0" /> {plan.assigned_to || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Model / Creator</span>
                      <span className="text-xs text-muted-foreground font-semibold truncate block">{plan.model_creator || '—'}</span>
                    </div>
                  </div>

                  {/* Progress & Bottom Bar */}
                  <div className="space-y-1.5 pt-1">
                    <MiniProgress status={plan.workflow_status || 'Planning'} />
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        {plan.content_received ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> Recv
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground">Pending Recv</span>
                        )}
                        {(plan.drive_folder || plan.final_export_link) && (
                          <a
                            href={plan.drive_folder || plan.final_export_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            <ExternalLink size={11} /> Drive
                          </a>
                        )}
                      </div>
                      <span className="font-bold text-foreground">{cost > 0 ? `৳${cost.toLocaleString()}` : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Content Table View ── */
          <div className="overflow-x-auto max-w-full rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Product / Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Shoot Date</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[120px]">Progress</TableHead>
                  <TableHead className="text-center">Recv</TableHead>
                  <TableHead>Drive</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map(plan => {
                  const isOD = isOverdue(plan);
                  const cost = computeCost(plan);
                  return (
                    <TableRow
                      key={plan.id}
                      onClick={() => openDrawer(plan)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isOD && "bg-rose-500/5 hover:bg-rose-500/10",
                        drawerItem?.id === plan.id && "bg-secondary"
                      )}
                    >
                      {/* Product / Title */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {plan.priority && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: priorityColor(plan.priority) }}
                              title={`Priority: ${plan.priority}`}
                            />
                          )}
                          <div>
                            <strong className="text-xs sm:text-sm font-bold text-foreground block">
                              {plan.content_title || plan.product_name}
                            </strong>
                            {plan.content_title && (
                              <span className="text-[11px] text-muted-foreground block">{plan.product_name}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
                          {plan.content_type || '—'}
                        </span>
                      </TableCell>

                      {/* Platform */}
                      <TableCell>
                        <PlatformBadge platform={plan.platform} />
                      </TableCell>

                      {/* Qty */}
                      <TableCell className="text-center font-bold text-xs">
                        {plan.content_needed || 1}
                      </TableCell>

                      {/* Model */}
                      <TableCell className="text-xs font-medium text-foreground">
                        {plan.model_creator || '—'}
                      </TableCell>

                      {/* Assigned To */}
                      <TableCell>
                        {plan.assigned_to ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                            <User size={11} className="text-muted-foreground" /> {plan.assigned_to}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">—</span>
                        )}
                      </TableCell>

                      {/* Shoot Date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-semibold">{fmt(plan.shoot_date)}</span>
                      </TableCell>

                      {/* Deadline */}
                      <TableCell>
                        <span className={cn("text-xs font-semibold inline-flex items-center gap-1", isOD ? "text-rose-500 font-bold" : "text-muted-foreground")}>
                          {fmt(plan.delivery_deadline)}
                          {isOD && <Clock size={10} />}
                        </span>
                      </TableCell>

                      {/* Status Badge Dropdown */}
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="relative inline-flex items-center">
                          <select
                            value={plan.workflow_status || 'Planning'}
                            onChange={e => handleStatusChange(plan.id, e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                          >
                            {WORKFLOW_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <div className="flex items-center gap-1 cursor-pointer">
                            <CustomStatusBadge status={plan.workflow_status || 'Planning'} />
                            <ChevronDown size={11} className="text-muted-foreground" />
                          </div>
                        </div>
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        <MiniProgress status={plan.workflow_status || 'Planning'} />
                      </TableCell>

                      {/* Received */}
                      <TableCell className="text-center">
                        {plan.content_received ? (
                          <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">No</span>
                        )}
                      </TableCell>

                      {/* Drive Link */}
                      <TableCell onClick={e => e.stopPropagation()}>
                        {plan.drive_folder ? (
                          <a
                            href={plan.drive_folder}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            <ExternalLink size={12}/> Drive
                          </a>
                        ) : plan.final_export_link ? (
                          <a
                            href={plan.final_export_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            <ExternalLink size={12}/> Export
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">—</span>
                        )}
                      </TableCell>

                      {/* Cost */}
                      <TableCell className="text-right font-bold text-xs text-foreground">
                        {cost > 0 ? `৳${cost.toLocaleString()}` : '—'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(plan)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(plan)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {drawerItem && (
          <ContentDetailDrawer
            item={drawerItem}
            activityLogs={activityLogs[drawerItem.id] || []}
            onClose={() => setDrawerItem(null)}
            onStatusChange={handleStatusChange}
            onEdit={() => openEdit(drawerItem)}
          />
        )}
      </AnimatePresence>

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <ContentAddEditModal
            item={editItem}
            inventoryProducts={inventoryProducts}
            onSave={handleSaveItem}
            onClose={() => { setShowAddModal(false); setEditItem(null); }}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Risk Confirmation Modal ── */}
      <AnimatePresence>
        {riskModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale:0.95, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.95, opacity:0 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-slide-up"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-lg font-bold font-display text-foreground">{riskModal.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{riskModal.message}</p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={riskModal.onCancel}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={riskModal.onConfirm}>
                  <Check size={14} /> Confirm
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
