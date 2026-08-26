'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, Sparkles, Tag, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';
import { trackViewCart, trackRemoveFromCart } from '../../lib/tracking';

export default function CartDrawer() {
  const { 
    isOpen, closeCart, items, updateQuantity, removeItem, 
    getSubtotal, appliedCouponCode, discountResult, 
    setAppliedCoupon, setDiscountResult, clearDiscount,
    revalidationNotice
  } = useCartStore();
  const router = useRouter();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Track ViewCart when drawer opens with items
  useEffect(() => {
    if (isOpen && items && items.length > 0) {
      trackViewCart(items, getSubtotal());
    }
  }, [isOpen]);

  // Auto-validate discount whenever items or coupon code changes
  useEffect(() => {
    async function validateCurrentDiscount() {
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
          }))
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
        console.warn('Discount validation error in cart:', err);
      }
    }

    if (isOpen) {
      validateCurrentDiscount();
    }
  }, [items, appliedCouponCode, isOpen]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }))
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
    } catch (err: any) {
      setCouponError('Failed to apply discount code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearDiscount();
    setCouponError(null);
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const calculatedSubtotal = typeof getSubtotal === 'function' 
    ? getSubtotal() 
    : items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);

  const discountAmount = discountResult?.discount_amount || 0;
  const isFreeShippingUnlocked = discountResult?.free_shipping || false;
  const finalCalculatedTotal = Math.max(0, calculatedSubtotal - discountAmount);

  const freeShippingThreshold = 3000;
  const progressPercent = Math.min(100, Math.round((calculatedSubtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - calculatedSubtotal);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 z-[10000] bg-[#1C1613]/75 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-[10001] w-full max-w-md flex flex-col bg-[#FDFBF7] border-l border-[#E9E2D2] shadow-2xl text-[#1C1613]"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[#E9E2D2] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F7F4EE] border border-[#E9E2D2] flex items-center justify-center text-[#1C1613]">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 className="font-serif font-black text-lg text-[#1C1613] leading-none">Shopping Cart</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">Your luxury selections</p>
                </div>
                {totalItemsCount > 0 && (
                  <span className="bg-[#1C1613] text-[#C5A880] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ml-1">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              <button 
                onClick={closeCart} 
                className="w-9 h-9 rounded-full bg-[#F7F4EE] hover:bg-[#1C1613] hover:text-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] transition-colors active:scale-95 cursor-pointer"
                aria-label="Close Cart"
              >
                <X size={18} />
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            {items.length > 0 && (
              <div className="bg-[#F4EFE6] px-6 py-3 border-b border-[#E9E2D2] text-xs">
                <div className="flex items-center justify-between mb-1.5 font-medium text-xs text-[#1C1613]">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold">
                    <Truck size={14} className="text-[#C5A880]" />
                    {isFreeShippingUnlocked ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Sparkles size={12} /> Promotion Unlocked: FREE Delivery!
                      </span>
                    ) : remainingForFreeShipping > 0 ? (
                      <>Add <span className="font-black text-[#FF5533]">{formatPrice(remainingForFreeShipping)}</span> more for FREE Delivery!</>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Sparkles size={12} /> You unlocked FREE Express Delivery!
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">{isFreeShippingUnlocked ? '100%' : `${progressPercent}%`}</span>
                </div>
                <div className="w-full h-1.5 bg-[#E9E2D2] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#C5A880] to-[#FF5533] rounded-full transition-all duration-500" 
                    style={{ width: isFreeShippingUnlocked ? '100%' : `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 scrollbar-none">
              {/* Revalidation Notice */}
              {revalidationNotice && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-2">
                  <span>{revalidationNotice}</span>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-full gap-4 text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#F7F4EE] border border-[#E9E2D2] flex items-center justify-center text-[#C5A880]">
                      <ShoppingBag size={32} />
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-xl text-[#1C1613] mb-1">Your Bag is Empty</h3>
                      <p className="text-xs text-gray-500 max-w-[240px]">Explore our exclusive drop and find your signature style.</p>
                    </div>
                    <button
                      onClick={closeCart}
                      className="mt-2 px-6 py-2.5 bg-[#1C1613] text-[#C5A880] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#FF5533] hover:text-white transition-colors cursor-pointer"
                    >
                      Start Shopping
                    </button>
                  </motion.div>
                ) : (
                  items.map((item) => {
                    const isItemDisabled = item.isUnavailable || item.isOutOfStock;
                    return (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "p-3 bg-white rounded-2xl border flex gap-3.5 shadow-xs relative group transition-colors",
                          isItemDisabled ? "border-amber-300 bg-amber-50/20" : "border-[#E9E2D2]"
                        )}
                      >
                        {/* Product Thumbnail */}
                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#F7F4EE] shrink-0 border border-[#E9E2D2]/60 relative">
                          <img 
                            src={item.product?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'} 
                            alt={item.product?.name}
                            className={cn("w-full h-full object-cover", isItemDisabled ? "grayscale opacity-75" : "")}
                          />
                          {isItemDisabled && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                              <span className="text-[9px] font-black uppercase text-white bg-rose-600 px-1 py-0.5 rounded">
                                {item.isUnavailable ? 'Unavailable' : 'Out of Stock'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Info & Stepper */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-[#1C1613] truncate">{item.product?.name}</h4>
                              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                Size: <span className="text-[#1C1613] font-bold">{item.size}</span>
                                {item.color && item.color !== 'None' && (
                                  <> · Color: <span className="text-[#1C1613] font-bold">{item.color}</span></>
                                )}
                              </p>
                              {item.unavailabilityReason && (
                                <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                                  {item.unavailabilityReason}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                trackRemoveFromCart(item.product, item.quantity, item.size, item.color);
                                removeItem(item.key);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                              aria-label="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#E9E2D2]/40">
                            <span className="font-mono font-bold text-xs text-[#1C1613]">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>

                            {!isItemDisabled ? (
                              <div className="flex items-center gap-1 bg-[#F7F4EE] rounded-lg p-0.5 border border-[#E9E2D2]">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                  className="w-7 h-7 flex items-center justify-center text-[#1C1613] hover:bg-white rounded-lg transition-colors cursor-pointer active:scale-90"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-6 text-center text-xs font-black font-mono select-none">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                  className="w-7 h-7 flex items-center justify-center text-[#1C1613] hover:bg-white rounded-lg transition-colors cursor-pointer active:scale-90"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  trackRemoveFromCart(item.product, item.quantity, item.size, item.color);
                                  removeItem(item.key);
                                }}
                                className="text-[11px] font-bold text-rose-600 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Footer Area with Promo Input & Order Breakdown */}
            {items.length > 0 && (
              <div className="p-6 bg-white border-t border-[#E9E2D2] space-y-4 shadow-lg relative z-10">
                
                {/* Coupon Code Box */}
                {appliedCouponCode && discountResult?.valid ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-emerald-600" />
                      <div>
                        <span className="font-mono font-black text-emerald-800 tracking-wide">{appliedCouponCode}</span>
                        <span className="text-[11px] text-emerald-600 ml-1.5 font-semibold">({discountResult.discount_title || 'Applied'})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-gray-400 hover:text-red-500 text-[11px] font-bold p-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Discount code (e.g. SAVE20)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          disabled={couponLoading}
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#F7F4EE] border border-[#E9E2D2] text-[#1C1613] placeholder-gray-400 font-mono uppercase focus:outline-none focus:border-[#C5A880] transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2 bg-[#1C1613] text-white text-xs font-bold rounded-xl hover:bg-[#FF5533] disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        {couponLoading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[10px] text-red-500 font-semibold pl-1">{couponError}</p>
                    )}
                  </form>
                )}

                {/* Subtotal & Totals */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-[#1C1613]">{formatPrice(calculatedSubtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-700 font-bold">
                      <span>Discount ({discountResult?.discount_code})</span>
                      <span className="font-mono">- {formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className="text-emerald-700 font-bold">
                      {isFreeShippingUnlocked || remainingForFreeShipping === 0 ? 'FREE' : 'Calculated at checkout'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E9E2D2]/60 text-sm font-black font-serif text-[#1C1613]">
                    <span>Total Amount</span>
                    <span className="font-mono text-base text-[#1C1613]">
                      {formatPrice(finalCalculatedTotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout Primary Button */}
                {items.some(i => i.isUnavailable || i.isOutOfStock) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof useCartStore.getState().removeUnavailableItems === 'function') {
                        useCartStore.getState().removeUnavailableItems();
                      }
                    }}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-center"
                  >
                    <span>Remove Unavailable Items to Checkout</span>
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    id="cart-proceed-checkout-btn"
                    onClick={() => closeCart()}
                    prefetch={true}
                    className="w-full py-4 bg-[#1C1613] hover:bg-[#FF5533] text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md active:scale-98 group cursor-pointer text-center"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}

                {/* Security Trust Badge */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider font-semibold pt-0.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Secure 256-Bit Encrypted Checkout</span>
                </div>

              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
