'use client';
// @ts-nocheck
// src/pages/Checkout.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  User, Phone, MapPin, MessageSquare, ShoppingBag,
  CheckCircle, CheckCircle2, AlertCircle, Loader2, ChevronRight, Tag, Truck, CreditCard,
  ArrowLeft, Zap, Package, Mail, Trash2, Plus, Minus, X, Sparkles
} from 'lucide-react';
import useCartStore from '../store/cartStore';
import { supabase } from '../lib/supabase';
import { trackInitiateCheckout, trackPurchase } from '../lib/tracking';
import { recordDiscountUsage } from '../lib/discounts/db';
import { 
  getOrCreateCheckoutSessionId, 
  trackIncompleteCheckout, 
  convertIncompleteCheckout 
} from '../lib/checkout/session';

const formatPrice = (p) => `৳${Number(p).toLocaleString('en-BD')}`;

const DEFAULT_SHIPPING = {
  inside: 80,
  sub: 100,
  outside: 150
};

function generateOrderNumber() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RR-${now}-${rand}`;
}

// Get Client IP Address with timeout & fallback API
async function getClientIp() {
  try {
    const res = await Promise.race([
      fetch('https://api.ipify.org?format=json').then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
    ]);
    if (res?.ip) return res.ip;
  } catch (e) {
    console.warn('[IP Capture] Primary API failed:', e);
  }

  try {
    const res2 = await Promise.race([
      fetch('https://ipapi.co/json/').then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
    ]);
    if (res2?.ip) return res2.ip;
  } catch (e) {
    console.warn('[IP Capture] Fallback API failed:', e);
  }

  return null;
}

// Get traffic source/UTM medium from URL or referrer
function getTrafficSource() {
  try {
    const params = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : ''));
    const utm = params.get('utm_source') || params.get('source') || params.get('ref');
    if (utm) return utm;

    const referrer = document.referrer;
    if (referrer) {
      if (referrer.includes('facebook.com') || referrer.includes('fb.me')) return 'Facebook';
      if (referrer.includes('instagram.com')) return 'Instagram';
      if (referrer.includes('tiktok.com')) return 'TikTok';
      if (referrer.includes('google.com')) return 'Google';
      return new URL(referrer).hostname;
    }
  } catch {}
  return 'Direct';
}

/* ─── Order Summary Sidebar ─────────────────────────────────────────────── */
function OrderSummary({ 
  items, 
  subtotal, 
  shipping, 
  total,
  discountAmount = 0,
  freeShippingUnlocked = false,
  appliedCouponCode = '',
  discountTitle = '',
  couponInput = '',
  setCouponInput,
  couponLoading = false,
  couponError = null,
  onApplyCoupon,
  onRemoveCoupon
}) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-widest text-surface-muted">
          Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h3>
      </div>

      {/* Items List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3 p-2.5 rounded-2xl bg-white dark:bg-[#1C1613]/60 border border-[#E9E2D2] dark:border-white/10 shadow-sm relative">
            
            {/* Thumbnail */}
            <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-base-500 flex-shrink-0 border border-[#E9E2D2]">
              <img
                src={item.product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'}
                alt={item.product.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details & Interactive Controls */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-bold text-surface-primary line-clamp-1 leading-snug">
                  {item.product.name}
                </p>

                {/* Remove / Delete Item Button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0 active:scale-90"
                  title="Remove item"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <p className="text-[10px] text-surface-muted mt-0.5 truncate">
                Size: <span className="font-semibold text-surface-primary">{item.size}</span>
                {item.color && item.color !== 'None' && (
                  <> · Color: <span className="font-semibold text-surface-primary">{item.color}</span></>
                )}
              </p>

              {/* Quantity Stepper & Price Row */}
              <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#E9E2D2]/50">
                {/* Quantity Stepper (- 1 +) */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 border border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-white/20 transition-all active:scale-90 cursor-pointer"
                    title="Decrease quantity"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-black w-6 text-center text-surface-primary select-none font-mono">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-white/20 transition-all active:scale-90 cursor-pointer"
                    title="Increase quantity"
                    aria-label="Increase quantity"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <span className="text-xs font-black text-brand font-mono">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Coupon / Promo Code Input */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1613]/60 border border-[#E9E2D2] dark:border-white/10 space-y-2">
        {appliedCouponCode ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Tag size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200 uppercase">{appliedCouponCode}</span>
                {discountTitle && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 truncate">({discountTitle})</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveCoupon}
              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
              title="Remove promo code"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!couponLoading && couponInput.trim()) {
                        onApplyCoupon(e);
                      }
                    }
                  }}
                  className="w-full h-9 pl-8 pr-2.5 rounded-xl border border-input bg-background text-xs font-mono font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <button
                type="button"
                onClick={onApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="h-9 px-3 rounded-xl bg-[#1C1613] dark:bg-white text-white dark:text-[#1C1613] text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
              >
                {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
              </button>
            </div>
            {couponError && (
              <p className="text-[11px] text-red-500 dark:text-red-400 font-medium pl-1 leading-tight">{couponError}</p>
            )}
          </div>
        )}
      </div>

      <div className="divider" />

      {/* Totals Breakdown */}
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex items-center justify-between text-surface-muted">
          <span>Subtotal</span>
          <span className="font-semibold font-mono text-surface-primary">{formatPrice(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="flex items-center gap-1">
              <Tag size={12} /> Discount Savings
            </span>
            <span className="font-mono font-bold">- {formatPrice(discountAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-surface-muted">
          <div className="flex items-center gap-1.5">
            <Truck size={13} />
            <span>Delivery</span>
          </div>
          <span className={`font-semibold font-mono ${shipping === 0 || freeShippingUnlocked ? 'text-emerald-500 dark:text-emerald-400' : 'text-surface-primary'}`}>
            {shipping === 0 || freeShippingUnlocked ? 'FREE' : formatPrice(shipping)}
          </span>
        </div>
      </div>

      <div className="divider" />

      <div className="flex items-center justify-between">
        <span className="font-bold text-surface-primary">Total Amount</span>
        <span className="font-black text-xl text-brand font-mono">{formatPrice(total)}</span>
      </div>

      {/* Trust badges */}
      <div className="mt-4 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-2.5">
        <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
          Cash on Delivery available. Pay when your order arrives at your door.
        </p>
      </div>
    </div>
  );
}

/* ─── Field Component ───────────────────────────────────────────────────── */
function Field({ label, icon: Icon, required, children, hint }) {
  return (
    <div className="w-full min-w-0">
      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-surface-secondary mb-1.5">
        <Icon size={11} className="text-brand shrink-0" />
        <span className="truncate">{label}</span> {required && <span className="text-brand">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-surface-muted mt-1 leading-tight break-words">{hint}</p>}
    </div>
  );
}

/* ─── Success Screen ────────────────────────────────────────────────────── */
function SuccessScreen({ orderNumber, items, total, onContinue }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 pb-20 px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-emerald-900/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">

        {/* ── Icon ── */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
          className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center mb-6"
        >
          <CheckCircle size={32} className="text-emerald-400" strokeWidth={2} />
        </motion.div>

        {/* ── Heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand mb-3">
            Order Confirmed
          </p>
          <h1 className="font-black text-4xl text-surface-primary mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Thank you! 🔥
          </h1>
          <p className="text-surface-muted text-sm">
            Your order has been placed successfully.
          </p>
        </motion.div>

        {/* ── Order Number Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="card p-4 mb-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-muted mb-1">Order Number</p>
              <p className="font-mono font-black text-lg text-brand tracking-wide">{orderNumber}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-brand" />
            </div>
          </div>
          <div className="pt-3 border-t border-base-300/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-surface-muted">
              <Truck size={12} />
              <span className="text-xs">Cash on Delivery</span>
            </div>
            <span className="font-black text-base text-surface-primary">{formatPrice(total)}</span>
          </div>
        </motion.div>

        {/* ── Items ── */}
        {items && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="card p-4 mb-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-muted mb-3">
              What you ordered
            </p>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className="w-10 h-11 rounded-lg overflow-hidden bg-base-500 flex-shrink-0 border border-base-300">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-surface-primary line-clamp-1">{item.product.name}</p>
                    <p className="text-[11px] text-surface-muted mt-0.5">
                      Size {item.size}{item.color && item.color !== 'None' ? ` · Color ${item.color}` : ''} · ×{item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-black text-surface-primary flex-shrink-0">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── What Happens Next ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-4 mb-6"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-muted mb-4">
            What happens next
          </p>
          <div className="space-y-3">
            {[
              { icon: Phone,       label: 'Confirmation call',  desc: 'We\'ll call you shortly to confirm.',   color: 'text-brand bg-brand/10 border-brand/20' },
              { icon: Package,     label: 'Packing',            desc: 'Order packed & ready for dispatch.',   color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
              { icon: Truck,       label: 'Out for delivery',   desc: '2–4 business days to your door.',      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { icon: CheckCircle, label: 'Pay on arrival',     desc: 'Pay cash when order arrives.',         color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            ].map(({ icon: Icon, label, desc, color }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={12} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-surface-primary">{label}</p>
                  <p className="text-[11px] text-surface-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46 }}
        >
          <motion.button
            onClick={onContinue}
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-glow mb-3"
          >
            Continue Shopping
            <ChevronRight size={15} />
          </motion.button>
          <p className="text-center text-[10px] text-surface-muted leading-relaxed">
            Save your order number <span className="font-mono text-brand font-bold">{orderNumber}</span> for reference.
          </p>
        </motion.div>

      </div>
    </div>
  );
}

// Fraud control table availability flag to avoid repeated 404s
let isBlockedIpSupported = true;

/* ─── Main Checkout Page ───────────────────────────────────────────────── */
export default function Checkout() {
  const router = useRouter();
  const { 
    items, clearCart, appliedCouponCode, discountResult,
    setAppliedCoupon, setDiscountResult, clearDiscount 
  } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    // Force viewport to top immediately on mount
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => window.scrollTo(0, 0));
      const t1 = setTimeout(() => window.scrollTo(0, 0), 50);
      const t2 = setTimeout(() => window.scrollTo(0, 0), 150);
      setTimeout(() => clearTimeout(t1), 60);
      setTimeout(() => clearTimeout(t2), 160);
    }

    setMounted(true);
    const sid = getOrCreateCheckoutSessionId();
    setCheckoutSessionId(sid);

    // Restore confirmed order from URL query or session storage on page reload / direct navigation
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const orderParam = urlParams.get('order') || urlParams.get('order_id');
        const lastOrderStr = sessionStorage.getItem('putimach_last_order');
        if (lastOrderStr) {
          const parsed = JSON.parse(lastOrderStr);
          if (!orderParam || parsed?.orderNumber === orderParam || parsed?.id === orderParam) {
            setConfirmedOrder(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('[Checkout] Failed to restore confirmed order state:', e);
    }
  }, []);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderedItems, setOrderedItems] = useState([]);

  const [shippingRates, setShippingRates] = useState(DEFAULT_SHIPPING);
  const [shippingArea, setShippingArea] = useState('inside'); // 'inside' | 'sub' | 'outside'
  const [whatsappPhone, setWhatsappPhone] = useState('8801827406756');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Phone number validation state
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // If user pasted with +88 or 88, strip it
    val = val.replace(/^(\+880|880)/, '0');
    // Only keep numeric digits
    val = val.replace(/\D/g, '');
    // Limit to 11 digits
    if (val.length > 11) {
      val = val.slice(0, 11);
    }
    setForm(prev => ({ ...prev, phone: val }));
    if (phoneError) setPhoneError('');
  };

  const handlePhoneBlur = () => {
    const clean = form.phone.trim();
    if (clean.length > 0) {
      if (!clean.startsWith('01')) {
        setPhoneError('ফোন নম্বরটি অবশ্যই 01 দিয়ে শুরু হতে হবে');
      } else if (clean.length !== 11) {
        setPhoneError('ফোন নম্বরটি অবশ্যই ১১ ডিজিটের হতে হবে');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('');
    }
  };

  // Sync Incomplete Checkout Helper
  const syncIncompleteCheckout = useCallback(() => {
    if (!mounted || !checkoutSessionId || !items || items.length === 0 || confirmedOrder) return;

    const calculatedSub = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
    const discAmt = discountResult?.valid ? (discountResult.discount_amount || 0) : 0;
    const isFreeShip = Boolean(discountResult?.valid && discountResult.free_shipping);
    const baseShip = shippingArea === 'inside' ? shippingRates.inside : shippingArea === 'sub' ? shippingRates.sub : shippingRates.outside;
    const shipCost = isFreeShip ? 0 : baseShip;
    const estTotal = Math.max(0, calculatedSub - discAmt) + shipCost;

    trackIncompleteCheckout({
      checkout_session_id: checkoutSessionId,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: form.email,
      shipping_address: form.address,
      city: form.city,
      area: shippingArea === 'inside' ? 'Inside Dhaka' : shippingArea === 'sub' ? 'Sub Dhaka' : 'Outside Dhaka',
      items,
      subtotal: calculatedSub,
      discount: discAmt,
      shipping_cost: shipCost,
      estimated_total: estTotal
    });
  }, [
    form.name, form.phone, form.email, form.address, form.city, 
    shippingArea, items, discountResult, shippingRates, 
    mounted, confirmedOrder, checkoutSessionId
  ]);

  // Debounced Incomplete Checkout Heartbeat Tracking (400ms)
  useEffect(() => {
    if (!mounted || !checkoutSessionId || !items || items.length === 0 || confirmedOrder) return;

    const timer = setTimeout(() => {
      syncIncompleteCheckout();
    }, 400);

    return () => clearTimeout(timer);
  }, [syncIncompleteCheckout, mounted, checkoutSessionId, items, confirmedOrder]);

  // Flush on page exit / visibility change / tab switch
  useEffect(() => {
    const handleExit = () => {
      syncIncompleteCheckout();
    };
    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', handleExit);
    document.addEventListener('visibilitychange', handleExit);
    return () => {
      window.removeEventListener('pagehide', handleExit);
      window.removeEventListener('beforeunload', handleExit);
      document.removeEventListener('visibilitychange', handleExit);
    };
  }, [syncIncompleteCheckout]);

  useEffect(() => {
    async function loadContactPhone() {
      try {
        let contactData = null;
        const { data: sData } = await supabase.from('site_settings').select('data').eq('id', 'contact_info').maybeSingle();
        if (sData?.data) {
          contactData = sData.data;
        } else {
          const { data: cData } = await supabase.from('cb_settings').select('data').eq('id', 'contact_info').maybeSingle();
          contactData = cData?.data;
        }
        const raw = contactData?.whatsapp || contactData?.phone || '01827406756';
        const clean = raw.replace(/[^0-9]/g, '');
        const formatted = clean.startsWith('880') ? clean : clean.startsWith('0') ? `88${clean}` : `880${clean}`;
        setWhatsappPhone(formatted);
      } catch (err) {
        console.warn('Failed to load contact phone:', err);
      }
    }
    loadContactPhone();
  }, []);

  useEffect(() => {
    async function loadRates() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('data')
          .eq('id', 'shipping_rates')
          .maybeSingle();
        if (data && data.data) {
          setShippingRates({
            inside: Number(data.data.inside ?? DEFAULT_SHIPPING.inside),
            sub: Number(data.data.sub ?? DEFAULT_SHIPPING.sub),
            outside: Number(data.data.outside ?? DEFAULT_SHIPPING.outside)
          });
        }
      } catch (err) {
        console.warn('Failed to load dynamic shipping rates, using defaults:', err);
      }
    }
    loadRates();
  }, []);

  // Real-time discount re-validation whenever items, coupon code, or customer contact changes
  useEffect(() => {
    async function revalidateDiscount() {
      if (!items || items.length === 0) {
        setDiscountResult(null);
        return;
      }

      try {
        const payload = {
          code: appliedCouponCode || undefined,
          items: items.map(i => ({
            key: i.key,
            product: {
              id: i.product.id,
              slug: i.product.slug,
              name: i.product.name,
              price: i.product.price,
              category: i.product.category,
              collections: i.product.collections,
              variants: i.product.variants
            },
            size: i.size,
            color: i.color,
            quantity: i.quantity
          })),
          customer: {
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            is_guest: true
          }
        };

        const res = await fetch('/api/discounts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data && data.valid) {
          setDiscountResult(data);
          setCouponError(null);
        } else {
          setDiscountResult(null);
          if (appliedCouponCode && data?.error) {
            setCouponError(data.error);
          }
        }
      } catch (err) {
        console.warn('Failed to validate discount at checkout:', err);
      }
    }

    revalidateDiscount();
  }, [items, appliedCouponCode, form.phone, form.email]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const payload = {
        code: clean,
        items: items.map(i => ({
          key: i.key,
          product: {
            id: i.product.id,
            slug: i.product.slug,
            name: i.product.name,
            price: i.product.price,
            category: i.product.category,
            collections: i.product.collections,
            variants: i.product.variants
          },
          size: i.size,
          color: i.color,
          quantity: i.quantity
        })),
        customer: {
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          is_guest: true
        }
      };

      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data && data.valid) {
        setAppliedCoupon(clean);
        setDiscountResult(data);
        setCouponInput('');
        setCouponError(null);
      } else {
        setCouponError(data?.error || 'Invalid discount code.');
      }
    } catch (err) {
      setCouponError('Failed to apply discount code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearDiscount();
    setCouponError(null);
  };

  // Fire InitiateCheckout when user arrives on checkout page (once, when items are ready)
  const initiateCheckoutFired = useRef(false);
  useEffect(() => {
    if (items.length > 0 && !initiateCheckoutFired.current) {
      initiateCheckoutFired.current = true;
      trackInitiateCheckout(items, subtotal);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountAmount = discountResult?.valid ? (discountResult.discount_amount || 0) : 0;
  const isFreeShippingUnlocked = Boolean(discountResult?.valid && discountResult.free_shipping);

  const baseShipping = shippingArea === 'inside'
    ? shippingRates.inside
    : shippingArea === 'sub'
      ? shippingRates.sub
      : shippingRates.outside;

  const finalShipping = isFreeShippingUnlocked ? 0 : baseShipping;
  const total = Math.max(0, subtotal - discountAmount) + finalShipping;

  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || submitting) return;
    if (items.length === 0) return;

    isSubmittingRef.current = true;
    setSubmitting(true);
    setError('');

    // Phone validation: must start with 01 and be exactly 11 digits
    const cleanPhone = form.phone.trim().replace(/\D/g, '');
    if (!cleanPhone.startsWith('01')) {
      setError('ফোন নম্বরটি অবশ্যই 01 দিয়ে শুরু হতে হবে। (Phone number must start with 01)');
      setPhoneError('ফোন নম্বরটি অবশ্যই 01 দিয়ে শুরু হতে হবে');
      setSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    if (cleanPhone.length !== 11) {
      setError('ফোন নম্বরটি অবশ্যই ১১ ডিজিটের হতে হবে। (Phone number must be exactly 11 digits)');
      setPhoneError('ফোন নম্বরটি অবশ্যই ১১ ডিজিটের হতে হবে');
      setSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    if (!form.name.trim()) {
      setError('আপনার নাম লিখুন। (Please enter your name)');
      setSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    if (!form.address.trim()) {
      setError('আপনার সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন। (Please enter your full address)');
      setSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    const num = generateOrderNumber();

    // 1. IP Capture & Traffic Source
    const ipAddress = await getClientIp();
    const trafficSource = getTrafficSource();

    // 2. Blocked IP Addresses Guard (Fake Order Protection)
    if (ipAddress && isBlockedIpSupported) {
      try {
        const { data: blockedIpData, error: ipErr } = await supabase
          .from('blocked_ip_addresses')
          .select('ip_address, reason')
          .eq('ip_address', ipAddress)
          .eq('is_active', true)
          .maybeSingle();

        if (ipErr) {
          if (
            ipErr.code === 'PGRST204' || 
            ipErr.code === 'PGRST205' || 
            ipErr.code === '42P01' || 
            ipErr.message?.includes('not found') ||
            ipErr.message?.includes('does not exist')
          ) {
            isBlockedIpSupported = false;
          }
        } else if (blockedIpData) {
          setError('Your IP address has been restricted from placing orders due to suspicious activity. Please contact support.');
          setSubmitting(false);
          isSubmittingRef.current = false;
          return;
        }
      } catch (ipCheckErr) {
        isBlockedIpSupported = false;
      }
    }

    // 3. Duplicate Order Check (Spam Prevention)
    try {
      const cleanPhone = form.phone.trim();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let duplicateQuery = supabase
        .from('orders')
        .select('id, created_at')
        .gte('created_at', fiveMinutesAgo);

      if (ipAddress) {
        duplicateQuery = duplicateQuery.or(`phone.eq.${cleanPhone},ip_address.eq.${ipAddress}`);
      } else {
        duplicateQuery = duplicateQuery.eq('phone', cleanPhone);
      }

      const { data: recentOrders } = await duplicateQuery;

      if (recentOrders && recentOrders.length > 0) {
        setError('A similar order has already been placed recently. Please wait a few minutes before trying again.');
        setSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }
    } catch (dupCheckErr) {
      console.warn('Failed to verify duplicate orders:', dupCheckErr);
    }

    // 4. Server-Side Final Discount Re-validation
    let finalDiscountResult = null;
    let validatedDiscountAmount = 0;
    let validatedFreeShipping = false;

    try {
      const valRes = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: appliedCouponCode || undefined,
          items: items.map(i => ({
            key: i.key,
            product: {
              id: i.product.id,
              slug: i.product.slug,
              name: i.product.name,
              price: i.product.price,
              category: i.product.category,
              collections: i.product.collections,
              variants: i.product.variants
            },
            size: i.size,
            color: i.color,
            quantity: i.quantity
          })),
          customer: {
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            is_guest: true
          }
        })
      });

      const valData = await valRes.json();
      if (valData && valData.valid) {
        finalDiscountResult = valData;
        validatedDiscountAmount = valData.discount_amount || 0;
        validatedFreeShipping = Boolean(valData.free_shipping);
      }
    } catch (valErr) {
      console.warn('Server discount revalidation failed, proceeding with current values:', valErr);
    }

    const calculatedFinalShipping = validatedFreeShipping ? 0 : baseShipping;
    const calculatedFinalAmount = Math.max(0, subtotal - validatedDiscountAmount) + calculatedFinalShipping;
    const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const mainProduct = items[0]?.product;

    // Compose rich metadata in notes
    const extraDetails: string[] = [];
    if (appliedCouponCode && validatedDiscountAmount > 0) {
      extraDetails.push(`Coupon: ${appliedCouponCode} (-৳${validatedDiscountAmount})`);
    }
    if (shippingArea) {
      extraDetails.push(`Zone: ${shippingArea === 'inside' ? 'Inside Dhaka (৳80)' : 'Outside Dhaka (৳150)'}`);
    }
    let enrichedNotes = form.note.trim();
    if (extraDetails.length > 0) {
      enrichedNotes = enrichedNotes
        ? `${enrichedNotes}\n[${extraDetails.join(' | ')}]`
        : `[${extraDetails.join(' | ')}]`;
    }

    const orderPayload: any = {
      id: num,
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: `${form.address.trim()}${form.city.trim() ? ', ' + form.city.trim() : ''}`,
      product_name: mainProduct?.name || 'Product',
      size: items.map(i => i.size).filter(Boolean).join(', ') || 'Standard',
      quantity: totalItemCount,
      items: totalItemCount,
      amount: calculatedFinalAmount,
      shipping_zone: shippingArea === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka',
      notes: enrichedNotes || null,
      source: 'Website',
      status: 'New',
      payment_status: 'Unpaid',
      inventory_deducted: true,
      ip_address: ipAddress || null,
      traffic_source: trafficSource || null,
      ordered_items: items.map(i => ({
        id: i.product.id,
        name: i.product.name,
        slug: i.product.slug,
        image: i.product.image,
        price: i.product.price,
        size: i.size,
        color: i.color || null,
        quantity: i.quantity,
        line_total: i.product.price * i.quantity,
      }))
    };

    try {
      let { data: insertResult, error: dbError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select('id, amount, customer_name, status')
        .maybeSingle();

      // Fallback: If any unrecognized column caused error, remove email/notes and retry
      if (dbError && (dbError.message?.toLowerCase().includes('email') || dbError.code === 'PGRST204')) {
        console.warn('[Checkout] Retrying order insert without optional email column...');
        const fallbackPayload = { ...orderPayload };
        delete fallbackPayload.email;
        if (orderPayload.email) {
          fallbackPayload.notes = `[Email: ${orderPayload.email}]` + (fallbackPayload.notes ? `\n${fallbackPayload.notes}` : '');
        }
        const retryRes = await supabase.from('orders').insert([fallbackPayload]).select('id, amount, customer_name, status').maybeSingle();
        dbError = retryRes.error;
        insertResult = retryRes.data;
      }

      if (dbError) {
        throw new Error(dbError.message || 'Database error: Could not complete order creation.');
      }

      // ─── ORDER CONFIRMED BY DATABASE ───
      const confirmedOrderNumber = insertResult?.id || num;
      const orderedItemsSnapshot = [...items];

      // Build durable success record
      const successRecord = {
        orderNumber: confirmedOrderNumber,
        items: orderedItemsSnapshot,
        total: calculatedFinalAmount,
        customerName: form.name.trim(),
        phone: form.phone.trim(),
        address: `${form.address.trim()}${form.city.trim() ? ', ' + form.city.trim() : ''}`,
        createdAt: new Date().toISOString()
      };

      // 1. Persist to sessionStorage so refresh/back-button never loses order info
      try {
        sessionStorage.setItem('putimach_last_order', JSON.stringify(successRecord));
        sessionStorage.setItem(`order_success_${confirmedOrderNumber}`, JSON.stringify(successRecord));
      } catch (e) {}

      // 2. Update URL query param with confirmed order
      try {
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/checkout?order=${confirmedOrderNumber}`);
        }
      } catch (e) {}

      // 3. Set confirmed order in React state
      setConfirmedOrder(successRecord);
      setOrderNumber(confirmedOrderNumber);
      setOrderedItems(orderedItemsSnapshot);

      // 4. ONLY NOW CLEAR THE CART (Cart is preserved if anything above failed)
      clearCart();

      // 5. Async side-effects (non-blocking)
      try {
        await convertIncompleteCheckout(checkoutSessionId, confirmedOrderNumber);
      } catch (_) {}

      try {
        if (finalDiscountResult?.discount?.id) {
          await recordDiscountUsage(finalDiscountResult.discount.id, form.phone || form.email || 'guest', confirmedOrderNumber);
        }
      } catch (_) {}

      try {
        trackPurchase(
          {
            ...orderPayload,
            id: confirmedOrderNumber,
            ordered_items: orderedItemsSnapshot.map(i => ({
              id: i.product.id,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
              size: i.size,
            })),
            shipping_fee: finalShipping,
          },
          { phone: form.phone, email: form.email }
        );
      } catch (_) {}

      // 6. Update inventory & variant stock in background
      for (const item of orderedItemsSnapshot) {
        try {
          const { data: dbProductRow } = await supabase
            .from('products')
            .select('id, data')
            .eq('id', item.product.id)
            .maybeSingle();

          if (dbProductRow && dbProductRow.data) {
            const productData = dbProductRow.data;
            let updatedVariants = Array.isArray(productData.variants) ? [...productData.variants] : [];

            if (updatedVariants.length > 0) {
              updatedVariants = updatedVariants.map(v => {
                const sizeMatch = !v.size || String(v.size).trim().toLowerCase() === String(item.size || '').trim().toLowerCase();
                const colorMatch = !v.color || String(v.color).trim().toLowerCase() === String(item.color || '').trim().toLowerCase();
                if (sizeMatch && colorMatch) {
                  const newQty = Math.max(0, (Number(v.stock) || 0) - item.quantity);
                  return { ...v, stock: newQty };
                }
                return v;
              });
            }

            const totalStock = updatedVariants.length > 0
              ? updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
              : Math.max(0, (Number(productData.stock) || 0) - item.quantity);
            const inStock = totalStock > 0;

            const updatedProductPayload = {
              ...productData,
              stock: totalStock,
              variants: updatedVariants,
              in_stock: inStock
            };

            await supabase
              .from('products')
              .update({ data: updatedProductPayload })
              .eq('id', dbProductRow.id);

            try {
              await supabase
                .from('cb_products')
                .update({ data: updatedProductPayload })
                .eq('id', dbProductRow.id);
            } catch (_) {}

            // Deduct from inventory record
            const targetInventoryId = productData.inventory_id;
            if (targetInventoryId) {
              await supabase
                .from('inventory')
                .update({ current_stock: totalStock })
                .eq('id', targetInventoryId);
            } else {
              await supabase
                .from('inventory')
                .update({ current_stock: totalStock })
                .eq('product_id', dbProductRow.id);
            }
          }
        } catch (e) {
          console.error('Failed to update variant stock for item:', item.product.id, e);
        }
      }

    } catch (err) {
      console.error('[Checkout Submission Error]:', err);
      setError(err.message || 'Order could not be created. Your cart is preserved.');
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // 1. If an order was confirmed, show SuccessScreen
  if (confirmedOrder) {
    return (
      <SuccessScreen 
        orderNumber={confirmedOrder.orderNumber || orderNumber} 
        items={confirmedOrder.items || orderedItems} 
        total={confirmedOrder.total ?? total} 
        onContinue={() => {
          try {
            sessionStorage.removeItem('putimach_last_order');
          } catch (e) {}
          router.push('/');
        }} 
      />
    );
  }

  // 2. Loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-brand" size={32} />
          <p className="text-xs text-surface-muted">Loading your order details...</p>
        </div>
      </div>
    );
  }

  // 3. If cart is empty AND no confirmed order, show empty cart notice
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShoppingBag size={48} className="text-surface-muted mx-auto" />
          <h2 className="font-black text-2xl">Your cart is empty</h2>
          <p className="text-surface-muted text-sm">Add products before checking out.</p>
          <Link href="/shop" prefetch={true} className="btn-primary mx-auto inline-block text-center cursor-pointer">
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative w-full max-w-full overflow-x-hidden">
      {/* Subtle background glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-orange-900/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container-site py-6 sm:py-8 lg:py-12 relative z-10 w-full max-w-full min-w-0 px-3.5 sm:px-6 lg:px-8">
        {/* Back button */}
        <motion.button
          onClick={() => router.back()}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-surface-muted hover:text-surface-primary text-sm font-medium transition-colors mb-6 sm:mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </motion.button>

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 sm:mb-8 w-full max-w-full min-w-0"
        >
          <p className="section-label mb-1">Secure Checkout</p>
          <h1 className="font-black text-2xl sm:text-3xl md:text-4xl text-surface-primary tracking-tight">Complete Your Order</h1>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 xl:gap-12 w-full max-w-full min-w-0">
          {/* ── Left: Form ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-4 sm:space-y-5 w-full max-w-full min-w-0"
          >
            {/* Delivery Info Card */}
            <div className="card p-4 sm:p-6 space-y-4 sm:space-y-5 rounded-2xl w-full max-w-full min-w-0 overflow-hidden">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/20 flex items-center justify-center">
                  <Truck size={14} className="text-brand" />
                </div>
                <h2 className="font-black text-base text-surface-primary">Delivery Information</h2>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <Field label="Full Name" icon={User} required>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={setField('name')}
                  className="input"
                  id="checkout-name"
                />
              </Field>

              <Field 
                label="Phone Number" 
                icon={Phone} 
                required 
                hint={phoneError ? undefined : "11-digit mobile number starting with 01"}
              >
                <div className="relative">
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="^01[0-9]{9}$"
                    maxLength={11}
                    value={form.phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    className={`input font-mono ${
                      phoneError ? '!border-red-500 !ring-2 !ring-red-500/20 bg-red-500/5' : ''
                    }`}
                    id="checkout-phone"
                  />
                  {form.phone.length === 11 && form.phone.startsWith('01') && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
                {phoneError && (
                  <p className="text-[11px] font-bold text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </Field>

              <Field label="Email Address" icon={Mail} hint="Optional — For order updates and confirmations">
                <input
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  className="input"
                  id="checkout-email"
                />
              </Field>

              <Field label="Shipping Area" icon={Truck} required>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0">
                  {[
                    { id: 'inside', label: 'Inside Dhaka', fee: shippingRates.inside },
                    { id: 'sub', label: 'Sub Dhaka', subtitle: 'Narayanganj, Gazipur, Keraniganj', fee: shippingRates.sub },
                    { id: 'outside', label: 'Outside Dhaka', fee: shippingRates.outside }
                  ].map((area) => {
                    const isSelected = shippingArea === area.id;
                    return (
                      <button
                        type="button"
                        key={area.id}
                        onClick={() => setShippingArea(area.id)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 flex sm:flex-col justify-between items-center sm:items-start gap-2.5 min-w-0 cursor-pointer select-none active:scale-[0.98] ${
                          isSelected
                            ? 'border-[#C5A880] bg-[#C5A880]/15 shadow-sm ring-2 ring-[#C5A880]/30'
                            : 'border-[#E9E2D2] bg-white hover:border-[#C5A880]/50 hover:bg-[#FDFBF7]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-start gap-2.5">
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-[#C5A880]' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-[#C5A880]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-[#1C1613] leading-snug">{area.label}</p>
                            {area.subtitle && (
                              <p className="text-[10px] font-semibold text-[#C5A880] mt-0.5 leading-tight">{area.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <p className="font-black text-sm text-[#C5A880] shrink-0 sm:mt-2 sm:pl-6.5">৳{area.fee}</p>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Full Address" icon={MapPin} required hint="House/flat no., road, area">
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={setField('address')}
                  className="input resize-none"
                  id="checkout-address"
                />
              </Field>

              <Field label="Order Note" icon={MessageSquare}>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={setField('note')}
                  className="input resize-none"
                  id="checkout-note"
                />
              </Field>
            </div>

            {/* Payment Method Card */}
            <div className="card p-4 sm:p-6 rounded-2xl w-full max-w-full min-w-0 overflow-hidden">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/20 flex items-center justify-center">
                  <CreditCard size={14} className="text-brand" />
                </div>
                <h2 className="font-black text-base text-surface-primary">Payment Method</h2>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl border-2 border-brand/40 bg-brand/5 flex items-center gap-3 w-full min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-surface-primary">Cash on Delivery</p>
                  <p className="text-[10px] text-surface-muted mt-0.5">Pay when you receive your order</p>
                </div>
                <div className="ml-auto w-5 h-5 rounded-full border-2 border-brand flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Order Summary (Desktop & Mobile) ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 w-full max-w-full min-w-0"
          >
            <div className="card p-4 sm:p-6 lg:sticky lg:top-24 space-y-4 sm:space-y-5 rounded-2xl w-full max-w-full min-w-0 overflow-hidden">
              {/* WhatsApp Size Assistance / Help Banner */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-between gap-2.5 sm:gap-3 shadow-sm w-full min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.151 4.204 4.294-1.127z"/>
                    </svg>
                  </div>
                  <div className="text-xs min-w-0 flex-1">
                    <p className="font-bold text-[#1C1613] dark:text-white leading-tight">সাইজ বা অর্ডার নিয়ে কনফিউশন?</p>
                    <p className="text-[10px] text-surface-muted truncate">হোয়াটসঅ্যাপে সরাসরি কথা বলুন</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent("হ্যালো PutiMach! আমি চেকআউটে আছি, অর্ডার/সাইজ সম্পর্কিত সাহায্য প্রয়োজন।")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 active:scale-95"
                >
                  <span>WhatsApp</span>
                </a>
              </div>

              <OrderSummary 
                items={items} 
                subtotal={subtotal} 
                shipping={finalShipping} 
                total={total}
                discountAmount={discountAmount}
                freeShippingUnlocked={isFreeShippingUnlocked}
                appliedCouponCode={appliedCouponCode}
                discountTitle={discountResult?.discount_title || ''}
                couponInput={couponInput}
                setCouponInput={setCouponInput}
                couponLoading={couponLoading}
                couponError={couponError}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
              />

              {/* Submit Place Order Button */}
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full py-3.5 sm:py-4 rounded-xl bg-brand hover:bg-brand-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 shadow-glow hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Place Order · {formatPrice(total)}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-surface-muted">
                By placing your order you agree to our Terms & Privacy Policy.
                Your data is secure and encrypted.
              </p>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
