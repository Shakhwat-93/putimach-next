'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';

export default function CartDrawer() {
  const { isOpen, closeCart, items, updateQuantity, removeItem, getSubtotal, getTotal } = useCartStore();
  const router = useRouter();

  const handleCheckout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeCart();
    router.push('/checkout');
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const calculatedSubtotal = typeof getSubtotal === 'function' 
    ? getSubtotal() 
    : (typeof getTotal === 'function' ? getTotal() : items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0));

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
                    {remainingForFreeShipping > 0 ? (
                      <>Add <span className="font-black text-[#FF5533]">{formatPrice(remainingForFreeShipping)}</span> more for FREE Delivery!</>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Sparkles size={12} /> You unlocked FREE Express Delivery!
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#E9E2D2] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#C5A880] to-[#FF5533] rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 scrollbar-none">
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
                      <p className="text-xs text-gray-500 max-w-[240px] mx-auto">
                        Explore our luxury streetwear catalog and discover your next statement piece.
                      </p>
                    </div>
                    <Link 
                      href="/shop"
                      onClick={() => closeCart()} 
                      className="mt-2 px-8 py-3.5 bg-[#1C1613] text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-[#FF5533] transition-all shadow-md active:scale-95 cursor-pointer inline-block text-center"
                    >
                      Explore Catalog →
                    </Link>
                  </motion.div>
                ) : (
                  items.map((item) => (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl p-3.5 border border-[#E9E2D2] shadow-sm flex gap-3.5 items-center relative hover:border-[#1C1613]/30 transition-all group"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F7F4EE] border border-[#E9E2D2] p-1 flex-shrink-0">
                        <img
                          src={item.product?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'}
                          alt={item.product?.name || 'Product'}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>

                      {/* Info & Controls */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/product/${item.product?.slug}`}
                            onClick={() => closeCart()}
                            className="font-serif font-black text-sm text-[#1C1613] hover:text-[#C5A880] transition-colors line-clamp-1"
                          >
                            {item.product?.name}
                          </Link>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 cursor-pointer active:scale-90"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Size: <span className="font-bold text-[#1C1613]">{item.size}</span>
                          {item.color && item.color !== 'None' && (
                            <> • Color: <span className="font-bold text-[#1C1613]">{item.color}</span></>
                          )}
                        </p>

                        <div className="flex items-center justify-between mt-2.5">
                          <span className="font-serif font-black text-sm text-[#1C1613]">
                            {formatPrice(item.product?.price || 0)}
                          </span>

                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1.5 bg-[#F4EFE6] border border-[#E9E2D2] rounded-xl p-1">
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
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer Area */}
            {items.length > 0 && (
              <div className="p-6 bg-white border-t border-[#E9E2D2] space-y-4 shadow-lg relative z-10">
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono text-gray-700">{formatPrice(calculatedSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className="text-emerald-700 font-bold">
                      {remainingForFreeShipping === 0 ? 'FREE' : 'Calculated at checkout'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E9E2D2]/60 text-sm font-black font-serif text-[#1C1613]">
                    <span>Total Amount</span>
                    <span className="font-mono text-base text-[#1C1613]">
                      {formatPrice(calculatedSubtotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout Primary Button */}
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
