'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, 
  BarChart, Bar 
} from 'recharts';
import { useOrders } from '../context/OrderContext';
import { useTasks } from '../context/TaskContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { 
  Clock, Globe, Facebook, CheckCircle2, XCircle, TrendingUp, ShoppingBag, 
  BarChart3, Package, Users, RefreshCw, Zap, ShieldCheck, ClipboardList,
  Calendar, History, AlertCircle
} from 'lucide-react';

import { ActiveUsers } from '../components/ActiveUsers';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { AIBriefing } from '../components/AIBriefing';
import CurrencyIcon from '../components/CurrencyIcon';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

import { cn } from '../lib/utils';

export const DashboardOverview = () => {
  const { stats, orders } = useOrders();
  const { myPendingAssigned, myIncompleteDailyCount } = useTasks();
  const { updatePresenceContext, profile } = useAuth();

  // Daily Snapshot BD Time Calculation
  const todayOrders = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    // BD timezone offset (+6 hours)
    const bdOffset = 6 * 60 * 60 * 1000;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const bdTime = new Date(utc + bdOffset);
    
    const startOfDayBD = new Date(bdTime);
    startOfDayBD.setHours(0, 0, 0, 0);

    return orders.filter(o => {
      if (o.status === 'Test') return false;
      const orderDate = new Date(o.created_at);
      const orderDateBD = new Date(orderDate.getTime() + bdOffset);
      return orderDateBD >= startOfDayBD;
    });
  }, [orders]);

  const dailySnapshot = useMemo(() => {
    const total = todayOrders.length;
    const confirmedOrders = todayOrders.filter(o => o.status === 'Confirmed' || o.status === 'Confirmed & Printed');
    const confirmedPercent = total > 0 ? Math.round((confirmedOrders.length / total) * 100) : 0;
    const revenue = confirmedOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);

    const calledOrders = todayOrders.filter(o => o.first_call_time);
    const totalDelay = calledOrders.reduce((acc, o) => {
      const delay = (new Date(o.first_call_time) - new Date(o.created_at)) / 60000;
      return acc + Math.max(0, delay);
    }, 0);
    const avgResponse = calledOrders.length > 0 ? Math.round(totalDelay / calledOrders.length) : 0;

    const agents = {};
    todayOrders.forEach(o => {
      if ((o.status === 'Confirmed' || o.status === 'Confirmed & Printed') && o.called_by) {
        agents[o.called_by] = (agents[o.called_by] || 0) + 1;
      }
    });

    let topAgent = 'None';
    let maxConfirms = 0;
    Object.entries(agents).forEach(([name, count]) => {
      if (count > maxConfirms) {
        maxConfirms = count;
        topAgent = name;
      }
    });

    return {
      total,
      confirmedPercent,
      revenue,
      avgResponse,
      topAgent,
      maxConfirms
    };
  }, [todayOrders]);

  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(23, 59, 0, 0);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Completed');
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // SLA Calculations
  const { userRoles } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || (userRoles && (userRoles.includes('admin') || userRoles.includes('superadmin')));

  const idleOrders = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    return orders.filter(o => {
      const isPending = o.status === 'Pending' || o.status === 'Pending Call';
      if (!isPending) return false;

      // Idle defined as no call attempts and no first_call_time
      const hasNoCalls = !o.first_call_time && (!o.call_attempts || o.call_attempts === 0);
      if (!hasNoCalls) return false;

      // Created more than 30 minutes ago
      const ageMins = (now - new Date(o.created_at)) / 60000;
      return ageMins > 30;
    });
  }, [orders]);

  const ordersWithCalls = orders?.filter(o => o.status !== 'Test' && o.first_call_time) || [];
  const totalDelayMins = ordersWithCalls.reduce((acc, o) => {
    const delay = (new Date(o.first_call_time) - new Date(o.created_at)) / 60000;
    return acc + Math.max(0, delay);
  }, 0);
  const avgCallDelay = ordersWithCalls.length > 0 ? Math.round(totalDelayMins / ordersWithCalls.length) : 0;
  
  const metSlaCount = ordersWithCalls.filter(o => {
    const delay = (new Date(o.first_call_time) - new Date(o.created_at)) / 60000;
    return delay <= 30; // 30 min SLA
  }).length;
  const slaRate = ordersWithCalls.length > 0 ? Math.round((metSlaCount / ordersWithCalls.length) * 100) : 0;

  useEffect(() => {
    updatePresenceContext('Viewing Dashboard');
  }, [updatePresenceContext]);

  return (
    <div className="space-y-6 pb-8 animate-slide-up">
      {/* ── Welcome Banner Hero Section ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center font-bold text-primary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.name || 'User'} className="h-full w-full object-cover" />
              ) : (
                profile?.name?.substring(0, 2)?.toUpperCase() || 'OF'
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dashboard</span>
              <p className="text-sm font-semibold text-foreground">
                {profile?.name?.split(' ')[0] || 'Partner'}
              </p>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome back! 👋</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl p-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Today</span>
              <span className="text-sm font-medium text-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl p-3">
            <History className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Last Used</span>
              <span className="text-sm font-medium text-foreground">Just now</span>
            </div>
          </div>
        </div>
        {/* Abstract Shapes */}
        <div className="absolute -top-24 -right-24 h-64 w-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-32 h-64 w-64 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── Admin Idle Orders Alert Banner ── */}
      {isAdmin && idleOrders.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/20 p-4 flex-wrap shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground">
              <AlertCircle size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-destructive m-0">
                CRITICAL ALERT: {idleOrders.length} Idle Orders Detected!
              </h4>
              <p className="text-xs text-destructive/80 mt-1 mb-0">
                There are {idleOrders.length} orders created more than 30 minutes ago that have NOT been called by any agent.
              </p>
            </div>
          </div>
          <Link 
            href="/orders" 
            className="inline-flex items-center justify-center rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm font-bold shadow transition-colors hover:bg-destructive/90 shrink-0"
          >
            Take Action Now →
          </Link>
        </div>
      )}

      <AIBriefing stats={stats} avgCallDelay={avgCallDelay} slaRate={slaRate} />

      {/* ── Daily Performance Summary Snapshot ── */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="p-5 border-b border-border/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground m-0">Daily Snapshot</h3>
              <span className="text-xs text-muted-foreground">Calculates live today & resets at 11:59 PM (BD Time)</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <span>Resetting In:</span>
            <strong className="font-mono">{timeLeft}</strong>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="flex flex-col rounded-xl border border-border/50 bg-background/40 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today Total Orders</span>
              <strong className="mt-1 text-2xl font-semibold text-foreground">{dailySnapshot.total}</strong>
            </div>
            
            <div className="flex flex-col rounded-xl border border-border/50 bg-background/40 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirmation Rate</span>
              <strong className="mt-1 text-2xl font-semibold text-emerald-500 dark:text-emerald-400">{dailySnapshot.confirmedPercent}%</strong>
            </div>

            <div className="flex flex-col rounded-xl border border-border/50 bg-background/40 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Call Response</span>
              <strong className="mt-1 text-2xl font-semibold text-primary">{dailySnapshot.avgResponse}m</strong>
            </div>

            <div className="flex flex-col rounded-xl border border-border/50 bg-background/40 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today Revenue</span>
              <strong className="mt-1 flex items-center text-2xl font-semibold text-foreground">
                <CurrencyIcon size={20} className="mr-1 text-muted-foreground" />
                {dailySnapshot.revenue.toLocaleString()}
              </strong>
            </div>

            <div className="col-span-2 lg:col-span-1 flex flex-col rounded-xl border border-border/50 bg-background/40 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today Top Performer</span>
              <strong className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase">
                  {dailySnapshot.topAgent.charAt(0)}
                </span>
                {dailySnapshot.topAgent} {dailySnapshot.maxConfirms > 0 && <span className="text-sm font-normal text-muted-foreground">({dailySnapshot.maxConfirms})</span>}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-2xl font-bold text-foreground">
            <CurrencyIcon size={20} />
            {stats.revenue?.toLocaleString() || '0'}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Total Revenue</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <p className="text-sm text-muted-foreground mt-1">Total Orders</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-2xl font-bold text-foreground">
            <CurrencyIcon size={20} />
            {Math.round(stats.averageOrderValue || 0).toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Avg. Order Value</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalProducts}</div>
          <p className="text-sm text-muted-foreground mt-1">Total Products</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalCustomers}</div>
          <p className="text-sm text-muted-foreground mt-1">Total Customers</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
          <p className="text-sm text-muted-foreground mt-1">Pending Orders</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.processing}</div>
          <p className="text-sm text-muted-foreground mt-1">Processing Orders</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.cancelledCount}</div>
          <p className="text-sm text-muted-foreground mt-1">Cancel Orders</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Zap size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{avgCallDelay}m</div>
          <p className="text-sm text-muted-foreground mt-1">Avg. Call Delay</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{slaRate}%</div>
          <p className="text-sm text-muted-foreground mt-1">30m SLA Rate</p>
        </Card>
      </div>

      {/* My Tasks Widget */}
      <Link 
        href="/tasks" 
        className="block rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm transition-all hover:bg-primary/10 hover:shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">My Tasks</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {myPendingAssigned + myIncompleteDailyCount} pending
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="rounded-full bg-background px-2.5 py-1 shadow-sm border border-border">
              {myIncompleteDailyCount} daily
            </span>
            <span>·</span>
            <span className="rounded-full bg-background px-2.5 py-1 shadow-sm border border-border">
              {myPendingAssigned} assigned
            </span>
          </div>
        </div>
      </Link>

      <div className="w-full">
        <ActiveUsers />
      </div>

      {/* Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          <Card className="rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-bold">Daily Orders Trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <LineChart data={stats.orderTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-bold">Orders by Source</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center justify-center">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={[{value: 100}]}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        fill="hsl(var(--secondary))"
                        stroke="none"
                        isAnimationActive={false}
                      />
                      <Pie
                        data={stats.sourceDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        cornerRadius={10}
                        dataKey="value"
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {stats.sourceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'hsl(var(--foreground))' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  {stats.sourceDistribution.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="block h-2.5 w-2.5 rounded-full" style={{backgroundColor: item.color}}></span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-bold">Confirmation Rate (%)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={stats.confirmationData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--secondary))'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="lg:col-span-1 sticky top-6">
          <LiveActivityFeed />
        </aside>
      </div>
    </div>
  );
};

export default DashboardOverview;

