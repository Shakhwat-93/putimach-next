'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, X, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

export default function CartNotificationToast() {
  const { isToastOpen, lastAddedItem, closeToast, openCart } = useCartStore();

  useEffect(() => {
    if (!isToastOpen) return;
    const timer = setTimeout(() => {
      closeToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [isToastOpen, closeToast]);

  if (!lastAddedItem) return null;

  const { product, size, color, quantity } = lastAddedItem;
  const imageSrc = product?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';

  return (
    <AnimatePresence>
      {isToastOpen && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed top-4 right-3 sm:top-6 sm:right-6 z-[100] max-w-[360px] w-[calc(100vw-24px)] pointer-events-auto"
        >
          {/* Luxury Outer Glass Frame */}
          <div className="relative overflow-hidden bg-[#1C1613]/95 backdrop-blur-2xl border border-[#C5A880]/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3.5 text-white">
            
            {/* Top Auto-dismiss Gradient Timer Line */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF5533] via-[#C5A880] to-emerald-400 origin-left"
            />

            {/* Content Row */}
            <div className="flex items-start gap-3 pt-0.5">
              
              {/* Product Thumbnail with Animated Ring */}
              <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-[#C5A880]/30 shadow-md">
                <img
                  src={imageSrc}
                  alt={product?.name || 'Product'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border border-[#1C1613] animate-bounce">
                  <CheckCircle2 size={10} />
                </span>
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={12} className="text-[#C5A880] animate-pulse" />
                  <span className="text-[10px] font-black text-[#C5A880] uppercase tracking-[0.2em] font-serif">
                    Added to Bag
                  </span>
                </div>
                <h4 className="font-serif font-black text-xs sm:text-sm text-white truncate leading-tight mb-1">
                  {product?.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-300">
                  <span className="font-medium text-[#C5A880]">{formatPrice(product?.price || 0)}</span>
                  {size && size !== 'One Size' && (
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-gray-200">
                      {size}
                    </span>
                  )}
                  {quantity > 1 && (
                    <span className="text-gray-400 font-bold">x{quantity}</span>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={closeToast}
                className="text-gray-400 hover:text-white p-1 transition-colors rounded-lg hover:bg-white/10 shrink-0"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-400 font-medium">
                Item in your shopping bag
              </span>
              <button
                onClick={openCart}
                className="bg-gradient-to-r from-[#FF5533] to-[#e04422] hover:from-[#e04422] hover:to-[#FF5533] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <ShoppingBag size={12} />
                <span>View Cart</span>
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
