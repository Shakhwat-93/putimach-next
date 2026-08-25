'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Tag, Gift, Percent, Truck, 
  Download, Edit2, Trash2, CheckCircle2, AlertCircle,
  Copy, RefreshCw, Power, Filter, Layers, Clock
} from 'lucide-react';
import { Discount, DiscountStatus } from '@/lib/discounts/types';
import { getDiscounts, deleteDiscount, saveDiscount } from '@/lib/discounts/db';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { cn } from '../lib/utils';
import Swal from 'sweetalert2';

export const DiscountsBoard: React.FC = () => {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DiscountStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDiscountsList = async () => {
    setLoading(true);
    try {
      const list = await getDiscounts();
      setDiscounts(list || []);
    } catch (err) {
      console.error('Failed to load discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscountsList();
  }, []);

  // Compute live status based on dates
  const getComputedStatus = (d: Discount): DiscountStatus => {
    if (d.status === 'draft' || d.status === 'disabled') return d.status;
    const now = new Date();
    if (d.start_date && new Date(d.start_date) > now) return 'scheduled';
    if (d.end_date && new Date(d.end_date) < now) return 'expired';
    return 'active';
  };

  // Filtered list
  const filteredDiscounts = useMemo(() => {
    return discounts.filter(d => {
      const compStatus = getComputedStatus(d);
      const matchesStatus = statusFilter === 'all' || compStatus === statusFilter || d.status === statusFilter;
      
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        (d.title && d.title.toLowerCase().includes(query)) ||
        (d.code && d.code.toLowerCase().includes(query)) ||
        (d.type && d.type.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [discounts, statusFilter, searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Delete Discount?',
      text: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#0F172A'
    });

    if (result.isConfirmed) {
      try {
        await deleteDiscount(id);
        setDiscounts(prev => prev.filter(d => d.id !== id));
        Swal.fire({
          title: 'Deleted',
          text: 'Discount has been deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire('Error', 'Failed to delete discount', 'error');
      }
    }
  };

  const handleToggleStatus = async (discount: Discount) => {
    const newStatus: DiscountStatus = discount.status === 'active' ? 'disabled' : 'active';
    try {
      const updated = await saveDiscount({ ...discount, status: newStatus });
      setDiscounts(prev => prev.map(d => d.id === discount.id ? updated : d));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleExportCsv = () => {
    if (discounts.length === 0) return;
    const headers = ['Title', 'Code', 'Method', 'Type', 'Value', 'Status', 'Usage Count', 'Start Date', 'End Date'];
    const rows = discounts.map(d => [
      `"${d.title || ''}"`,
      `"${d.code || ''}"`,
      d.method,
      d.type,
      d.value || '',
      getComputedStatus(d),
      d.usage_count || 0,
      d.start_date || '',
      d.end_date || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `discounts_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-display">
              Discounts & Promotions
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {discounts.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage coupon codes, automatic promotions, and Buy X Get Y campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <Download size={13} />
            <span>Export</span>
          </Button>

          <Button
            size="sm"
            onClick={() => router.push('/admin/discounts/new')}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm px-4"
          >
            <Plus size={14} />
            <span>Create Discount</span>
          </Button>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/60 rounded-xl border border-border/70 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'expired', label: 'Expired' },
            { id: 'disabled', label: 'Disabled' },
            { id: 'draft', label: 'Draft' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                statusFilter === tab.id 
                  ? "bg-background text-foreground shadow-2xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by code, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-input bg-card text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Tag size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">No discounts found</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first discount or promotion campaign.'}
              </p>
            </div>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => router.push('/admin/discounts/new')}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <Plus size={14} /> Create Discount
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Title / Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDiscounts.map((d) => {
                  const compStatus = getComputedStatus(d);
                  return (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      {/* Title & Code */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/discounts/${d.id}`)}
                            className="font-bold text-foreground hover:text-primary text-left truncate cursor-pointer"
                          >
                            {d.title || d.code || 'Untitled Discount'}
                          </button>
                          {d.code && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-[11px] font-extrabold bg-muted px-1.5 py-0.5 rounded text-foreground border border-border/80">
                                {d.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyCode(d.code, d.id)}
                                className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer text-[10px]"
                                title="Copy code"
                              >
                                {copiedId === d.id ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize inline-flex items-center gap-1",
                          compStatus === 'active' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                          compStatus === 'scheduled' ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                          compStatus === 'expired' ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                          compStatus === 'draft' ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" :
                          "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{compStatus}</span>
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 font-semibold text-muted-foreground capitalize">
                        {d.method === 'code' ? 'Code' : 'Automatic'}
                      </td>

                      {/* Type & Value */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">
                          {d.type === 'amount_off_products' ? 'Amount off products' :
                           d.type === 'buy_x_get_y' ? 'Buy X Get Y' :
                           d.type === 'amount_off_order' ? 'Amount off order' : 'Free shipping'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {d.type === 'amount_off_products' || d.type === 'amount_off_order' ? (
                            d.value_type === 'percentage' ? `${d.value}% off` : `৳${d.value} off`
                          ) : d.type === 'buy_x_get_y' ? (
                            'BXGY'
                          ) : 'Free delivery'}
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {d.usage_count || 0}
                        {d.total_usage_limit ? ` / ${d.total_usage_limit}` : ' used'}
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {d.start_date ? new Date(d.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        {d.end_date ? ` – ${new Date(d.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(d)}
                            className={cn(
                              "p-1.5 rounded-lg border transition-colors cursor-pointer",
                              d.status === 'active' ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-muted-foreground border-border hover:bg-muted"
                            )}
                            title={d.status === 'active' ? 'Disable discount' : 'Activate discount'}
                          >
                            <Power size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push(`/admin/discounts/${d.id}`)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Edit discount"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(d.id, d.title || d.code)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Delete discount"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
