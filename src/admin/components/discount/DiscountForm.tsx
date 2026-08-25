'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Save, Sparkles, Tag, Gift, Percent, Truck, Layers, 
  Calendar, Users, ShieldAlert, Check, Copy, AlertCircle, 
  ShoppingBag, CheckCircle2, AlertTriangle, Loader2, ChevronRight,
  Sliders, Plus, Trash2, X
} from 'lucide-react';
import { 
  Discount, 
  DiscountType, 
  DiscountMethod, 
  DiscountValueType, 
  DiscountStatus,
  DiscountTarget 
} from '@/lib/discounts/types';
import { Button } from '../Button';
import { Switch } from '../ui/switch';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  category?: string;
  price?: number;
  image?: string;
}

interface DiscountFormProps {
  initialDiscount?: Discount | null;
  categories?: CategoryItem[];
  products?: ProductItem[];
  onSave: (discountData: Discount, isDraft?: boolean) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export const DiscountForm: React.FC<DiscountFormProps> = ({
  initialDiscount = null,
  categories = [],
  products = [],
  onSave,
  onCancel,
  isSaving = false
}) => {
  const isEditMode = Boolean(initialDiscount && initialDiscount.id);

  // Step 1: Type Selection (if new)
  const [selectedType, setSelectedType] = useState<DiscountType>(initialDiscount?.type || 'amount_off_products');
  const [method, setMethod] = useState<DiscountMethod>(initialDiscount?.method || 'code');
  const [title, setTitle] = useState(initialDiscount?.title || '');
  const [code, setCode] = useState(initialDiscount?.code || '');
  const [status, setStatus] = useState<DiscountStatus>(initialDiscount?.status || 'active');

  // Value
  const [valueType, setValueType] = useState<DiscountValueType>(initialDiscount?.value_type || 'percentage');
  const [value, setValue] = useState<number | string>(initialDiscount?.value !== undefined ? initialDiscount.value : 20);

  // Target
  const [targetType, setTargetType] = useState<string>(initialDiscount?.target?.type || 'all');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(initialDiscount?.target?.ids || []);

  // Buy X Get Y (BXGY) State
  const [bxgyBuysType, setBxgyBuysType] = useState<'quantity' | 'amount'>(initialDiscount?.bxgy_rule?.customer_buys?.type || 'quantity');
  const [bxgyBuysValue, setBxgyBuysValue] = useState<number | string>(initialDiscount?.bxgy_rule?.customer_buys?.value || 2);
  const [bxgyBuysTargetType, setBxgyBuysTargetType] = useState<string>(initialDiscount?.bxgy_rule?.customer_buys?.target?.type || 'all');
  const [bxgyBuysTargetIds, setBxgyBuysTargetIds] = useState<string[]>(initialDiscount?.bxgy_rule?.customer_buys?.target?.ids || []);

  const [bxgyGetsQuantity, setBxgyGetsQuantity] = useState<number | string>(initialDiscount?.bxgy_rule?.customer_gets?.quantity || 1);
  const [bxgyGetsTargetType, setBxgyGetsTargetType] = useState<string>(initialDiscount?.bxgy_rule?.customer_gets?.target?.type || 'all');
  const [bxgyGetsTargetIds, setBxgyGetsTargetIds] = useState<string[]>(initialDiscount?.bxgy_rule?.customer_gets?.target?.ids || []);
  const [bxgyRewardType, setBxgyRewardType] = useState<'free' | 'percentage' | 'fixed_amount'>(initialDiscount?.bxgy_rule?.customer_gets?.reward_type || 'free');
  const [bxgyRewardValue, setBxgyRewardValue] = useState<number | string>(initialDiscount?.bxgy_rule?.customer_gets?.reward_value || 100);
  const [bxgyMaxApplications, setBxgyMaxApplications] = useState<number | string>(initialDiscount?.bxgy_rule?.max_applications_per_order || '');

  // Minimum Requirements
  const [minReqType, setMinReqType] = useState<'none' | 'min_amount' | 'min_quantity'>(initialDiscount?.min_requirement_type || 'none');
  const [minReqValue, setMinReqValue] = useState<number | string>(initialDiscount?.min_requirement_value || '');

  // Customer Eligibility
  const [customerEligibility, setCustomerEligibility] = useState<'all' | 'registered' | 'guest' | 'specific_customers'>(initialDiscount?.customer_eligibility || 'all');
  const [eligibleCustomerInput, setEligibleCustomerInput] = useState<string>(
    Array.isArray(initialDiscount?.eligible_customer_ids) ? initialDiscount.eligible_customer_ids.join(', ') : ''
  );

  // Usage Limits
  const [hasTotalUsageLimit, setHasTotalUsageLimit] = useState(Boolean(initialDiscount?.total_usage_limit));
  const [totalUsageLimit, setTotalUsageLimit] = useState<number | string>(initialDiscount?.total_usage_limit || 100);
  const [hasPerCustomerLimit, setHasPerCustomerLimit] = useState(Boolean(initialDiscount?.per_customer_usage_limit));
  const [perCustomerLimit, setPerCustomerLimit] = useState<number | string>(initialDiscount?.per_customer_usage_limit || 1);

  // Schedule
  const getTodayIso = () => new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(initialDiscount?.start_date ? initialDiscount.start_date.slice(0, 10) : getTodayIso());
  const [hasEndDate, setHasEndDate] = useState(Boolean(initialDiscount?.end_date));
  const [endDate, setEndDate] = useState(initialDiscount?.end_date ? initialDiscount.end_date.slice(0, 10) : '');

  // Combinations
  const [combineWithProduct, setCombineWithProduct] = useState(Boolean(initialDiscount?.combinations?.combine_with_product_discounts));
  const [combineWithOrder, setCombineWithOrder] = useState(Boolean(initialDiscount?.combinations?.combine_with_order_discounts));
  const [combineWithShipping, setCombineWithShipping] = useState(Boolean(initialDiscount?.combinations?.combine_with_shipping_discounts));

  // Dirty tracker
  const [isDirty, setIsDirty] = useState(false);

  // Helper to generate a random uppercase discount code
  const generateRandomCode = () => {
    const prefixes = ['SAVE', 'DROP', 'VIP', 'RUST', 'REVIVE', 'DEAL', 'FEST'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generated = `${randomPrefix}${randomSuffix}`;
    setCode(generated);
    if (!title) setTitle(generated);
    setIsDirty(true);
  };

  // Build Live Summary Description
  const summaryDetails = useMemo(() => {
    let typeLabel = '';
    let valLabel = '';

    if (selectedType === 'amount_off_products') {
      typeLabel = 'Amount off products';
      valLabel = valueType === 'percentage' ? `${value}% off` : `৳${value} off`;
    } else if (selectedType === 'buy_x_get_y') {
      typeLabel = 'Buy X Get Y';
      const rewardText = bxgyRewardType === 'free' ? 'FREE' : bxgyRewardType === 'percentage' ? `${bxgyRewardValue}% OFF` : `৳${bxgyRewardValue} OFF`;
      valLabel = `Buy ${bxgyBuysValue} ${bxgyBuysType === 'amount' ? 'BDT' : 'items'} → Get ${bxgyGetsQuantity} at ${rewardText}`;
    } else if (selectedType === 'amount_off_order') {
      typeLabel = 'Amount off order';
      valLabel = valueType === 'percentage' ? `${value}% off entire order` : `৳${value} off entire order`;
    } else if (selectedType === 'free_shipping') {
      typeLabel = 'Free shipping';
      valLabel = 'Free standard shipping on qualifying orders';
    }

    const minText = minReqType === 'min_amount' 
      ? `Minimum purchase of ৳${Number(minReqValue).toLocaleString()}` 
      : minReqType === 'min_quantity' 
        ? `Minimum quantity of ${minReqValue} items` 
        : 'No minimum purchase requirement';

    const customerText = customerEligibility === 'all' 
      ? 'All customers' 
      : customerEligibility === 'registered' 
        ? 'Registered accounts only' 
        : customerEligibility === 'guest' 
          ? 'Guest customers only' 
          : 'Specific customer list';

    const usageText = hasTotalUsageLimit 
      ? `Limit of ${totalUsageLimit} total uses` 
      : 'Unlimited total uses';

    const perCustomerText = hasPerCustomerLimit 
      ? `Limit of ${perCustomerLimit} use per customer` 
      : 'No per-customer limit';

    const activeText = hasEndDate && endDate 
      ? `Active from ${startDate} to ${endDate}` 
      : `Active from ${startDate}`;

    return {
      typeLabel,
      valLabel,
      minText,
      customerText,
      usageText,
      perCustomerText,
      activeText
    };
  }, [
    selectedType, valueType, value, bxgyBuysType, bxgyBuysValue, 
    bxgyGetsQuantity, bxgyRewardType, bxgyRewardValue, minReqType, 
    minReqValue, customerEligibility, hasTotalUsageLimit, totalUsageLimit, 
    hasPerCustomerLimit, perCustomerLimit, startDate, hasEndDate, endDate
  ]);

  const handleSubmit = async (e?: React.FormEvent, overrideDraft = false) => {
    if (e) e.preventDefault();

    if (method === 'code' && !code.trim()) {
      Swal.fire({
        title: 'Discount Code Required',
        text: 'Please enter a discount code or generate one.',
        icon: 'warning',
        confirmButtonColor: '#0F172A'
      });
      return;
    }

    if (!title.trim() && method === 'automatic') {
      Swal.fire({
        title: 'Title Required',
        text: 'Please enter a title for this automatic discount.',
        icon: 'warning',
        confirmButtonColor: '#0F172A'
      });
      return;
    }

    const finalStatus: DiscountStatus = overrideDraft ? 'draft' : status;
    const finalId = initialDiscount?.id || `disc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const finalCode = method === 'code' ? code.trim().toUpperCase() : undefined;

    const payload: Discount = {
      id: finalId,
      title: title.trim() || finalCode || 'Discount',
      code: finalCode,
      method,
      type: selectedType,
      status: finalStatus,
      value_type: (selectedType === 'amount_off_products' || selectedType === 'amount_off_order') ? valueType : undefined,
      value: (selectedType === 'amount_off_products' || selectedType === 'amount_off_order') ? Number(value) : undefined,
      target: selectedType === 'amount_off_products' ? {
        type: targetType as any,
        ids: selectedTargetIds
      } : undefined,
      bxgy_rule: selectedType === 'buy_x_get_y' ? {
        customer_buys: {
          type: bxgyBuysType,
          value: Number(bxgyBuysValue) || 1,
          target: { type: bxgyBuysTargetType as any, ids: bxgyBuysTargetIds }
        },
        customer_gets: {
          quantity: Number(bxgyGetsQuantity) || 1,
          target: { type: bxgyGetsTargetType as any, ids: bxgyGetsTargetIds },
          reward_type: bxgyRewardType,
          reward_value: bxgyRewardType !== 'free' ? Number(bxgyRewardValue) : 100
        },
        max_applications_per_order: bxgyMaxApplications ? Number(bxgyMaxApplications) : undefined
      } : undefined,
      min_requirement_type: minReqType,
      min_requirement_value: minReqType !== 'none' ? Number(minReqValue) : undefined,
      customer_eligibility: customerEligibility,
      eligible_customer_ids: customerEligibility === 'specific_customers' 
        ? eligibleCustomerInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) 
        : undefined,
      total_usage_limit: hasTotalUsageLimit ? Number(totalUsageLimit) : null,
      per_customer_usage_limit: hasPerCustomerLimit ? Number(perCustomerLimit) : null,
      usage_count: initialDiscount?.usage_count || 0,
      start_date: new Date(startDate).toISOString(),
      end_date: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
      combinations: {
        combine_with_product_discounts: combineWithProduct,
        combine_with_order_discounts: combineWithOrder,
        combine_with_shipping_discounts: combineWithShipping
      },
      created_at: initialDiscount?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await onSave(payload, overrideDraft);
      setIsDirty(false);
    } catch (err: any) {
      console.error('Failed to save discount:', err);
    }
  };

  const handleCancelWithCheck = () => {
    if (isDirty) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to discard them?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep Editing',
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#0F172A'
      }).then((result) => {
        if (result.isConfirmed) onCancel();
      });
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-7xl mx-auto font-sans">
      {/* ── Top Header Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancelWithCheck}
            className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title="Back to discounts"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-display">
                {isEditMode ? (title || code || 'Edit Discount') : 'Create Discount'}
              </h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                status === 'active' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                status === 'draft' ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" :
                status === 'scheduled' ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" :
                "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              )}>
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure promotion method, rules, eligibility, and usage limits.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelWithCheck}
            className="rounded-xl text-xs font-semibold"
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSubmit(undefined, false)}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm px-4"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? 'Saving...' : 'Save Discount'}</span>
          </Button>
        </div>
      </div>

      {/* ── DISCOUNT TYPE SELECTOR (Cards) ── */}
      {!isEditMode && (
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Select Discount Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                type: 'amount_off_products',
                title: 'Amount off products',
                desc: 'Discount specific products or collections with % or fixed amount.',
                icon: Tag
              },
              {
                type: 'buy_x_get_y',
                title: 'Buy X Get Y',
                desc: 'Buy qualifying products and receive another item free or discounted.',
                icon: Gift
              },
              {
                type: 'amount_off_order',
                title: 'Amount off order',
                desc: 'Discount the entire order amount (% or fixed ৳).',
                icon: Percent
              },
              {
                type: 'free_shipping',
                title: 'Free shipping',
                desc: 'Remove courier shipping charges when conditions are met.',
                icon: Truck
              }
            ].map((card) => {
              const isSelected = selectedType === card.type;
              const Icon = card.icon;
              return (
                <div
                  key={card.type}
                  onClick={() => { setSelectedType(card.type as any); setIsDirty(true); }}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer select-none relative group flex flex-col justify-between space-y-3",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20" 
                      : "border-border bg-card hover:border-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{card.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN MAIN WORKBENCH ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT MAIN COLUMN (~65%) ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. METHOD & CODE / TITLE */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Discount Method
              </label>
              <div className="flex rounded-xl bg-muted p-1 border border-border">
                <button
                  type="button"
                  onClick={() => { setMethod('code'); setIsDirty(true); }}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    method === 'code' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Discount Code
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('automatic'); setIsDirty(true); }}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    method === 'automatic' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Automatic Discount
                </button>
              </div>
            </div>

            {method === 'code' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-foreground">
                    Discount Code <span className="text-destructive">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Sparkles size={11} /> Generate Random Code
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. SAVE20, WINTERDROP, FREESHIP"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setIsDirty(true); }}
                  className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm font-mono font-bold uppercase tracking-wide focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Customers will enter this code at checkout.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Title / Promotion Banner <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Buy 2 Get 1 Free Promo, Ramadan Flat 15% Off"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                  className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Customers will see this title in their cart and checkout summary automatically.</p>
              </div>
            )}
          </div>

          {/* 2. VALUE & TARGET (for amount_off_products & amount_off_order) */}
          {(selectedType === 'amount_off_products' || selectedType === 'amount_off_order') && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground">Discount Value</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Type</label>
                  <div className="flex rounded-xl bg-muted p-1 border border-border">
                    <button
                      type="button"
                      onClick={() => { setValueType('percentage'); setIsDirty(true); }}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
                        valueType === 'percentage' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                      )}
                    >
                      <Percent size={12} /> Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => { setValueType('fixed_amount'); setIsDirty(true); }}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
                        valueType === 'fixed_amount' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                      )}
                    >
                      <span>৳</span> Fixed Amount
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Value</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-muted-foreground select-none">
                      {valueType === 'percentage' ? '%' : '৳'}
                    </span>
                    <input
                      type="number"
                      placeholder={valueType === 'percentage' ? '20' : '250'}
                      value={value}
                      onChange={(e) => { setValue(e.target.value); setIsDirty(true); }}
                      className="w-full h-10 pl-8 pr-3 rounded-xl border border-input bg-background text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      min={0}
                      max={valueType === 'percentage' ? 100 : undefined}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Specific Product / Collection Targeting */}
              {selectedType === 'amount_off_products' && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="text-xs font-bold text-foreground">Applies to</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All Products' },
                      { id: 'specific_categories', label: 'Specific Categories' },
                      { id: 'specific_products', label: 'Specific Products' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setTargetType(t.id); setSelectedTargetIds([]); setIsDirty(true); }}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer",
                          targetType === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {targetType === 'specific_categories' && (
                    <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs font-bold text-foreground">Select Categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((c) => {
                          const isSel = selectedTargetIds.includes(c.slug);
                          return (
                            <button
                              key={c.id || c.slug}
                              type="button"
                              onClick={() => {
                                setSelectedTargetIds(prev => 
                                  isSel ? prev.filter(id => id !== c.slug) : [...prev, c.slug]
                                );
                                setIsDirty(true);
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                                isSel ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                              )}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {targetType === 'specific_products' && (
                    <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs font-bold text-foreground">Select Products:</p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {products.map((p) => {
                          const isSel = selectedTargetIds.includes(p.id) || selectedTargetIds.includes(p.slug);
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedTargetIds(prev => 
                                  isSel ? prev.filter(id => id !== p.id && id !== p.slug) : [...prev, p.id]
                                );
                                setIsDirty(true);
                              }}
                              className={cn(
                                "p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors",
                                isSel ? "bg-primary/10 border-primary text-foreground font-bold" : "bg-card border-border hover:bg-muted"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <img src={p.image || ''} alt="" className="w-7 h-7 rounded object-cover shrink-0 bg-muted" />
                                <span className="truncate">{p.name}</span>
                              </div>
                              <span className="font-mono text-[11px] shrink-0 font-semibold">৳{p.price}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. BUY X GET Y RULES (for BXGY) */}
          {selectedType === 'buy_x_get_y' && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">Buy X Get Y Rules</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Specify customer qualifying purchases and their rewarded items.</p>
              </div>

              {/* Customer Buys Section */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">1. Customer Buys</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Threshold Type</label>
                    <select
                      value={bxgyBuysType}
                      onChange={(e) => { setBxgyBuysType(e.target.value as any); setIsDirty(true); }}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium outline-none cursor-pointer"
                    >
                      <option value="quantity">Minimum quantity of items</option>
                      <option value="amount">Minimum purchase amount (BDT)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Quantity / Amount Required</label>
                    <input
                      type="number"
                      value={bxgyBuysValue}
                      onChange={(e) => { setBxgyBuysValue(e.target.value); setIsDirty(true); }}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono font-bold outline-none"
                      placeholder="2"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Gets Section */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">2. Customer Gets</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Reward Quantity</label>
                    <input
                      type="number"
                      value={bxgyGetsQuantity}
                      onChange={(e) => { setBxgyGetsQuantity(e.target.value); setIsDirty(true); }}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono font-bold outline-none"
                      placeholder="1"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Reward At</label>
                    <select
                      value={bxgyRewardType}
                      onChange={(e) => { setBxgyRewardType(e.target.value as any); setIsDirty(true); }}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="free">Free (100% Off)</option>
                      <option value="percentage">Percentage Discount</option>
                      <option value="fixed_amount">Fixed Amount Discount</option>
                    </select>
                  </div>

                  {bxgyRewardType !== 'free' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Reward Value</label>
                      <input
                        type="number"
                        value={bxgyRewardValue}
                        onChange={(e) => { setBxgyRewardValue(e.target.value); setIsDirty(true); }}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono font-bold outline-none"
                        placeholder={bxgyRewardType === 'percentage' ? '50%' : '৳300'}
                      />
                    </div>
                  )}
                </div>

                {/* Max applications */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Max applications per order (optional):</span>
                  <input
                    type="number"
                    placeholder="e.g. 3 (leave empty for unlimited)"
                    value={bxgyMaxApplications}
                    onChange={(e) => { setBxgyMaxApplications(e.target.value); setIsDirty(true); }}
                    className="h-8 w-44 px-2.5 rounded-lg border border-input bg-background text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. MINIMUM REQUIREMENTS */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Minimum Purchase Requirements</h3>
            
            <div className="space-y-2">
              {[
                { id: 'none', label: 'No minimum requirements' },
                { id: 'min_amount', label: 'Minimum purchase amount (BDT)' },
                { id: 'min_quantity', label: 'Minimum quantity of items' }
              ].map((r) => (
                <label key={r.id} className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="minReqType"
                    checked={minReqType === r.id}
                    onChange={() => { setMinReqType(r.id as any); setIsDirty(true); }}
                    className="rounded-full border-input text-primary"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            {minReqType !== 'none' && (
              <div className="pt-2 animate-in fade-in duration-200">
                <input
                  type="number"
                  placeholder={minReqType === 'min_amount' ? 'e.g. 2,000' : 'e.g. 3'}
                  value={minReqValue}
                  onChange={(e) => { setMinReqValue(e.target.value); setIsDirty(true); }}
                  className="w-full sm:w-64 h-9 px-3 rounded-xl border border-input bg-background text-xs font-mono font-bold outline-none"
                  required
                />
              </div>
            )}
          </div>

          {/* 5. COMBINATIONS */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-foreground">Combinations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Control whether this discount can be used together with other promotions.</p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Product Discounts</p>
                  <p className="text-[11px] text-muted-foreground">Can be combined with individual item discounts.</p>
                </div>
                <Switch
                  checked={combineWithProduct}
                  onCheckedChange={(c) => { setCombineWithProduct(c); setIsDirty(true); }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Order Discounts</p>
                  <p className="text-[11px] text-muted-foreground">Can be combined with entire cart order discounts.</p>
                </div>
                <Switch
                  checked={combineWithOrder}
                  onCheckedChange={(c) => { setCombineWithOrder(c); setIsDirty(true); }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Shipping Discounts</p>
                  <p className="text-[11px] text-muted-foreground">Can be combined with Free Shipping promotions.</p>
                </div>
                <Switch
                  checked={combineWithShipping}
                  onCheckedChange={(c) => { setCombineWithShipping(c); setIsDirty(true); }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT SECONDARY COLUMN (~35%) ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* LIVE SUMMARY CARD */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles size={13} /> Live Summary
              </span>
              <span className="font-mono font-bold text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                {method === 'code' ? (code || 'CODE') : 'AUTOMATIC'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-base font-extrabold text-foreground">{title || code || summaryDetails.typeLabel}</h4>
                <p className="text-xs font-bold text-primary mt-0.5">{summaryDetails.valLabel}</p>
              </div>

              <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-primary/10">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{summaryDetails.minText}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{summaryDetails.customerText}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{summaryDetails.usageText}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{summaryDetails.activeText}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* STATUS */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Discount Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setIsDirty(true); }}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-bold outline-none cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* CUSTOMER ELIGIBILITY */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Customer Eligibility
            </label>
            <select
              value={customerEligibility}
              onChange={(e) => { setCustomerEligibility(e.target.value as any); setIsDirty(true); }}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">All customers</option>
              <option value="registered">Registered accounts only</option>
              <option value="guest">Guest customers only</option>
              <option value="specific_customers">Specific customer phone / email</option>
            </select>

            {customerEligibility === 'specific_customers' && (
              <div className="pt-2">
                <textarea
                  rows={2}
                  placeholder="Enter phone numbers or emails separated by comma"
                  value={eligibleCustomerInput}
                  onChange={(e) => { setEligibleCustomerInput(e.target.value); setIsDirty(true); }}
                  className="w-full p-2.5 rounded-xl border border-input bg-background text-xs font-mono outline-none"
                />
              </div>
            )}
          </div>

          {/* USAGE LIMITS */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Usage Limits
            </label>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTotalUsageLimit}
                    onChange={(e) => { setHasTotalUsageLimit(e.target.checked); setIsDirty(true); }}
                    className="rounded border-input text-primary"
                  />
                  <span>Limit number of times this discount can be used in total</span>
                </label>
                {hasTotalUsageLimit && (
                  <input
                    type="number"
                    value={totalUsageLimit}
                    onChange={(e) => { setTotalUsageLimit(e.target.value); setIsDirty(true); }}
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-xs font-mono font-bold"
                    placeholder="100"
                  />
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPerCustomerLimit}
                    onChange={(e) => { setHasPerCustomerLimit(e.target.checked); setIsDirty(true); }}
                    className="rounded border-input text-primary"
                  />
                  <span>Limit to one use per customer</span>
                </label>
              </div>
            </div>
          </div>

          {/* ACTIVE DATES */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3.5 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Active Dates</span>
            </label>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-foreground">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setIsDirty(true); }}
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => { setHasEndDate(e.target.checked); setIsDirty(true); }}
                    className="rounded border-input text-primary"
                  />
                  <span>Set end date</span>
                </label>
                {hasEndDate && (
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setIsDirty(true); }}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono"
                  />
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── STICKY BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-t border-border px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDirty ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                <AlertTriangle size={13} /> Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={13} /> All changes saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelWithCheck}
              className="rounded-xl text-xs font-semibold px-4 h-9"
            >
              Discard
            </Button>

            {status !== 'draft' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSaving}
                onClick={() => handleSubmit(undefined, true)}
                className="rounded-xl text-xs font-bold px-4 h-9"
              >
                Save as Draft
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => handleSubmit(undefined, false)}
              className="rounded-xl text-xs font-bold px-6 h-9 gap-2 shadow-sm"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'Saving...' : 'Save Discount'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
