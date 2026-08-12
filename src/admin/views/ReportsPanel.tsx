'use client';
// @ts-nocheck
import { useOrders } from '../context/OrderContext';
import './ReportsPanel.css';
import { useAuth } from '../context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DateRangePicker } from '../components/DateRangePicker';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell, 
  BarChart, Bar 
} from 'recharts';
import { Download, FileDown, TrendingUp, BarChart2, PieChart as PieChartIcon, Activity, Truck, AlertCircle, ArrowUpRight, ArrowDownRight, Zap, Megaphone, Loader2 } from 'lucide-react';
import { analytics } from '../utils/analytics';
import { deserializeDateRange, usePersistentState } from '../utils/persistentState';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// ── Custom Tooltip for Premium Charts ──
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-md">
        <p className="mb-2 font-semibold text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></span>
            <span className="font-medium">{entry.name}:</span>
            <span className="text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Animation Constants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 100 }
  }
};

export const ReportsPanel = () => {
  const { orders, velocityMetrics } = useOrders();
  const { updatePresenceContext } = useAuth();

  useEffect(() => {
    updatePresenceContext('Analyzing Reports');
  }, [updatePresenceContext]);

  const [dateRange, setDateRange] = usePersistentState(
    'panel:reports:dateRange',
    () => ({
      start: new Date(new Date().setDate(new Date().getDate() - 30)),
      end: new Date()
    }),
    { deserialize: deserializeDateRange }
  );

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      if (o.status === 'Test') return false;
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [orders, dateRange]);

  // Dynamic Data Calculation
  const trendData = useMemo(() => analytics.getDailyTrend(filteredOrders, 7), [filteredOrders]);
  const sourceData = useMemo(() => analytics.getSourceDistribution(filteredOrders), [filteredOrders]);
  const confirmationData = useMemo(() => analytics.getConfirmationRate(filteredOrders), [filteredOrders]);
  const logisticsData = useMemo(() => analytics.getLogisticsSuccessRate(filteredOrders), [filteredOrders]);

  // Product-wise & Source-wise Conversion Funnel Data
  const productFunnelData = useMemo(() => {
    const productsToTrack = [
      { id: 'stb_black', label: 'STB Black', keywords: ['stb black', 'black stb'] },
      { id: 'stb_beige', label: 'STB Beige', keywords: ['stb beige', 'beige stb'] },
      { id: 'sunglass', label: 'Sunglass', keywords: ['sunglass', 'sunglasses'] }
    ];

    const stats = productsToTrack.map(p => ({
      name: p.label,
      total: 0,
      confirmed: 0,
      cancelled: 0,
      fbConfirmed: 0,
      fbTotal: 0,
      ttConfirmed: 0,
      ttTotal: 0,
    }));

    filteredOrders.forEach(o => {
      const orderProducts = [];
      if (Array.isArray(o.ordered_items)) {
        o.ordered_items.forEach(item => {
          if (item.name) orderProducts.push(item.name.toLowerCase());
        });
      }
      if (o.product_name) {
        orderProducts.push(o.product_name.toLowerCase());
      }

      productsToTrack.forEach((p, idx) => {
        const matches = orderProducts.some(name => p.keywords.some(kw => name.includes(kw)));
        if (matches) {
          stats[idx].total += 1;
          const isConfirmed = o.status === 'Confirmed' || o.status === 'Confirmed & Printed';
          const isCancelled = o.status === 'Cancelled';
          
          if (isConfirmed) stats[idx].confirmed += 1;
          if (isCancelled) stats[idx].cancelled += 1;

          const src = String(o.source || '').toLowerCase();
          const isFB = src.includes('facebook') || src === 'fb';
          const isTT = src.includes('tiktok');

          if (isFB) {
            stats[idx].fbTotal += 1;
            if (isConfirmed) stats[idx].fbConfirmed += 1;
          } else if (isTT) {
            stats[idx].ttTotal += 1;
            if (isConfirmed) stats[idx].ttConfirmed += 1;
          }
        }
      });
    });

    return stats.map(s => {
      const confirmationRate = s.total > 0 ? Math.round((s.confirmed / s.total) * 100) : 0;
      const fbRate = s.fbTotal > 0 ? Math.round((s.fbConfirmed / s.fbTotal) * 100) : 0;
      const ttRate = s.ttTotal > 0 ? Math.round((s.ttConfirmed / s.ttTotal) * 100) : 0;

      return {
        name: s.name,
        'Confirmation Rate': confirmationRate,
        'Facebook Conf. Rate': fbRate,
        'TikTok Conf. Rate': ttRate,
        total: s.total,
        confirmed: s.confirmed,
        fbTotal: s.fbTotal,
        ttTotal: s.ttTotal
      };
    });
  }, [filteredOrders]);

  // ── Ads Cost Analytics (day-wise) ──
  const [adsData, setAdsData] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);

  useEffect(() => {
    const fetchAdsData = async () => {
      setAdsLoading(true);
      try {
        const startStr = dateRange.start.toISOString().split('T')[0];
        const endStr   = dateRange.end.toISOString().split('T')[0];

        const { data: reports } = await supabase
          .from('ads_reports')
          .select(`
            id, report_date, total_spend, total_orders, submitted_by_name,
            ads_campaigns (
              spend, orders_received, quantity,
              bdt_per_purchase, bdt_av_value, order_value_bdt
            )
          `)
          .eq('status', 'submitted')
          .gte('report_date', startStr)
          .lte('report_date', endStr)
          .order('report_date', { ascending: true });

        if (!reports) { setAdsData([]); return; }

        const byDate = {};
        for (const r of reports) {
          const d = r.report_date;
          if (!byDate[d]) byDate[d] = { date: d, total_spend: 0, total_orders: 0, total_bdt_cost: 0, total_order_value_bdt: 0, qty: 0 };
          byDate[d].total_spend        += Number(r.total_spend || 0);
          byDate[d].total_orders       += Number(r.total_orders || 0);
          for (const c of (r.ads_campaigns || [])) {
            byDate[d].total_bdt_cost       += Number(c.bdt_per_purchase || 0) * Number(c.quantity || 0);
            byDate[d].total_order_value_bdt += Number(c.order_value_bdt || 0);
            byDate[d].qty                  += Number(c.quantity || 0);
          }
        }

        const formatted = Object.values(byDate).map(d => ({
          name:            new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          date:            d.date,
          spend:           Math.round(d.total_bdt_cost),
          orders:          d.total_orders,
          order_value:     Math.round(d.total_order_value_bdt),
          roas:            d.total_bdt_cost > 0 ? +(d.total_order_value_bdt / d.total_bdt_cost).toFixed(2) : 0,
          qty:             d.qty,
        }));

        setAdsData(formatted);
      } catch (e) {
        console.error('[ReportsPanel] Ads fetch error:', e);
      } finally {
        setAdsLoading(false);
      }
    };

    fetchAdsData();
  }, [dateRange]);

  // ── User Performance Analytics — own date filter ──
  const [userPerfData,    setUserPerfData]    = useState(null);
  const [userPerfLoading, setUserPerfLoading] = useState(false);
  const [selectedUser,    setSelectedUser]    = useState('all');
  const [perfView,        setPerfView]        = useState('overview');

  const mkDay = (off = 0, isStart = true) => {
    const d = new Date();
    d.setDate(d.getDate() + off);
    if (isStart) {
      d.setHours(0, 0, 0, 0);      
    } else {
      d.setHours(23, 59, 59, 999); 
    }
    return d;
  };
  const [perfDateRange, setPerfDateRange] = useState({ start: mkDay(0, true), end: mkDay(0, false) });
  const [perfPreset,    setPerfPreset]    = useState('today');
  
  const applyPerfPreset = (preset) => {
    const map = {
      today:     { start: mkDay(0,true),   end: mkDay(0,false) },
      yesterday: { start: mkDay(-1,true),  end: mkDay(-1,false) },
      '7d':      { start: mkDay(-6,true),  end: mkDay(0,false) },
      '30d':     { start: mkDay(-29,true), end: mkDay(0,false) },
    };
    if (map[preset]) { setPerfPreset(preset); setPerfDateRange(map[preset]); }
  };

  useEffect(() => {
    const fetchUserPerformance = async () => {
      setUserPerfLoading(true);
      try {
        const toLocalISO = (date) => {
          const tzOffset = date.getTimezoneOffset() * 60000;
          return new Date(date.getTime() - tzOffset).toISOString();
        };

        const startISO = toLocalISO(perfDateRange.start); 
        const endISO   = toLocalISO(perfDateRange.end);   

        const { data: logs } = await supabase
          .from('order_activity_logs')
          .select('changed_by_user_name, new_status, timestamp, action_type, order_id')
          .in('action_type', ['STATUS_CHANGE'])
          .gte('timestamp', startISO)
          .lte('timestamp', endISO)
          .neq('changed_by_user_name', 'System')
          .order('timestamp', { ascending: true });

        if (!logs || logs.length === 0) {
          setUserPerfData({ byUser: [], byDay: [], allUsers: [] });
          return;
        }

        const allUsers = [...new Set(logs.map(l => l.changed_by_user_name))].filter(Boolean).sort();

        const userMap = {};
        for (const l of logs) {
          const u = l.changed_by_user_name || 'Unknown';
          if (!userMap[u]) userMap[u] = { name: u, attempted: 0, confirmed: 0, cancelled: 0, fake: 0, pending: 0, other: 0 };
          userMap[u].attempted++;
          const s = (l.new_status || '').toLowerCase();
          if (s === 'confirmed')        userMap[u].confirmed++;
          else if (s === 'cancelled')   userMap[u].cancelled++;
          else if (s === 'fake order')  userMap[u].fake++;
          else if (s.includes('pending')) userMap[u].pending++;
          else                          userMap[u].other++;
        }

        const byUser = Object.values(userMap).map(u => ({
          ...u,
          confirmRate: u.attempted > 0 ? +((u.confirmed / u.attempted) * 100).toFixed(1) : 0,
          cancelRate:  u.attempted > 0 ? +((u.cancelled / u.attempted) * 100).toFixed(1) : 0,
          fakeRate:    u.attempted > 0 ? +((u.fake      / u.attempted) * 100).toFixed(1) : 0,
        })).sort((a, b) => b.confirmed - a.confirmed);

        const dayMap = {};
        for (const l of logs) {
          const day  = l.timestamp.split('T')[0];
          const user = l.changed_by_user_name || 'Unknown';
          const key  = `${day}__${user}`;
          if (!dayMap[key]) dayMap[key] = { date: day, user, attempted: 0, confirmed: 0, cancelled: 0, fake: 0, pending: 0 };
          dayMap[key].attempted++;
          const s = (l.new_status || '').toLowerCase();
          if (s === 'confirmed')          dayMap[key].confirmed++;
          else if (s === 'cancelled')     dayMap[key].cancelled++;
          else if (s === 'fake order')    dayMap[key].fake++;
          else if (s.includes('pending')) dayMap[key].pending++;
        }

        const dayChartMap = {};
        for (const entry of Object.values(dayMap)) {
          const d = entry.date;
          if (!dayChartMap[d]) dayChartMap[d] = { name: new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), date: d, confirmed: 0, cancelled: 0, fake: 0, attempted: 0 };
          dayChartMap[d].attempted  += entry.attempted;
          dayChartMap[d].confirmed  += entry.confirmed;
          dayChartMap[d].cancelled  += entry.cancelled;
          dayChartMap[d].fake       += entry.fake;
        }

        const byDay = Object.values(dayChartMap).sort((a, b) => a.date.localeCompare(b.date));

        setUserPerfData({ byUser, byDay, allUsers, byDayPerUser: Object.values(dayMap) });
      } catch (e) {
        console.error('[ReportsPanel] User perf fetch error:', e);
      } finally {
        setUserPerfLoading(false);
      }
    };

    fetchUserPerformance();
  }, [perfDateRange]);

  const filteredDayData = useMemo(() => {
    if (!userPerfData?.byDayPerUser) return [];
    const rows = selectedUser === 'all'
      ? userPerfData.byDayPerUser
      : userPerfData.byDayPerUser.filter(r => r.user === selectedUser);

    const m = {};
    for (const r of rows) {
      if (!m[r.date]) m[r.date] = { name: new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), date: r.date, confirmed: 0, cancelled: 0, fake: 0, attempted: 0 };
      m[r.date].attempted  += r.attempted;
      m[r.date].confirmed  += r.confirmed;
      m[r.date].cancelled  += r.cancelled;
      m[r.date].fake       += r.fake;
    }
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
  }, [userPerfData, selectedUser]);

  const filteredUserData = useMemo(() => {
    if (!userPerfData?.byUser) return [];
    if (selectedUser === 'all') return userPerfData.byUser;
    return userPerfData.byUser.filter(u => u.name === selectedUser);
  }, [userPerfData, selectedUser]);


  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return;
    const cleanOrders = orders.filter(o => o.status !== 'Test');
    if (cleanOrders.length === 0) return;

    const headers = ['Order ID', 'Customer Name', 'Phone', 'Product', 'Size', 'Quantity', 'Source', 'Status', 'Amount', 'Date'];
    const csvContent = [
      headers.join(','),
      ...cleanOrders.map(o => [
        o.id,
        `"${o.customer_name}"`,
        `"${o.phone}"`,
        `"${o.product_name}"`,
        o.size,
        o.quantity,
        o.source,
        o.status,
        o.amount,
        new Date(o.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = () => {
    const blob = new Blob(['Daily Sales Report Content'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `daily_report_${new Date().toISOString().split('T')[0]}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      className="p-4 md:p-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" variants={itemVariants}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart2 size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Intelligence Center</h1>
            <p className="text-sm text-muted-foreground">Operational health & business performance metrics</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={handleExportCSV}>
              <FileDown className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" /> Full Report
            </Button>
          </div>
        </div>
      </motion.div>

      {/* AGENT PERFORMANCE INTELLIGENCE */}
      <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-slide-up" variants={itemVariants}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Activity size={16} />
            </div>
            <h3 className="font-display text-lg font-bold">Agent Performance Intelligence</h3>
            <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Live Tracking</Badge>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-secondary/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {['today', 'yesterday', '7d', '30d'].map(preset => (
              <Button 
                key={preset} 
                variant={perfPreset === preset ? 'default' : 'outline'} 
                size="sm"
                onClick={() => applyPerfPreset(preset)}
                className="rounded-full capitalize"
              >
                {preset === '7d' ? '7 Days' : preset === '30d' ? '30 Days' : preset}
              </Button>
            ))}
            <div className="flex items-center gap-2 border-l border-border pl-2 ml-2">
              <input
                type="date"
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={perfDateRange.start.toISOString().split('T')[0]}
                onChange={e => {
                  const d = new Date(e.target.value); d.setHours(0,0,0,0);
                  setPerfDateRange(r => ({ ...r, start: d }));
                  setPerfPreset('custom');
                }}
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={perfDateRange.end.toISOString().split('T')[0]}
                onChange={e => {
                  const d = new Date(e.target.value); d.setHours(23,59,59,999);
                  setPerfDateRange(r => ({ ...r, end: d }));
                  setPerfPreset('custom');
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={perfView} onValueChange={setPerfView}>
              <TabsList className="bg-background">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="daily">Day-wise</TabsTrigger>
              </TabsList>
            </Tabs>
            <select 
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedUser} 
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="all">All Agents</option>
              {(userPerfData?.allUsers || []).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {userPerfLoading ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p>Loading agent performance data...</p>
          </div>
        ) : !userPerfData || userPerfData.byUser.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground text-center">
            <Activity className="mb-2 h-10 w-10 opacity-50" />
            <p className="font-medium text-foreground">No performance data found.</p>
            <p className="text-sm">Agent activity logs will appear here as orders are processed.</p>
          </div>
        ) : (
          <>
            {perfView === 'overview' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
                  {filteredUserData.map(u => (
                    <div 
                      key={u.name} 
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/50",
                        selectedUser === u.name ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background"
                      )}
                      onClick={() => setSelectedUser(selectedUser === u.name ? 'all' : u.name)}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.attempted} total actions</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                          <p className="font-bold text-emerald-600">{u.confirmed}</p>
                          <p className="text-[10px] text-emerald-600/80 uppercase tracking-wider">Confirmed</p>
                        </div>
                        <div className="rounded-lg bg-rose-500/10 p-2">
                          <p className="font-bold text-rose-600">{u.cancelled}</p>
                          <p className="text-[10px] text-rose-600/80 uppercase tracking-wider">Cancelled</p>
                        </div>
                        <div className="rounded-lg bg-orange-500/10 p-2">
                          <p className="font-bold text-orange-600">{u.fake}</p>
                          <p className="text-[10px] text-orange-600/80 uppercase tracking-wider">Fake</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">Confirm Rate</span>
                        <span className="font-bold text-emerald-600">{u.confirmRate}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${u.confirmRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3 font-medium">Rank</th>
                        <th className="p-3 font-medium">Agent</th>
                        <th className="p-3 font-medium">Attempted</th>
                        <th className="p-3 font-medium text-emerald-600">✅ Confirmed</th>
                        <th className="p-3 font-medium text-rose-600">❌ Cancelled</th>
                        <th className="p-3 font-medium text-orange-600">🚫 Fake</th>
                        <th className="p-3 font-medium text-blue-600">⏳ Pending</th>
                        <th className="p-3 font-medium">Confirm %</th>
                        <th className="p-3 font-medium">Cancel %</th>
                        <th className="p-3 font-medium">Fake %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUserData.map((u, i) => (
                        <tr key={u.name} className="hover:bg-secondary/20">
                          <td className="p-3 text-lg">
                            {selectedUser === 'all' ? (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`) : '—'}
                          </td>
                          <td className="p-3 font-medium text-foreground">{u.name}</td>
                          <td className="p-3 font-medium">{u.attempted}</td>
                          <td className="p-3 font-semibold text-emerald-600">{u.confirmed}</td>
                          <td className="p-3 font-semibold text-rose-600">{u.cancelled}</td>
                          <td className="p-3 font-semibold text-orange-600">{u.fake}</td>
                          <td className="p-3 font-semibold text-blue-600">{u.pending}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={u.confirmRate >= 50 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-700'}>
                              {u.confirmRate}%
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={u.cancelRate > 30 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-border text-muted-foreground'}>
                              {u.cancelRate}%
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={u.fakeRate > 15 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-border text-muted-foreground'}>
                              {u.fakeRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {perfView === 'daily' && (
              <>
                <div className="mb-6 rounded-xl border border-border bg-background p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredDayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(13, 148, 136,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted-foreground)', fontSize: 11 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted-foreground)', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="confirmed" name="Confirmed" stackId="a" fill="#10b981" />
                      <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#f43f5e" />
                      <Bar dataKey="fake" name="Fake" stackId="a" fill="#f97316" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex justify-center gap-6 text-sm font-medium">
                    <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#10b981]" />Confirmed</span>
                    <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#f43f5e]" />Cancelled</span>
                    <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#f97316]" />Fake</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3 font-medium">Date</th>
                        {selectedUser === 'all' && <th className="p-3 font-medium">Agent</th>}
                        <th className="p-3 font-medium">Attempted</th>
                        <th className="p-3 font-medium text-emerald-600">✅ Confirmed</th>
                        <th className="p-3 font-medium text-rose-600">❌ Cancelled</th>
                        <th className="p-3 font-medium text-orange-600">🚫 Fake</th>
                        <th className="p-3 font-medium text-blue-600">⏳ Pending</th>
                        <th className="p-3 font-medium">Confirm %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedUser === 'all'
                        ? (userPerfData?.byDayPerUser || []).sort((a, b) => b.date.localeCompare(a.date) || a.user.localeCompare(b.user))
                        : (userPerfData?.byDayPerUser || []).filter(r => r.user === selectedUser).sort((a, b) => b.date.localeCompare(a.date))
                      ).map((row, i) => {
                        const rate = row.attempted > 0 ? +((row.confirmed / row.attempted) * 100).toFixed(1) : 0;
                        return (
                          <tr key={`${row.date}-${row.user}-${i}`} className="hover:bg-secondary/20">
                            <td className="p-3 font-medium">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                            {selectedUser === 'all' && <td className="p-3 font-medium text-foreground">{row.user}</td>}
                            <td className="p-3 font-medium">{row.attempted}</td>
                            <td className="p-3 font-semibold text-emerald-600">{row.confirmed}</td>
                            <td className="p-3 font-semibold text-rose-600">{row.cancelled}</td>
                            <td className="p-3 font-semibold text-orange-600">{row.fake}</td>
                            <td className="p-3 font-semibold text-blue-600">{row.pending}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={rate >= 50 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-700'}>
                                {rate}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>

      {velocityMetrics && (
        <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-slide-up" variants={itemVariants}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Zap size={16} />
            </div>
            <h3 className="font-display text-lg font-bold">Live Operational Heartbeat</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">System Latency (Conf → Factory)</span>
                <div className={cn("flex items-center gap-1 text-xs font-medium", velocityMetrics.avgConfirmedToFactory < 8 ? "text-emerald-500" : "text-rose-500")}>
                  {velocityMetrics.avgConfirmedToFactory < 8 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  <span>{velocityMetrics.avgConfirmedToFactory < 8 ? '-12%' : '+5%'}</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-foreground">
                  {velocityMetrics.avgConfirmedToFactory} <span className="text-sm font-normal text-muted-foreground">h</span>
                </div>
                <Badge variant={velocityMetrics.avgConfirmedToFactory < 8 ? 'default' : 'destructive'} className={velocityMetrics.avgConfirmedToFactory < 8 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                  {velocityMetrics.avgConfirmedToFactory < 8 ? 'Optimum' : 'Optimizing'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Processing Pipeline (Factory → Courier)</span>
                <div className={cn("flex items-center gap-1 text-xs font-medium", velocityMetrics.avgFactoryToCourier < 18 ? "text-emerald-500" : "text-rose-500")}>
                  {velocityMetrics.avgFactoryToCourier < 18 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  <span>{velocityMetrics.avgFactoryToCourier < 18 ? '-8%' : '+15%'}</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-foreground">
                  {velocityMetrics.avgFactoryToCourier} <span className="text-sm font-normal text-muted-foreground">h</span>
                </div>
                <Badge variant={velocityMetrics.avgFactoryToCourier < 18 ? 'default' : 'destructive'} className={velocityMetrics.avgFactoryToCourier < 18 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                  {velocityMetrics.avgFactoryToCourier < 18 ? 'Fluid' : 'Capacity Full'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 text-sm font-medium text-muted-foreground">Total Intelligence Assets</div>
              <div className="flex items-end justify-between mt-2">
                <div className="text-2xl font-bold text-foreground">{velocityMetrics.totalOrdersProcessed}</div>
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Verified Logs</Badge>
              </div>
            </div>
          </div>

          {velocityMetrics.bottlenecks.length > 0 && (
            <div className="space-y-3">
              {velocityMetrics.bottlenecks.map((bottleneck, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold">Bottleneck Detected: {bottleneck.stage}</h4>
                    <p className="text-sm opacity-90">{bottleneck.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2 animate-slide-up" variants={itemVariants}>
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Growth Trajectory</h3>
                <p className="text-xs text-muted-foreground">Order volume trend analysis</p>
              </div>
            </div>
            <div className="flex gap-4 text-right text-sm">
              <div>
                <p className="text-muted-foreground">Peak Vol</p>
                <p className="font-bold text-foreground">142</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Vol</p>
                <p className="font-bold text-foreground">86</p>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <AreaChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(124, 77, 255, 0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted-foreground)', fontSize: 11, fontWeight: 500}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted-foreground)', fontSize: 11, fontWeight: 500}} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="orders" stroke="#0d9488" strokeWidth={4} fillOpacity={1} fill="url(#colorOrders)" activeDot={{ r: 6, strokeWidth: 0, fill: '#0d9488' }} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="flex flex-col gap-6">
          <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-slide-up" variants={itemVariants}>
            <div className="mb-4 flex items-center gap-2">
              <PieChartIcon className="text-indigo-500" size={18} />
              <h3 className="font-semibold">Source Acquisition</h3>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value">
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
              {sourceData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-slide-up" variants={itemVariants}>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="text-teal-500" size={18} />
              <h3 className="font-semibold">Confirmation Logic</h3>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <BarChart data={confirmationData} margin={{top: 10, right: 10, left: -25, bottom: 0}}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted-foreground)', fontSize: 10}} dy={10} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={24}>
                    {confirmationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.rate > 85 ? '#10b981' : 'var(--text-muted-foreground)'} fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-slide-up" variants={itemVariants}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TrendingUp size={16} />
          </div>
          <h3 className="font-display text-lg font-bold">Product-wise Conversion Funnel</h3>
          <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">Attribution Analytics</Badge>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productFunnelData.map(p => (
            <div key={p.name} className="rounded-xl border border-border bg-background p-4 border-l-4 border-l-primary shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{p.name} Total Orders</p>
              <p className="text-2xl font-bold text-foreground mt-1">{p.total}</p>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground font-medium">
                <span>Confirmed: <strong className="text-foreground">{p.confirmed}</strong></span>
                <span>Conv. Rate: <strong className="text-emerald-600">{p['Confirmation Rate']}%</strong></span>
              </div>
            </div>
          ))}
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <BarChart data={productFunnelData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(13, 148, 136,0.06)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted-foreground)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted-foreground)', fontSize: 11 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Confirmation Rate" name="Overall Confirmation Rate" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={26} />
              <Bar dataKey="Facebook Conf. Rate" name="Facebook Confirmation Rate" fill="#1877f2" radius={[6, 6, 0, 0]} barSize={26} />
              <Bar dataKey="TikTok Conf. Rate" name="TikTok Confirmation Rate" fill="#000000" radius={[6, 6, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm font-medium">
          <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#0d9488]" />Overall Conf. Rate</span>
          <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#1877f2]" />Facebook Conf. Rate</span>
          <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#000000]" />TikTok Conf. Rate</span>
        </div>
      </motion.div>

      <motion.div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-slide-up" variants={itemVariants}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Megaphone size={16} />
          </div>
          <h3 className="font-display text-lg font-bold">Daily Ads Cost Intelligence</h3>
          <Badge variant="secondary" className="ml-2">BDT Breakdown</Badge>
        </div>

        {adsLoading ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p>Fetching marketing data...</p>
          </div>
        ) : adsData.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground text-center">
            <Megaphone className="mb-2 h-10 w-10 opacity-50" />
            <p className="font-medium text-foreground">No submitted ads reports found.</p>
            <p className="text-sm">Go to Marketing → Submit a daily report to see data here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Total Ads Cost</p>
                <p className="text-xl font-bold text-foreground mt-1">৳{adsData.reduce((s, d) => s + d.spend, 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Total Order Value</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">৳{adsData.reduce((s, d) => s + d.order_value, 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Avg. Daily Spend</p>
                <p className="text-xl font-bold text-foreground mt-1">৳{Math.round(adsData.reduce((s, d) => s + d.spend, 0) / adsData.length).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Avg. ROAS</p>
                <p className="text-xl font-bold text-primary mt-1">{(adsData.reduce((s, d) => s + d.roas, 0) / adsData.length).toFixed(2)}x</p>
              </div>
            </div>

            <div className="h-[280px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <BarChart data={adsData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(13, 148, 136,0.06)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted-foreground)', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted-foreground)', fontSize: 11 }} tickFormatter={v => `৳${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="spend" name="Ads Cost" fill="#0d9488" fillOpacity={0.85} radius={[6, 6, 0, 0]} barSize={22} />
                  <Bar dataKey="order_value" name="Order Value" fill="#10b981" fillOpacity={0.75} radius={[6, 6, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center gap-6 text-sm font-medium">
                <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#0d9488]" />Ads Cost (৳)</span>
                <span className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-[#10b981]" />Order Value (৳)</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Qty</th>
                    <th className="p-3 font-medium">Ads Cost (৳)</th>
                    <th className="p-3 font-medium">Per Purchase Av.</th>
                    <th className="p-3 font-medium text-emerald-600">Order Value (৳)</th>
                    <th className="p-3 font-medium">Orders</th>
                    <th className="p-3 font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adsData.map((row) => (
                    <tr key={row.date} className={cn("hover:bg-secondary/20", row.roas >= 2 ? "bg-emerald-500/5" : "")}>
                      <td className="p-3 font-medium text-foreground">{row.name}</td>
                      <td className="p-3">{row.qty || '—'}</td>
                      <td className="p-3 font-medium text-rose-600">৳{row.spend.toLocaleString()}</td>
                      <td className="p-3">{row.qty > 0 ? `৳${Math.round(row.spend / row.qty).toLocaleString()}` : '—'}</td>
                      <td className="p-3 font-medium text-emerald-600">৳{row.order_value.toLocaleString()}</td>
                      <td className="p-3 font-medium">{row.orders}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          row.roas >= 2 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
                          row.roas > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 
                          'border-border text-muted-foreground'
                        }>
                          {row.roas > 0 ? `${row.roas}x` : '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

    </motion.div>
  );
};
