'use client';
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './FinancePlanning.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, DollarSign, Target, Percent, AlertCircle, Sparkles,
  ArrowRight, ShieldAlert, Check, X, RefreshCw, Layers, ArrowUpRight,
  ArrowDownRight, HelpCircle, Save, ChevronDown, CheckCircle, Search,
  Eye, EyeOff, ShieldCheck, Landmark, Calendar, Filter, Plus,
  BarChart3, PieChart
} from 'lucide-react';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { cn } from '../lib/utils';

export const FinancePlanning = () => {
  const { confirmDialog, showError, ConfirmDialogComponent } = useConfirmDialog();
  const { hasAnyRole } = useAuth();
  
  // Date configuration
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  const monthOptions = useMemo(() => {
    const list = [];
    const d = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (let i = -6; i <= 6; i++) {
      const targetDate = new Date(d.getFullYear(), d.getMonth() + i, 1);
      list.push(`${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`);
    }
    return list;
  }, []);

  // Tabs state
  const [activeTab, setActiveTab] = useState('all');

  // Constants
  const DEFAULT_RETURN_FEE = 60; // BDT per returned parcel

  // State Management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [financePlans, setFinancePlans] = useState([]);
  const [actualOrders, setActualOrders] = useState([]);
  const [contentPlans, setContentPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false); // default to false on all devices for simpler view
  
  // Return fee config state
  const [returnFee, setReturnFee] = useState(DEFAULT_RETURN_FEE);
  const [isEditingReturnFee, setIsEditingReturnFee] = useState(false);
  const [tempReturnFee, setTempReturnFee] = useState(DEFAULT_RETURN_FEE);

  // Grid editing states
  const [gridData, setGridData] = useState([]); // Draft state of the target grid
  const [editedCells, setEditedCells] = useState({}); // Tracking cell changes

  // Risk confirmation modal state
  const [riskModal, setRiskModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    changes: [],
    onConfirm: null,
    onCancel: null
  });

  // Parse selectedMonth to timestamps
  const monthRange = useMemo(() => {
    const [monthName, yearStr] = selectedMonth.split(' ');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIdx = months.indexOf(monthName);
    const start = new Date(parseInt(yearStr), monthIdx, 1, 0, 0, 0, 0);
    const end = new Date(parseInt(yearStr), monthIdx + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }, [selectedMonth]);

  // Load inventory list
  const fetchInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Failed to load inventory:', e);
      return [];
    }
  }, []);

  // Load finance plans
  const fetchFinancePlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('finance_plans')
        .select('*')
        .eq('month', selectedMonth);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Failed to load finance plans:', e);
      return [];
    }
  }, [selectedMonth]);

  // Load content plans
  const fetchContentPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_plans')
        .select('*')
        .eq('month', selectedMonth);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Failed to load content plans:', e);
      return [];
    }
  }, [selectedMonth]);

  // Load orders
  const fetchActualOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('product_name, status, amount, created_at, quantity')
        .gte('created_at', monthRange.start.toISOString())
        .lte('created_at', monthRange.end.toISOString())
        .neq('status', 'Test');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Failed to load orders:', e);
      return [];
    }
  }, [monthRange]);

  // Main aggregator
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, plans, orders, contents] = await Promise.all([
        fetchInventory(),
        fetchFinancePlans(),
        fetchActualOrders(),
        fetchContentPlans()
      ]);

      setInventoryList(inv);
      setFinancePlans(plans);
      setActualOrders(orders);
      setContentPlans(contents);

      const rows = inv.map(product => {
        const existingPlan = plans.find(p => p.product_id === product.id || p.product_name.toLowerCase() === product.name.toLowerCase());
        
        return {
          id: existingPlan?.id || null,
          product_id: product.id,
          product_name: product.name,
          target_sales_qty: existingPlan ? existingPlan.target_sales_qty : 0,
          mrp: existingPlan ? Number(existingPlan.mrp) : Number(product.selling_price || 0),
          lifting_cost: existingPlan ? Number(existingPlan.lifting_cost) : Number(product.making_cost || product.unit_price || 0),
          packing_cost: existingPlan ? Number(existingPlan.packing_cost) : 50,
          cod_cost: existingPlan ? Number(existingPlan.cod_cost) : 6,
          ad_cost_unit_bdt: existingPlan ? Number(existingPlan.ad_cost_unit_bdt) : 100,
          ad_cost_unit_usd: existingPlan ? Number(existingPlan.ad_cost_unit_usd) : 1.0,
          opex_cost_unit: existingPlan ? Number(existingPlan.opex_cost_unit) : 100,
        };
      });

      setGridData(rows);
      setEditedCells({});
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, fetchInventory, fetchFinancePlans, fetchActualOrders, fetchContentPlans]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle cell edit
  const handleCellChange = (productName, field, value) => {
    const numValue = value === '' ? 0 : Number(value);
    
    setGridData(prev => prev.map(row => {
      if (row.product_name === productName) {
        if (field === 'ad_cost_unit_bdt') {
          return {
            ...row,
            ad_cost_unit_bdt: numValue,
            ad_cost_unit_usd: parseFloat((numValue / 120).toFixed(2))
          };
        }
        if (field === 'ad_cost_unit_usd') {
          return {
            ...row,
            ad_cost_unit_usd: numValue,
            ad_cost_unit_bdt: Math.round(numValue * 120)
          };
        }
        return { ...row, [field]: numValue };
      }
      return row;
    }));

    setEditedCells(prev => ({
      ...prev,
      [productName]: {
        ...(prev[productName] || {}),
        [field]: true
      }
    }));
  };

  const isDirty = useMemo(() => {
    return Object.keys(editedCells).length > 0;
  }, [editedCells]);

  const triggerSaveGrid = () => {
    if (!isDirty) return;

    const changeSummary = [];
    gridData.forEach(row => {
      const rowEdits = editedCells[row.product_name];
      if (rowEdits) {
        const dbPlan = financePlans.find(p => p.product_name.toLowerCase() === row.product_name.toLowerCase());
        const fieldChanges = [];
        
        Object.keys(rowEdits).forEach(field => {
          const oldVal = dbPlan ? dbPlan[field] || 0 : 0;
          const newVal = row[field];
          if (oldVal !== newVal) {
            fieldChanges.push(`${field.replace(/_/g, ' ')} (${oldVal} ➔ ${newVal})`);
          }
        });

        if (fieldChanges.length > 0) {
          changeSummary.push({
            product: row.product_name,
            details: fieldChanges.join(', ')
          });
        }
      }
    });

    if (changeSummary.length === 0) {
      setEditedCells({});
      return;
    }

    setRiskModal({
      isOpen: true,
      title: '⚠️ CONFIRM HIGH-RISK FINANCIAL ACTION',
      message: `You are modifying target variables for monthly planning. Changing sales volume, ad budgets, or COGS shifts your predicted net margins and ROI forecasts.`,
      changes: changeSummary,
      onConfirm: async () => {
        setRiskModal(prev => ({ ...prev, isOpen: false }));
        await executeSave();
      },
      onCancel: () => {
        setRiskModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const editPromises = gridData.map(async (row) => {
        const rowEdits = editedCells[row.product_name];
        if (!rowEdits) return;

        const payload = {
          month: selectedMonth,
          product_id: row.product_id,
          product_name: row.product_name,
          target_sales_qty: row.target_sales_qty,
          mrp: row.mrp,
          lifting_cost: row.lifting_cost,
          packing_cost: row.packing_cost,
          cod_cost: row.cod_cost,
          ad_cost_unit_bdt: row.ad_cost_unit_bdt,
          ad_cost_unit_usd: row.ad_cost_unit_usd,
          opex_cost_unit: row.opex_cost_unit,
          updated_at: new Date()
        };

        if (row.id) {
          const { error } = await supabase
            .from('finance_plans')
            .update(payload)
            .eq('id', row.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('finance_plans')
            .insert([payload]);
          if (error) throw error;
        }
      });

      await Promise.all(editPromises);
      await loadData();
    } catch (e) {
      console.error('Failed saving target changes:', e);
      showError(e.message, 'Error Updating Targets');
    } finally {
      setSaving(false);
    }
  };

  const discardEdits = () => {
    loadData();
  };

  // Calculations
  const computedTargets = useMemo(() => {
    return gridData.map(row => {
      const totalSales = row.target_sales_qty * row.mrp;
      const grossUnit = row.mrp - row.lifting_cost;
      const totalGross = row.target_sales_qty * grossUnit;
      const totalPack = row.target_sales_qty * row.packing_cost;
      const totalCod = row.target_sales_qty * row.cod_cost;
      const totalOpex = row.target_sales_qty * row.opex_cost_unit;
      const totalAd = row.target_sales_qty * row.ad_cost_unit_bdt;
      
      const netUnit = grossUnit - row.packing_cost - row.cod_cost - row.ad_cost_unit_bdt - row.opex_cost_unit;
      const totalNetProfit = row.target_sales_qty * netUnit;
      const totalInvestment = row.target_sales_qty * row.lifting_cost;

      return {
        ...row,
        totalSales,
        grossUnit,
        totalGross,
        totalPack,
        totalCod,
        totalOpex,
        totalAd,
        netUnit,
        totalNetProfit,
        totalInvestment
      };
    });
  }, [gridData]);

  const filteredTargets = useMemo(() => {
    if (!searchQuery.trim()) return computedTargets;
    return computedTargets.filter(row => 
      row.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [computedTargets, searchQuery]);

  const targetSums = useMemo(() => {
    return filteredTargets.reduce((acc, row) => ({
      qty: acc.qty + row.target_sales_qty,
      sales: acc.sales + row.totalSales,
      gross: acc.gross + row.totalGross,
      pack: acc.pack + row.totalPack,
      cod: acc.cod + row.totalCod,
      opex: acc.opex + row.totalOpex,
      ad: acc.ad + row.totalAd,
      net: acc.net + row.totalNetProfit,
      investment: acc.investment + row.totalInvestment
    }), { qty: 0, sales: 0, gross: 0, pack: 0, cod: 0, opex: 0, ad: 0, net: 0, investment: 0 });
  }, [filteredTargets]);

  const liveActualsByProduct = useMemo(() => {
    const acc = {};
    
    const contentCostsByProduct = {};
    contentPlans.forEach(cp => {
      const prodName = cp.product_name.toLowerCase();
      const inhouseTotal = (cp.inhouse_count || 0) * (cp.inhouse_unit_cost || 0);
      const brandTotal = (cp.brand_unit_count || 0) * (cp.brand_unit_cost || 0);
      const otherTotal = cp.other_cost || 0;
      contentCostsByProduct[prodName] = (contentCostsByProduct[prodName] || 0) + inhouseTotal + brandTotal + otherTotal;
    });

    actualOrders.forEach(order => {
      if (!order.product_name) return;
      const prodKey = order.product_name.toLowerCase();
      if (!acc[prodKey]) {
        acc[prodKey] = {
          confirmedCount: 0,
          deliveredCount: 0,
          cancelledCount: 0,
          totalQty: 0,
          revenue: 0,
        };
      }

      const isConfirmed = ['Confirmed', 'Bulk Exported', 'Courier Submitted', 'Courier Ready', 'Completed'].includes(order.status);
      const isDelivered = ['Completed'].includes(order.status);
      const isCancelled = ['Cancelled', 'Fake Order'].includes(order.status);
      const orderQty = order.quantity || 1;

      if (isConfirmed) acc[prodKey].confirmedCount += orderQty;
      if (isDelivered) {
        acc[prodKey].deliveredCount += orderQty;
        acc[prodKey].revenue += Number(order.amount || 0);
      }
      if (isCancelled) acc[prodKey].cancelledCount += orderQty;
      acc[prodKey].totalQty += orderQty;
    });

    return filteredTargets.map(target => {
      const prodKey = target.product_name.toLowerCase();
      const actuals = acc[prodKey] || { confirmedCount: 0, deliveredCount: 0, cancelledCount: 0, revenue: 0 };
      const contentCost = contentCostsByProduct[prodKey] || 0;

      const actualLiftingCost = actuals.confirmedCount * target.lifting_cost;
      const actualPackingCost = actuals.confirmedCount * target.packing_cost;
      const actualCodCost = actuals.deliveredCount * target.cod_cost;
      const actualOpexCost = actuals.confirmedCount * target.opex_cost_unit;
      const actualAdCost = actuals.confirmedCount * target.ad_cost_unit_bdt;
      const actualReturnCost = actuals.cancelledCount * returnFee;

      const actualNetProfit = actuals.revenue - (actualLiftingCost + actualPackingCost + actualCodCost + actualOpexCost + actualAdCost + actualReturnCost + contentCost);

      return {
        product_name: target.product_name,
        targetQty: target.target_sales_qty,
        targetSales: target.totalSales,
        targetNet: target.totalNetProfit,
        confirmedCount: actuals.confirmedCount,
        deliveredCount: actuals.deliveredCount,
        cancelledCount: actuals.cancelledCount,
        revenue: actuals.revenue,
        liftingCost: actualLiftingCost,
        packingCost: actualPackingCost,
        codCost: actualCodCost,
        opexCost: actualOpexCost,
        adCost: actualAdCost,
        returnCost: actualReturnCost,
        contentCost,
        netProfit: actualNetProfit
      };
    });
  }, [actualOrders, filteredTargets, contentPlans, returnFee]);

  const actualSums = useMemo(() => {
    return liveActualsByProduct.reduce((acc, row) => ({
      confirmed: acc.confirmed + row.confirmedCount,
      delivered: acc.delivered + row.deliveredCount,
      cancelled: acc.cancelled + row.cancelledCount,
      revenue: acc.revenue + row.revenue,
      lifting: acc.lifting + row.liftingCost,
      packing: acc.packing + row.packingCost,
      cod: acc.cod + row.codCost,
      opex: acc.opex + row.opexCost,
      ad: acc.ad + row.adCost,
      content: acc.content + row.contentCost,
      returnCost: acc.returnCost + row.returnCost,
      net: acc.net + row.netProfit
    }), { confirmed: 0, delivered: 0, cancelled: 0, revenue: 0, lifting: 0, packing: 0, cod: 0, opex: 0, ad: 0, content: 0, returnCost: 0, net: 0 });
  }, [liveActualsByProduct]);

  // Advisory engine
  const advisoryInsights = useMemo(() => {
    const insights = [];
    
    liveActualsByProduct.forEach(p => {
      const totalAttempts = p.confirmedCount + p.cancelledCount;
      const cancelRate = totalAttempts > 0 ? (p.cancelledCount / totalAttempts) * 100 : 0;
      if (cancelRate > 15) {
        insights.push({
          type: 'danger',
          product: p.product_name,
          title: `High Cancel Rate: ${cancelRate.toFixed(1)}%`,
          suggestion: 'A return surge degrades net margins. Verify customer address details or require phone confirmation prior to shipping.'
        });
      }

      if (p.targetQty > 0) {
        const targetProgress = (p.confirmedCount / p.targetQty) * 100;
        if (targetProgress < 30 && monthRange.end < new Date()) {
          insights.push({
            type: 'warning',
            product: p.product_name,
            title: `Missed Target: Only ${targetProgress.toFixed(1)}% achieved`,
            suggestion: 'Underachieved monthly projection. Audit marketing campaign budget distribution or review unit pricing strategies.'
          });
        } else if (targetProgress > 80 && targetProgress < 100) {
          insights.push({
            type: 'success',
            product: p.product_name,
            title: `Nearing Target: ${targetProgress.toFixed(1)}% complete`,
            suggestion: 'Excellent progress. Secure inventory stock and scale digital advertising allocation.'
          });
        }
      }

      if (p.revenue > 0) {
        const netMarginPercent = (p.netProfit / p.revenue) * 100;
        if (netMarginPercent < 5 && p.netProfit < p.targetNet) {
          insights.push({
            type: 'info',
            product: p.product_name,
            title: `Compressed Net Margin: ${netMarginPercent.toFixed(1)}%`,
            suggestion: `High ad spend or operational leaks. Renegotiate shipping rates or optimize ad creative funnels.`
          });
        }
      }
    });

    if (actualSums.revenue > 0 && targetSums.sales > 0) {
      const overallRevProgress = (actualSums.revenue / targetSums.sales) * 100;
      if (overallRevProgress < 50) {
        insights.unshift({
          type: 'global',
          title: `Revenue Target Gap: ৳${(targetSums.sales - actualSums.revenue).toLocaleString()}`,
          suggestion: `Currently at ${overallRevProgress.toFixed(1)}% of sales targets. Promote high-performing product inventories.`
        });
      }
    }

    return insights;
  }, [liveActualsByProduct, targetSums, actualSums, monthRange]);

  const handleSaveReturnFee = () => {
    setReturnFee(Number(tempReturnFee) || 0);
    setIsEditingReturnFee(false);
  };

  const navTabs = [
    { id: 'all', label: 'All Overview', icon: Layers },
    { id: 'projections', label: '1. Target Projections', icon: Target },
    { id: 'actuals', label: '2. Live Analytics', icon: BarChart3 },
    { id: 'variance', label: '3. Variance Gauges', icon: PieChart },
    { id: 'ai_insights', label: '4. AI Playbook', icon: Sparkles }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8 space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Finance Plan & Projections</span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Finance Planning Board
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                if (isDirty) {
                  const newMonth = e.target.value;
                  confirmDialog({
                    title: 'Unsaved Changes',
                    description: 'You have unsaved changes. Discard them and switch month?',
                    confirmLabel: 'Discard & Switch',
                    isDanger: true,
                    onConfirm: () => setSelectedMonth(newMonth),
                  });
                } else {
                  setSelectedMonth(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m} value={m} className="bg-card text-foreground">{m}</option>
              ))}
            </select>
          </div>

          {/* Return Fee Config */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Return Fee:</span>
            {isEditingReturnFee ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={tempReturnFee}
                  onChange={(e) => setTempReturnFee(e.target.value)}
                  className="h-7 w-16 text-xs font-bold font-mono px-2 py-0"
                  autoFocus
                  onBlur={handleSaveReturnFee}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveReturnFee()}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingReturnFee(true)}
                className="text-xs font-bold font-mono text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                ৳{returnFee}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation (Scrollable Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Summary Cards (grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Planned Sales</p>
              <h3 className="text-base lg:text-lg font-bold font-mono text-foreground mt-0.5 truncate">৳{targetSums.sales.toLocaleString()}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{targetSums.qty} Units Target</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Delivered Rev</p>
              <h3 className="text-base lg:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">৳{actualSums.revenue.toLocaleString()}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{actualSums.delivered} Parcels Delivered</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn("p-3 rounded-xl shrink-0", targetSums.net >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Forecast Net</p>
              <h3 className={cn("text-base lg:text-lg font-bold font-mono mt-0.5 truncate", targetSums.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                ৳{targetSums.net.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">Investment: ৳{targetSums.investment.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn("p-3 rounded-xl shrink-0", actualSums.net >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Actual Live Net</p>
              <h3 className={cn("text-base lg:text-lg font-bold font-mono mt-0.5 truncate", actualSums.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                ৳{Math.round(actualSums.net).toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">Return Fees: ৳{actualSums.returnCost.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. Target Projections Worksheet */}
      {(activeTab === 'all' || activeTab === 'projections') && (
        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardHeader className="p-4 lg:p-6 pb-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="font-display text-lg font-bold text-foreground">
                  1. Target Projections Worksheet
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Define monthly sales targets, unit COGS, packaging, and ad budgets.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filter product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 w-44 lg:w-56 text-xs bg-background"
                  />
                </div>

                {/* View toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-8 gap-1.5 text-xs"
                >
                  {showAdvanced ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAdvanced ? 'Simple View' : 'Full Sheet'}</span>
                </Button>

                {/* Save & Discard Buttons */}
                {isDirty && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={discardEdits}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={triggerSaveGrid}
                      disabled={saving}
                      className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Plan</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 lg:p-6 pt-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading parameters...</p>
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
                <Layers className="w-8 h-8 stroke-1" />
                <p className="text-xs">No products match your search filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="font-bold text-foreground">Product Name</TableHead>
                      <TableHead className="text-center font-bold text-foreground bg-primary/5">Target Qty</TableHead>
                      <TableHead className="text-right font-bold text-foreground">MRP (৳)</TableHead>
                      <TableHead className="text-right font-bold text-foreground bg-secondary/80">Total Sales</TableHead>
                      <TableHead className="text-right font-bold text-foreground">Lifting (COGS)</TableHead>
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Gross Unit</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Total Gross</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Packing</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Total Pack</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">COD (৳)</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Total COD</TableHead>}
                      <TableHead className="text-right font-bold text-foreground">Ad BDT</TableHead>
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Ad USD</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">OPEX</TableHead>}
                      {showAdvanced && <TableHead className="text-right font-bold text-foreground">Total OPEX</TableHead>}
                      <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Net Unit</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Total Net</TableHead>
                      <TableHead className="text-right font-bold text-amber-600 dark:text-amber-400">Investment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTargets.map((row) => (
                      <TableRow key={row.product_name} className="hover:bg-secondary/30">
                        <TableCell className="font-semibold text-foreground">{row.product_name}</TableCell>
                        
                        {/* Target Qty */}
                        <TableCell className="p-1 bg-primary/5 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={row.target_sales_qty}
                            onChange={(e) => handleCellChange(row.product_name, 'target_sales_qty', e.target.value)}
                            className={cn(
                              "h-7 w-20 text-center text-xs font-mono font-bold mx-auto border-border bg-background focus:ring-1 focus:ring-primary",
                              editedCells[row.product_name]?.target_sales_qty && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            )}
                          />
                        </TableCell>

                        {/* MRP */}
                        <TableCell className="p-1 text-right">
                          <Input
                            type="number"
                            min="0"
                            value={row.mrp}
                            onChange={(e) => handleCellChange(row.product_name, 'mrp', e.target.value)}
                            className={cn(
                              "h-7 w-20 text-right text-xs font-mono font-bold ml-auto border-border bg-background focus:ring-1 focus:ring-primary",
                              editedCells[row.product_name]?.mrp && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            )}
                          />
                        </TableCell>

                        <TableCell className="text-right font-mono font-bold text-foreground bg-secondary/30">
                          ৳{row.totalSales.toLocaleString()}
                        </TableCell>

                        {/* Lifting */}
                        <TableCell className="p-1 text-right">
                          <Input
                            type="number"
                            min="0"
                            value={row.lifting_cost}
                            onChange={(e) => handleCellChange(row.product_name, 'lifting_cost', e.target.value)}
                            className={cn(
                              "h-7 w-20 text-right text-xs font-mono font-bold ml-auto border-border bg-background focus:ring-1 focus:ring-primary",
                              editedCells[row.product_name]?.lifting_cost && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            )}
                          />
                        </TableCell>

                        {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{row.grossUnit.toLocaleString()}</TableCell>}
                        {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{row.totalGross.toLocaleString()}</TableCell>}
                        
                        {showAdvanced && (
                          <TableCell className="p-1 text-right">
                            <Input
                              type="number"
                              min="0"
                              value={row.packing_cost}
                              onChange={(e) => handleCellChange(row.product_name, 'packing_cost', e.target.value)}
                              className={cn(
                                "h-7 w-20 text-right text-xs font-mono ml-auto border-border bg-background",
                                editedCells[row.product_name]?.packing_cost && "border-amber-500 bg-amber-500/10"
                              )}
                            />
                          </TableCell>
                        )}
                        {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{row.totalPack.toLocaleString()}</TableCell>}

                        {showAdvanced && (
                          <TableCell className="p-1 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={row.cod_cost}
                              onChange={(e) => handleCellChange(row.product_name, 'cod_cost', e.target.value)}
                              className={cn(
                                "h-7 w-20 text-right text-xs font-mono ml-auto border-border bg-background",
                                editedCells[row.product_name]?.cod_cost && "border-amber-500 bg-amber-500/10"
                              )}
                            />
                          </TableCell>
                        )}
                        {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{row.totalCod.toLocaleString()}</TableCell>}

                        {/* Ad BDT */}
                        <TableCell className="p-1 text-right">
                          <Input
                            type="number"
                            min="0"
                            value={row.ad_cost_unit_bdt}
                            onChange={(e) => handleCellChange(row.product_name, 'ad_cost_unit_bdt', e.target.value)}
                            className={cn(
                              "h-7 w-20 text-right text-xs font-mono font-bold ml-auto border-border bg-background focus:ring-1 focus:ring-primary",
                              editedCells[row.product_name]?.ad_cost_unit_bdt && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            )}
                          />
                        </TableCell>

                        {showAdvanced && (
                          <TableCell className="p-1 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.05"
                              value={row.ad_cost_unit_usd}
                              onChange={(e) => handleCellChange(row.product_name, 'ad_cost_unit_usd', e.target.value)}
                              className={cn(
                                "h-7 w-20 text-right text-xs font-mono ml-auto border-border bg-background",
                                editedCells[row.product_name]?.ad_cost_unit_usd && "border-amber-500 bg-amber-500/10"
                              )}
                            />
                          </TableCell>
                        )}

                        {showAdvanced && (
                          <TableCell className="p-1 text-right">
                            <Input
                              type="number"
                              min="0"
                              value={row.opex_cost_unit}
                              onChange={(e) => handleCellChange(row.product_name, 'opex_cost_unit', e.target.value)}
                              className={cn(
                                "h-7 w-20 text-right text-xs font-mono ml-auto border-border bg-background",
                                editedCells[row.product_name]?.opex_cost_unit && "border-amber-500 bg-amber-500/10"
                              )}
                            />
                          </TableCell>
                        )}
                        {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{row.totalOpex.toLocaleString()}</TableCell>}

                        {/* Net Unit */}
                        <TableCell className={cn("text-right font-mono font-bold", row.netUnit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          ৳{row.netUnit.toLocaleString()}
                        </TableCell>

                        {/* Total Net */}
                        <TableCell className={cn("text-right font-mono font-bold", row.totalNetProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          ৳{row.totalNetProfit.toLocaleString()}
                        </TableCell>

                        {/* Investment */}
                        <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          ৳{row.totalInvestment.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Grand Total Row */}
                    <TableRow className="bg-secondary/70 hover:bg-secondary/70 font-bold border-t-2 border-border">
                      <TableCell className="font-bold text-foreground">Grand Total</TableCell>
                      <TableCell className="text-center font-mono font-bold text-foreground">{targetSums.qty}</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">৳{targetSums.sales.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      {showAdvanced && <TableCell className="text-right font-mono">—</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{targetSums.gross.toLocaleString()}</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono">—</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{targetSums.pack.toLocaleString()}</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono">—</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{targetSums.cod.toLocaleString()}</TableCell>}
                      <TableCell className="text-right font-mono">—</TableCell>
                      {showAdvanced && <TableCell className="text-right font-mono">—</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono">—</TableCell>}
                      {showAdvanced && <TableCell className="text-right font-mono font-bold">৳{targetSums.opex.toLocaleString()}</TableCell>}
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className={cn("text-right font-mono font-bold", targetSums.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        ৳{targetSums.net.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        ৳{targetSums.investment.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Live Performance Analytics */}
      {(activeTab === 'all' || activeTab === 'actuals') && (
        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardHeader className="p-4 lg:p-6 pb-2">
            <CardTitle className="font-display text-lg font-bold text-foreground">
              2. Live Performance Analytics
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Live metrics from the CRM order base for the current billing cycle.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 lg:p-6 pt-2">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="font-bold text-foreground">Product</TableHead>
                    <TableHead className="text-center font-bold text-sky-600 dark:text-sky-400">Confirmed</TableHead>
                    <TableHead className="text-center font-bold text-emerald-600 dark:text-emerald-400">Delivered</TableHead>
                    <TableHead className="text-center font-bold text-rose-600 dark:text-rose-400">Returned</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Delivered Rev</TableHead>
                    <TableHead className="text-right font-bold text-rose-600 dark:text-rose-400">Return Fees</TableHead>
                    <TableHead className="text-right font-bold text-teal-600 dark:text-teal-400">Content Cost</TableHead>
                    <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Actual Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveActualsByProduct.map(row => (
                    <TableRow key={row.product_name} className="hover:bg-secondary/30">
                      <TableCell className="font-semibold text-foreground">{row.product_name}</TableCell>
                      <TableCell className="text-center font-mono font-semibold text-sky-600 dark:text-sky-400">{row.confirmedCount}</TableCell>
                      <TableCell className="text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{row.deliveredCount}</TableCell>
                      <TableCell className="text-center font-mono font-semibold text-rose-600 dark:text-rose-400">{row.cancelledCount}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">৳{row.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">৳{row.returnCost.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-teal-600 dark:text-teal-400">৳{row.contentCost.toLocaleString()}</TableCell>
                      <TableCell className={cn("text-right font-mono font-bold", row.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        ৳{Math.round(row.netProfit).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-secondary/70 hover:bg-secondary/70 font-bold border-t-2 border-border">
                    <TableCell className="font-bold text-foreground">Total Actuals</TableCell>
                    <TableCell className="text-center font-mono font-bold text-sky-600 dark:text-sky-400">{actualSums.confirmed}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{actualSums.delivered}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-rose-600 dark:text-rose-400">{actualSums.cancelled}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">৳{actualSums.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">৳{actualSums.returnCost.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-teal-600 dark:text-teal-400">৳{actualSums.content.toLocaleString()}</TableCell>
                    <TableCell className={cn("text-right font-mono font-bold", actualSums.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      ৳{Math.round(actualSums.net).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Target vs Live Variance Gauges */}
      {(activeTab === 'all' || activeTab === 'variance') && (
        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardHeader className="p-4 lg:p-6 pb-2">
            <CardTitle className="font-display text-lg font-bold text-foreground">
              3. Target vs Live Variance
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Live progress tracking towards targeted indicators.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 lg:p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Confirmations Volume Gauge */}
              <div className="p-4 rounded-xl border border-border bg-background shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmations Volume</span>
                  <span className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">
                    {targetSums.qty > 0 ? ((actualSums.confirmed / targetSums.qty) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-foreground">{actualSums.confirmed}</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">/ {targetSums.qty} Qty</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(targetSums.qty > 0 ? (actualSums.confirmed / targetSums.qty) * 100 : 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Delivered Sales Revenue Gauge */}
              <div className="p-4 rounded-xl border border-border bg-background shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivered Revenue</span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {targetSums.sales > 0 ? ((actualSums.revenue / targetSums.sales) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">৳{actualSums.revenue.toLocaleString()}</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">/ ৳{targetSums.sales.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(targetSums.sales > 0 ? (actualSums.revenue / targetSums.sales) * 100 : 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Net Operating Profits Gauge */}
              <div className="p-4 rounded-xl border border-border bg-background shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Operating Profits</span>
                  <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                    {targetSums.net > 0 ? ((actualSums.net / targetSums.net) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">৳{Math.round(actualSums.net).toLocaleString()}</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">/ ৳{targetSums.net.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(targetSums.net > 0 ? (actualSums.net / targetSums.net) * 100 : 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. AI Strategist Playbook Optimizer */}
      {(activeTab === 'all' || activeTab === 'ai_insights') && (
        <Card className="animate-slide-up border-border bg-card shadow-sm">
          <CardHeader className="p-4 lg:p-6 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <div>
                <CardTitle className="font-display text-lg font-bold text-foreground">
                  AI Strategist Playbook Optimizer
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Heuristics comparing live revenue data against marketing target budgets.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 lg:p-6 pt-2">
            {advisoryInsights.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <p>Operations are running optimally with zero margin leaks or volume gaps detected.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advisoryInsights.map((insight, idx) => {
                  const badgeVariantMap = {
                    danger: 'destructive',
                    warning: 'warning',
                    success: 'success',
                    info: 'info',
                    global: 'courier'
                  };
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-xl border border-border bg-background shadow-2xs space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={badgeVariantMap[insight.type] || 'default'}>
                          {insight.type === 'danger' && 'Margin Leak'}
                          {insight.type === 'warning' && 'Volume Gap'}
                          {insight.type === 'success' && 'Scaling Opportunity'}
                          {insight.type === 'info' && 'Margin Compression'}
                          {insight.type === 'global' && 'Strategic Notice'}
                        </Badge>
                        {insight.product && (
                          <span className="text-[11px] font-semibold text-muted-foreground truncate">{insight.product}</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.suggestion}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ⚠️ Risk Confirmation Overlay Modal */}
      <AnimatePresence>
        {riskModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h3 className="font-display text-base font-bold text-foreground">{riskModal.title}</h3>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <p className="leading-relaxed">{riskModal.message}</p>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-secondary/50 p-3 space-y-2">
                  <h4 className="font-bold text-foreground text-xs">Proposed target adjustments:</h4>
                  <ul className="space-y-1">
                    {riskModal.changes.map((c, i) => (
                      <li key={i} className="text-[11px] leading-tight">
                        <strong className="text-foreground">{c.product}</strong>: {c.details}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] leading-snug">
                  🚨 Saving skews marketing dashboard statistics. Verify parameters carefully before confirming.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={riskModal.onCancel}
                  className="text-xs"
                >
                  Discard changes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={riskModal.onConfirm}
                  className="text-xs font-semibold"
                >
                  Confirm & Write targets
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {ConfirmDialogComponent}
    </div>
  );
};
