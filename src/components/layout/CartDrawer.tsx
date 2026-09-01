'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { formatPrice, cn } from '../../lib/utils';
import { trackViewCart, trackRemoveFromCart } from '../../lib/tracking';

export default function CartDrawer() {
  const { 
    isOpen, 
    closeCart, 
    items, 
    updateQuantity, 
    removeItem, 
    getSubtotal, 
    discountResult,
    revalidationNotice
  } = useCartStore();
  const router = useRouter();

  // Track ViewCart when drawer opens with items
  useEffect(() => {
    if (isOpen && items && items.length > 0) {
      trackViewCart(items, getSubtotal());
    }
  }, [isOpen]);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const calculatedSubtotal = typeof getSubtotal === 'function' 
    ? getSubtotal() 
    : items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);

  const discountAmount = discountResult?.discount_amount || 0;
  const isFreeShippingUnlocked = discountResult?.free_shipping || false;
  const finalCalculatedTotal = Math.max(0, calculatedSubtotal - discountAmount);

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
            transition={{ duration: 0.22 }}
            onClick={closeCart}
            className="fixed inset-0 z-[10000] bg-[#1C1613]/70 backdrop-blur-xs"
          />

          {/* Drawer Container */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-[10001] w-full max-w-full sm:max-w-[440px] flex flex-col bg-[#FDFBF7] border-l border-[#E9E2D2] shadow-2xl text-[#1C1613] overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#E9E2D2] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F7F4EE] border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] shrink-0">
                  <ShoppingBag size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-black text-base sm:text-lg text-[#1C1613] leading-none truncate">
                      Shopping Cart
                    </h2>
                    {totalItemsCount > 0 && (
                      <span className="bg-[#1C1613] text-[#C5A880] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0">
                        {totalItemsCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">Your luxury selections</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={closeCart} 
                className="w-9 h-9 rounded-xl bg-[#F7F4EE] hover:bg-[#1C1613] hover:text-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] transition-colors active:scale-95 cursor-pointer shrink-0 ml-2"
                aria-label="Close Cart"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Product Items List */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 sm:px-6 py-4 space-y-3 scrollbar-none">
              {/* Revalidation Notice if any */}
              {revalidationNotice && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between gap-2">
                  <span>{revalidationNotice}</span>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center min-h-[320px] h-full gap-4 text-center py-12 px-4"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-[#F7F4EE] border border-[#E9E2D2] flex items-center justify-center text-[#C5A880] shadow-xs">
                      <ShoppingBag size={32} />
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-xl text-[#1C1613] mb-1">Your Cart is Empty</h3>
                      <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed mx-auto">
                        Explore our latest drops and discover your signature pieces.
                      </p>
                    </div>
                    <Link
                      href="/shop"
                      prefetch={true}
                      onClick={() => closeCart()}
                      className="mt-2 px-6 py-3 bg-[#1C1613] hover:bg-[#FF5533] text-[#C5A880] hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95 inline-block text-center"
                    >
                      Browse Shop
                    </Link>
                  </motion.div>
                ) : (
                  items.map((item) => {
                    const isItemDisabled = item.isUnavailable || item.isOutOfStock;
                    const itemImage = item.product?.image || item.product?.images?.[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                    const hasColor = item.color && item.color !== 'None' && item.color !== 'Standard';

                    return (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "p-3 sm:p-3.5 bg-white rounded-2xl border flex gap-3 sm:gap-3.5 shadow-xs relative group transition-colors",
                          isItemDisabled ? "border-amber-300 bg-amber-50/20" : "border-[#E9E2D2]"
                        )}
                      >
                        {/* Product Thumbnail */}
                        <div className="w-20 h-24 sm:w-22 sm:h-26 rounded-xl overflow-hidden bg-[#F7F4EE] shrink-0 border border-[#E9E2D2]/80 relative">
                          <img 
                            src={itemImage} 
                            alt={item.product?.name || 'Product'}
                            className={cn("w-full h-full object-cover", isItemDisabled ? "grayscale opacity-75" : "")}
                            loading="lazy"
                          />
                          {isItemDisabled && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-1 text-center backdrop-blur-[1px]">
                              <span className="text-[9px] font-black uppercase text-white bg-rose-600 px-1.5 py-0.5 rounded">
                                {item.isUnavailable ? 'Unavailable' : 'Out of Stock'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Info & Controls */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          {/* Top: Title & Delete */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-xs sm:text-sm text-[#1C1613] leading-snug line-clamp-2 break-words">
                                {item.product?.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  trackRemoveFromCart(item.product, item.quantity, item.size, item.color);
                                  removeItem(item.key);
                                }}
                                className="text-gray-400 hover:text-red-500 p-1.5 -mr-1 -mt-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                aria-label="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Badges: Size & Color */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {item.size && (
                                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F7F4EE] border border-[#E9E2D2] text-[#1C1613]">
                                  Size: <strong className="ml-1 font-bold">{item.size}</strong>
                                </span>
                              )}
                              {hasColor && (
                                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F7F4EE] border border-[#E9E2D2] text-[#1C1613]">
                                  Color: <strong className="ml-1 font-bold">{item.color}</strong>
                                </span>
                              )}
                            </div>

                            {item.unavailabilityReason && (
                              <p className="text-[10px] text-rose-600 font-bold mt-1">
                                {item.unavailabilityReason}
                              </p>
                            )}
                          </div>

                          {/* Bottom: Price & Stepper */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E9E2D2]/60">
                            <div>
                              <span className="font-mono font-bold text-sm sm:text-base text-[#1C1613]">
                                {formatPrice(item.product.price * item.quantity)}
                              </span>
                              {item.quantity > 1 && (
                                <p className="text-[10px] text-gray-400 font-mono">
                                  {formatPrice(item.product.price)} each
                                </p>
                              )}
                            </div>

                            {!isItemDisabled ? (
                              <div className="flex items-center gap-1 bg-[#F7F4EE] rounded-xl p-0.5 border border-[#E9E2D2]">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#1C1613] hover:bg-white rounded-lg transition-colors cursor-pointer active:scale-90"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-6 sm:w-7 text-center text-xs sm:text-sm font-black font-mono select-none">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#1C1613] hover:bg-white rounded-lg transition-colors cursor-pointer active:scale-90"
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
                                className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
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

              {/* Extra spacing at the bottom of the scroll container to ensure the last item is never cut off */}
              <div className="h-4" />
            </div>

            {/* Fixed Bottom Checkout Summary & CTA */}
            {items.length > 0 && (
              <div className="p-4 sm:p-6 bg-white border-t border-[#E9E2D2] space-y-3.5 shadow-2xl relative z-10 shrink-0">
                {/* Cost Breakdown */}
                <div className="space-y-1.5 text-xs sm:text-sm">
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

                  <div className="flex items-center justify-between text-gray-500 text-[11px] sm:text-xs">
                    <span>Shipping</span>
                    <span className="text-gray-700 font-medium">
                      {isFreeShippingUnlocked ? (
                        <span className="text-emerald-600 font-bold">FREE</span>
                      ) : (
                        'Calculated at checkout'
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#E9E2D2]/80 text-sm sm:text-base font-black font-serif text-[#1C1613]">
                    <span>Total Amount</span>
                    <span className="font-mono text-base sm:text-lg text-[#1C1613]">
                      {formatPrice(finalCalculatedTotal)}
                    </span>
                  </div>
                </div>

                {/* Primary Checkout CTA */}
                {items.some(i => i.isUnavailable || i.isOutOfStock) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof useCartStore.getState().removeUnavailableItems === 'function') {
                        useCartStore.getState().removeUnavailableItems();
                      }
                    }}
                    className="w-full py-3.5 sm:py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-center"
                  >
                    <span>Remove Unavailable Items to Checkout</span>
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    id="cart-proceed-checkout-btn"
                    onClick={() => {
                      closeCart();
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }
                    }}
                    prefetch={true}
                    className="w-full h-12 sm:h-13 py-3.5 sm:py-4 bg-[#1C1613] hover:bg-[#FF5533] text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md active:scale-[0.98] group cursor-pointer text-center"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
