'use client';
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, X, Sparkles } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

export default function CartRecoveryToast() {
  const { 
    items, 
    showRecoveryNotification, 
    dismissRecoveryNotification, 
    openCart,
    hasRevalidated 
  } = useCartStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const validItems = items.filter(i => !i.isUnavailable && !i.isOutOfStock);
  const totalCount = validItems.reduce((s, i) => s + i.quantity, 0);

  if (!showRecoveryNotification || totalCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-6 left-4 sm:left-6 z-40 max-w-sm w-[calc(100vw-32px)] sm:w-auto"
      >
        <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          
          {/* Animated Icon Glow */}
          <div className="relative w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShoppingBag size={18} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-xs">
              {totalCount}
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-foreground truncate">Your cart is waiting</span>
              <Sparkles size={11} className="text-amber-500 shrink-0" />
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {totalCount} {totalCount === 1 ? 'item is' : 'items are'} saved in your bag.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                dismissRecoveryNotification();
                openCart();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>View Cart</span>
              <ArrowRight size={12} />
            </button>

            <button
              type="button"
              onClick={dismissRecoveryNotification}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Dismiss reminder"
            >
              <X size={14} />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
