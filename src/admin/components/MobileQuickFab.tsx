'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, X, Package, ShoppingCart, ClipboardList, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MobileQuickFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleAction = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <>
      {/* Floating Action Button — Mobile Only */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl border-2 border-background/20 backdrop-blur-lg focus:outline-none"
          aria-label="Quick Action Menu"
        >
          <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={26} strokeWidth={2.8} />
          </motion.div>
        </motion.button>
      </div>

      {/* Quick Action Sheet Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md md:hidden"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-card p-6 pb-24 md:hidden shadow-2xl"
            >
              <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-border/60" />
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" /> Quick ERP Actions
                  </h3>
                  <p className="text-xs text-muted-foreground">Select an action to execute instantly</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAction('/admin/storefrontmanagement')}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all active:scale-[0.97] hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-foreground">Add Product</span>
                    <span className="text-[11px] text-muted-foreground">Update Storefront Catalog</span>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('/admin/ordersboard')}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all active:scale-[0.97] hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-foreground">Create Order</span>
                    <span className="text-[11px] text-muted-foreground">Process Manual Order</span>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('/admin/taskboard')}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all active:scale-[0.97] hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-foreground">Create Task</span>
                    <span className="text-[11px] text-muted-foreground">Assign Team Duties</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                    window.dispatchEvent(event);
                  }}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all active:scale-[0.97] hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
                    <Search size={20} />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-foreground">Global Search</span>
                    <span className="text-[11px] text-muted-foreground">Find Anything (Ctrl+K)</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
