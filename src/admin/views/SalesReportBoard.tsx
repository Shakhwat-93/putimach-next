'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Calendar, RefreshCw, Download, 
  FileSpreadsheet, FileText, Printer, Search, Filter, 
  DollarSign, ShoppingCart, Package, Users, Percent, 
  AlertCircle, CheckCircle2, ChevronRight, ChevronLeft,
  X, ArrowUpDown, Tag, Truck, ShieldAlert, ArrowUpRight,
  Layers, SlidersHorizontal, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatPrice } from '@/lib/utils';
import { cn } from '../lib/utils';
import { 
  DateRange, 
  getDateRangePreset, 
  filterSalesData, 
  calculateSalesSummary, 
  generateTimelineChartData, 
  getTopSellingProducts, 
  getTopVariantsByQuantity, 
  getCategoryPerformance, 
  getOrderStatusBreakdown, 
  getCustomerPerformance 
} from '@/lib/analytics/salesEngine';
import { exportSalesToCSV, exportSalesToXLSX } from '@/lib/analytics/exportReports';
import Swal from 'sweetalert2';

const PRESET_BUTTONS = [
  { key: 'TODAY', label: 'Today' },
  { key: 'YESTERDAY', label: 'Yesterday' },
  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
  { key: 'THIS_WEEK', label: 'This Week' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'LAST_MONTH', label: 'Last Month' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'CUSTOM', label: 'Custom Range' },
];

export default function SalesReportBoard() {
  // ── 1. State Management ──
  const [selectedPreset, setSelectedPreset] = useState('LAST_30_DAYS');
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangePreset('LAST_30_DAYS'));
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Chart Metric
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'quantity'>('revenue');

  // Active Top Products Sub-tab
  const [productRankingTab, setProductRankingTab] = useState<'selling' | 'quantity' | 'revenue'>('selling');

  // Pagination for Detailed Transactions Table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Raw Database Data
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawOrderItems, setRawOrderItems] = useState<any[]>([]);
  const [productsMap, setProductsMap] = useState<Map<string, any>>(new Map());
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── 2. Data Fetching ──
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Orders (Primary source of truth)
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // 2. Fetch Order Items
      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*');

      if (itemsErr) throw itemsErr;

      // 3. Fetch Products for metadata
      const { data: prodsData } = await supabase
        .from('products')
        .select('id, name, sku, category_name, image_url, price, compare_price, status');

      const pMap = new Map();
      if (Array.isArray(prodsData)) {
        prodsData.forEach(p => pMap.set(String(p.id), p));
      }

      // 4. Fetch Categories
      const { data: catsData } = await supabase
        .from('categories')
        .select('id, name, slug');

      setRawOrders(ordersData || []);
      setRawOrderItems(itemsData || []);
      setProductsMap(pMap);
      setCategoriesList(catsData || []);
    } catch (err) {
      console.error('Failed to load sales report data:', err);
      Swal.fire({
        title: 'Error Loading Report',
        text: err?.message || 'Failed to fetch sales data from database.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ── 3. Handle Preset Switch ──
  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'CUSTOM') {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
      setDateRange(getDateRangePreset(presetKey));
      setCurrentPage(1);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      Swal.fire({ title: 'Invalid Range', text: 'Please select both start and end dates.', icon: 'warning' });
      return;
    }
    const start = new Date(customStart + 'T00:00:00');
    const end = new Date(customEnd + 'T23:59:59');
    if (start > end) {
      Swal.fire({ title: 'Invalid Range', text: 'Start date cannot be after end date.', icon: 'warning' });
      return;
    }
    setDateRange({ start, end, preset: 'CUSTOM' });
    setSelectedPreset('CUSTOM');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedPreset('LAST_30_DAYS');
    setDateRange(getDateRangePreset('LAST_30_DAYS'));
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedPayment('ALL');
    setSearchQuery('');
    setCustomStart('');
    setCustomEnd('');
    setIsCustomOpen(false);
    setCurrentPage(1);
  };

  // ── 4. Filtered Computations ──
  const { filteredOrders, filteredItems } = useMemo(() => {
    return filterSalesData(rawOrders, rawOrderItems, {
      dateRange,
      category: selectedCategory,
      status: selectedStatus,
      payment_method: selectedPayment,
      search: searchQuery
    });
  }, [rawOrders, rawOrderItems, dateRange, selectedCategory, selectedStatus, selectedPayment, searchQuery]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    return calculateSalesSummary(filteredOrders, filteredItems);
  }, [filteredOrders, filteredItems]);

  const timelineChartData = useMemo(() => {
    return generateTimelineChartData(filteredOrders, filteredItems, dateRange);
  }, [filteredOrders, filteredItems, dateRange]);

  const topProducts = useMemo(() => {
    return getTopSellingProducts(filteredItems, filteredOrders, productsMap);
  }, [filteredItems, filteredOrders, productsMap]);

  const topVariants = useMemo(() => {
    return getTopVariantsByQuantity(filteredItems, filteredOrders);
  }, [filteredItems, filteredOrders]);

  const categoryStats = useMemo(() => {
    return getCategoryPerformance(filteredItems, filteredOrders, productsMap, categoriesList);
  }, [filteredItems, filteredOrders, productsMap, categoriesList]);

  const orderStatusStats = useMemo(() => {
    return getOrderStatusBreakdown(filteredOrders);
  }, [filteredOrders]);

  const customerStats = useMemo(() => {
    return getCustomerPerformance(filteredOrders, filteredItems);
  }, [filteredOrders, filteredItems]);

  // ── 5. Detailed Transactions Table Pagination ──
  const totalTransactionPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIdx, startIdx + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Group items by order for table preview
  const itemsByOrderMap = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredItems.forEach(item => {
      if (!map.has(item.order_id)) map.set(item.order_id, []);
      map.get(item.order_id)!.push(item);
    });
    return map;
  }, [filteredItems]);

  // ── 6. Export Handlers ──
  const handleExportCSV = () => {
    exportSalesToCSV({
      orders: filteredOrders,
      orderItems: filteredItems,
      dateRange,
      filenamePrefix: `putimach_sales_${selectedPreset.toLowerCase()}`
    });
  };

  const handleExportXLSX = () => {
    exportSalesToXLSX({
      summary,
      topProducts,
      topVariants,
      categoryStats,
      customerStats,
      orders: filteredOrders,
      orderItems: filteredItems,
      dateRange,
      filenamePrefix: `putimach_sales_${selectedPreset.toLowerCase()}`
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const dateScopeLabel = `${dateRange.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${dateRange.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-20 print:p-0 print:space-y-4">
      
      {/* ── Header with Date Scope & Export Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5 print:border-none">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                Sales Report & Analytics
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Period:</span>
                <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded-md font-mono text-[11px]">
                  {dateScopeLabel}
                </span>
                <span>• Live database aggregation</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 print:hidden">
          <button
            type="button"
            onClick={fetchAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={cn(loading ? "animate-spin" : "")} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
            title="Download CSV"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportXLSX}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Download Excel Workbook"
          >
            <FileSpreadsheet size={13} />
            <span>Excel (XLSX)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
            title="Print / Save PDF"
          >
            <Printer size={13} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* ── Preset Date Range Selector Bar ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3 print:hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={13} className="text-primary" />
            <span>Date Range Preset</span>
          </span>

          {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedPayment !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Preset Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {PRESET_BUTTONS.map(btn => (
            <button
              key={btn.key}
              type="button"
              onClick={() => handlePresetSelect(btn.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                selectedPreset === btn.key
                  ? "bg-primary text-primary-foreground shadow-2xs scale-100"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Drawer if selected */}
        {isCustomOpen && (
          <form onSubmit={handleApplyCustomRange} className="pt-3 border-t border-border flex flex-wrap items-center gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-muted-foreground">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground outline-none"
                required
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-muted-foreground">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-2xs cursor-pointer hover:bg-primary/90 transition-colors"
            >
              Apply Range
            </button>
          </form>
        )}
      </div>

      {/* ── Multi-Filter Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 print:hidden">
        
        {/* Search Filter */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search order, product, customer..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
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

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="w-full h-9 px-3 rounded-xl border border-input bg-card text-xs text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Order Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="w-full h-9 px-3 rounded-xl border border-input bg-card text-xs text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        {/* Payment Method Filter */}
        <div>
          <select
            value={selectedPayment}
            onChange={(e) => { setSelectedPayment(e.target.value); setCurrentPage(1); }}
            className="w-full h-9 px-3 rounded-xl border border-input bg-card text-xs text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="cash">Cash on Delivery</option>
            <option value="online">Online Payment</option>
            <option value="bkash">bKash / Mobile Money</option>
          </select>
        </div>

      </div>

      {/* ── KPI Summary Cards Grid (8 Core Metrics) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* 1. Gross Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Gross Revenue</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <DollarSign size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {formatPrice(summary.totalRevenue)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Before discounts & returns
          </p>
        </div>

        {/* 2. Net Sales */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Net Sales</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatPrice(summary.netSales)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Gross minus discounts
          </p>
        </div>

        {/* 3. Valid Orders */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Orders</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
              <ShoppingCart size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {summary.totalOrders}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.allOrdersCount} total placed
          </p>
        </div>

        {/* 4. Units Sold */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Items Sold</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <Package size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {summary.itemsSold}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Total product units
          </p>
        </div>

        {/* 5. Average Order Value (AOV) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Average Order (AOV)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Percent size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {formatPrice(summary.aov)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Per confirmed customer
          </p>
        </div>

        {/* 6. Total Discounts Applied */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Discounts</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
              <Tag size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatPrice(summary.totalDiscount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Coupons & promotions
          </p>
        </div>

        {/* 7. Cancelled Orders */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Cancelled Orders</span>
            <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600">
              <ShieldAlert size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {summary.cancelledOrdersCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatPrice(summary.cancelledRevenue)} value
          </p>
        </div>

        {/* 8. Returned Orders */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Returned Orders</span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
              <Truck size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {summary.returnedOrdersCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatPrice(summary.returnedRevenue)} value
          </p>
        </div>

      </div>

      {/* ── Sales Overview Performance Chart ── */}
      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>Sales Performance Overview</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Timeline distribution for {dateScopeLabel}
            </p>
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setChartMetric('revenue')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                chartMetric === 'revenue' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Revenue (৳)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('orders')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                chartMetric === 'orders' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('quantity')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                chartMetric === 'quantity' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Units
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-72 w-full pt-4">
          {timelineChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
              No sales data found for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11, fill: 'currentColor' }} 
                  axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'currentColor' }} 
                  axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                  tickLine={false}
                  tickFormatter={(v) => chartMetric === 'revenue' ? `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}` : v}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{label}</p>
                          <p className="text-emerald-600 font-mono font-bold">
                            Revenue: {formatPrice(data.revenue)}
                          </p>
                          <p className="text-muted-foreground">
                            Orders: <span className="font-bold text-foreground">{data.orders}</span> • Units: <span className="font-bold text-foreground">{data.quantity}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartMetric} 
                  stroke="#22c55e" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top Products & Ranking Section ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        
        {/* Tab Header */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-foreground">Top Product Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Best-performing inventory ranked by volume and revenue</p>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setProductRankingTab('selling')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                productRankingTab === 'selling' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Top Selling
            </button>
            <button
              type="button"
              onClick={() => setProductRankingTab('quantity')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                productRankingTab === 'quantity' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              By Variant
            </button>
            <button
              type="button"
              onClick={() => setProductRankingTab('revenue')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                productRankingTab === 'revenue' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Top Revenue
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-w-0">
          {productRankingTab === 'selling' && (
            <table className="w-full text-left text-xs border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Avg Selling Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topProducts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No product sales in this period.</td></tr>
                ) : (
                  topProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-muted-foreground">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
                            <img 
                              src={prod.product_image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div>
                            <p className="font-bold text-foreground truncate max-w-[200px]">{prod.product_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{prod.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{prod.category}</td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground text-right">{prod.units_sold}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-right">{prod.orders_count}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatPrice(prod.revenue)}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-right">{formatPrice(prod.avg_price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {productRankingTab === 'quantity' && (
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Variant (Color / Size)</th>
                  <th className="px-4 py-3 text-right">Quantity Sold</th>
                  <th className="px-4 py-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topVariants.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No variant sales in this period.</td></tr>
                ) : (
                  topVariants.map((v, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-muted-foreground">#{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{v.product_name}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px]">
                          {v.variant_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground text-right">{v.quantity}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatPrice(v.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {productRankingTab === 'revenue' && (
            <table className="w-full text-left text-xs border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-4 py-3 text-right">Gross Revenue</th>
                  <th className="px-4 py-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topProducts.sort((a, b) => b.revenue - a.revenue).map((prod, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-muted-foreground">#{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{prod.product_name}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-right">{prod.units_sold}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground text-right">{formatPrice(prod.revenue)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatPrice(prod.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Category & Order Status Breakdown Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Category Performance */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-foreground">Category Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue share across product categories</p>
          </div>

          <div className="space-y-3.5">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No category sales recorded.</p>
            ) : (
              categoryStats.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{cat.category}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatPrice(cat.revenue)} ({cat.share_percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, cat.share_percent)}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{cat.orders_count} orders</span>
                    <span>{cat.units_sold} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-foreground">Order Status Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution of order fulfilment lifecycle</p>
          </div>

          <div className="space-y-3">
            {orderStatusStats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No orders found.</p>
            ) : (
              orderStatusStats.map((st, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground capitalize">{st.status}</span>
                    <span className="text-muted-foreground ml-2">({st.orders} orders)</span>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    {formatPrice(st.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Customer Performance Ranking ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border">
          <h3 className="font-bold text-base text-foreground">Customer Lifetime Analytics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Top-spending customers and order frequencies</p>
        </div>

        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[620px]">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Items Purchased</th>
                <th className="px-4 py-3 text-right">Total Spent</th>
                <th className="px-4 py-3 text-right">Average Order</th>
                <th className="px-4 py-3 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {customerStats.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No customer records in this period.</td></tr>
              ) : (
                customerStats.slice(0, 10).map((c, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">{c.customer_name}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 font-mono font-bold text-foreground text-right">{c.orders_count}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-right">{c.items_purchased}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatPrice(c.total_spent)}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-right">{formatPrice(c.aov)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-right">
                      {new Date(c.last_order_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detailed Sales Transactions Table ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-foreground">Sales Transactions Log</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {paginatedOrders.length} of {filteredOrders.length} orders
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Total (Net)</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedOrders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No orders match the selected filters.</td></tr>
              ) : (
                paginatedOrders.map((order) => {
                  const items = itemsByOrderMap.get(order.id) || [];
                  const dateStr = new Date(order.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">{order.order_number || order.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{order.customer_name || 'Guest'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{order.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {items.length > 0 ? (
                            items.map((it, i) => (
                              <p key={i} className="text-[11px] text-foreground truncate max-w-[200px]">
                                {it.quantity}× {it.product_name} <span className="text-muted-foreground">({[it.color_name, it.size].filter(Boolean).join('/')})</span>
                              </p>
                            ))
                          ) : (
                            <p className="text-[11px] text-muted-foreground">{order.product_name || '1 item'}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground text-right">{formatPrice(order.subtotal || order.total || 0)}</td>
                      <td className="px-4 py-3 font-mono text-rose-600 dark:text-rose-400 text-right">{Number(order.discount || 0) > 0 ? `-${formatPrice(order.discount)}` : '—'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatPrice(order.total || order.subtotal || 0)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          order.status === 'confirmed' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                          order.status === 'cancelled' ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" :
                          "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        )}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalTransactionPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {currentPage} of {totalTransactionPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalTransactionPages}
                onClick={() => setCurrentPage(prev => Math.min(totalTransactionPages, prev + 1))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
