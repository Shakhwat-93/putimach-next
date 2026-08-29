// @ts-nocheck
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { 
  getOrCreateCartSessionId, 
  loadStoredCart, 
  saveStoredCart, 
  clearStoredCart,
  StoredCartItem 
} from '../lib/cart/persistence';

const CART_STORAGE_KEY = 'putimach-cart';
const REMINDER_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour threshold for soft recovery reminder

function getInitialCartItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.state?.items) 
      ? parsed.state.items 
      : (Array.isArray(parsed?.items) ? parsed.items : []);
  } catch (e) {
    return [];
  }
}

export interface CartItem {
  key: string;
  product: {
    id: string;
    slug?: string;
    name: string;
    price: number;
    compare_at_price?: number;
    image?: string;
    category?: string;
    collections?: string[];
    variants?: any[];
    status?: string;
  };
  size?: string;
  color?: string;
  quantity: number;
  added_at?: number;
  isUnavailable?: boolean;
  isOutOfStock?: boolean;
  unavailabilityReason?: string;
  wasCapped?: boolean;
  maxAvailable?: number;
}

const useCartStore = create(
  persist(
    (set, get) => ({
      items: getInitialCartItems(),
      isOpen: false,
      flyingItems: [],
      badgeBouncing: false,
      _hasHydrated: false,
      cartSessionId: typeof window !== 'undefined' ? getOrCreateCartSessionId() : 'cs_init',

      // Rehydration & Validation State
      isRevalidating: false,
      hasRevalidated: false,
      revalidationNotice: null,

      // Soft Cart Recovery Reminder State
      showRecoveryNotification: false,

      // Discount & Promotion State
      appliedCouponCode: null,
      discountResult: null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),

      // Recovery Notification actions
      dismissRecoveryNotification: () => {
        set({ showRecoveryNotification: false });
        if (typeof window !== 'undefined') {
          saveStoredCart({
            items: get().getMinimalItems(),
            appliedCouponCode: get().appliedCouponCode,
            last_reminder_at: Date.now()
          });
        }
      },

      // Discount Actions
      setAppliedCoupon: (code) => set({ appliedCouponCode: code ? code.trim().toUpperCase() : null }),
      setDiscountResult: (res) => set({ discountResult: res }),
      clearDiscount: () => set({ appliedCouponCode: null, discountResult: null }),

      // Helper to serialize minimal items for persistence
      getMinimalItems: (): StoredCartItem[] => {
        return get().items.map(item => ({
          product_id: String(item.product?.id || ''),
          size: item.size || undefined,
          color: item.color || undefined,
          quantity: item.quantity || 1,
          added_at: item.added_at || Date.now()
        })).filter(i => Boolean(i.product_id));
      },

      // Persist state to multi-layer storage
      persistCartState: (customItems = null) => {
        if (typeof window === 'undefined') return;
        const currentItems = customItems || get().items;
        const minimalItems: StoredCartItem[] = currentItems.map(item => ({
          product_id: String(item.product?.id || ''),
          size: item.size || undefined,
          color: item.color || undefined,
          quantity: item.quantity || 1,
          added_at: item.added_at || Date.now()
        })).filter(i => Boolean(i.product_id));

        saveStoredCart({
          items: minimalItems,
          appliedCouponCode: get().appliedCouponCode
        });
      },

      /**
       * Full Live Rehydration with Database
       * Revalidates live price, stock caps, active status, and variant existence.
       */
      rehydrateCartWithDatabase: async () => {
        const { items, persistCartState } = get();
        if (!items || items.length === 0) {
          set({ hasRevalidated: true, isRevalidating: false });
          return;
        }

        set({ isRevalidating: true });

        try {
          const productIds = Array.from(new Set(items.map(i => String(i.product?.id || '')).filter(Boolean)));
          if (productIds.length === 0) {
            set({ hasRevalidated: true, isRevalidating: false });
            return;
          }

          // Batch query latest live product rows
          const { data: dbProducts, error } = await supabase
            .from('products')
            .select('id, data')
            .in('id', productIds);

          if (error) throw error;

          const dbMap = new Map();
          if (Array.isArray(dbProducts)) {
            dbProducts.forEach(row => {
              dbMap.set(String(row.id), row.data || {});
            });
          }

          let hasChanges = false;
          let noticeMessage = null;

          const updatedItems: CartItem[] = items.map(item => {
            const pid = String(item.product?.id || '');
            const dbData = dbMap.get(pid);

            // 1. Check if product is deleted or archived
            if (!dbData || dbData.status === 'archived' || dbData.is_active === false) {
              hasChanges = true;
              return {
                ...item,
                isUnavailable: true,
                unavailabilityReason: 'This product is no longer available.'
              };
            }

            // 2. Refresh live pricing & media
            const currentPrice = Number(dbData.price !== undefined ? dbData.price : item.product.price);
            const currentCompareAt = dbData.compare_at_price ? Number(dbData.compare_at_price) : undefined;
            let currentImage = (dbData.images && dbData.images[0]) || dbData.image || item.product.image;
            if (item.color && item.color !== 'None' && dbData.color_images) {
              const cImg = dbData.color_images[item.color];
              if (Array.isArray(cImg) && cImg[0]) currentImage = cImg[0];
              else if (typeof cImg === 'string') currentImage = cImg;
            }
            const variants = Array.isArray(dbData.variants) ? dbData.variants : [];

            let isOutOfStock = false;
            let unavailabilityReason = undefined;
            let maxAvailable = 999;
            let currentQty = item.quantity;
            let wasCapped = false;

            // 3. Variant validation
            if (item.size || (item.color && item.color !== 'None')) {
              if (variants.length > 0) {
                const matchedVariant = variants.find(v => {
                  const sizeMatch = !item.size || !v.size || String(v.size).trim().toLowerCase() === String(item.size).trim().toLowerCase();
                  const colorMatch = !item.color || item.color === 'None' || !v.color || String(v.color).trim().toLowerCase() === String(item.color).trim().toLowerCase();
                  return sizeMatch && colorMatch;
                });

                if (!matchedVariant) {
                  isOutOfStock = true;
                  unavailabilityReason = `Selected option (${[item.color, item.size].filter(Boolean).join(' / ')}) is no longer available.`;
                } else {
                  const variantStock = Number(matchedVariant.stock !== undefined ? matchedVariant.stock : (dbData.current_stock ?? dbData.inventory_stock ?? 999));
                  maxAvailable = Math.max(0, variantStock);
                  if (variantStock <= 0) {
                    isOutOfStock = true;
                    unavailabilityReason = 'Out of stock';
                  } else if (currentQty > variantStock) {
                    currentQty = variantStock;
                    wasCapped = true;
                    noticeMessage = `Quantity for "${currentName}" was adjusted to remaining stock (${variantStock}).`;
                  }
                }
              }
            } else {
              // Product without explicit variants
              const totalStock = Number(dbData.current_stock ?? dbData.inventory_stock ?? 999);
              maxAvailable = Math.max(0, totalStock);
              if (totalStock <= 0) {
                isOutOfStock = true;
                unavailabilityReason = 'Out of stock';
              } else if (currentQty > totalStock) {
                currentQty = totalStock;
                wasCapped = true;
                noticeMessage = `Quantity for "${currentName}" was adjusted to remaining stock (${totalStock}).`;
              }
            }

            return {
              ...item,
              quantity: currentQty,
              isUnavailable: false,
              isOutOfStock,
              unavailabilityReason,
              wasCapped,
              maxAvailable,
              product: {
                ...item.product,
                name: currentName,
                price: currentPrice,
                compare_at_price: currentCompareAt,
                image: currentImage,
                variants: variants,
                category: dbData.category || item.product.category,
                collections: dbData.collections || item.product.collections
              }
            };
          });

          set({
            items: updatedItems,
            hasRevalidated: true,
            isRevalidating: false,
            revalidationNotice: noticeMessage
          });

          persistCartState(updatedItems);
        } catch (err) {
          console.warn('[Cart Rehydration] Database lookup failed, preserving current cart state:', err);
          set({ hasRevalidated: true, isRevalidating: false });
        }
      },

      triggerFlyToCart: (imageSrc, clickEventOrRect) => {
        if (typeof window === 'undefined') return;
        let startX = window.innerWidth / 2;
        let startY = window.innerHeight / 2;

        if (clickEventOrRect && clickEventOrRect.currentTarget) {
          const rect = clickEventOrRect.currentTarget.getBoundingClientRect();
          startX = rect.left + rect.width / 2 - 24;
          startY = rect.top + rect.height / 2 - 24;
        } else if (clickEventOrRect && typeof clickEventOrRect.left === 'number') {
          startX = clickEventOrRect.left;
          startY = clickEventOrRect.top;
        }

        let endX = window.innerWidth - 60;
        let endY = 30;

        const cartBtn = document.getElementById('global-navbar-cart-btn');
        if (cartBtn) {
          const cartRect = cartBtn.getBoundingClientRect();
          endX = cartRect.left + cartRect.width / 2 - 24;
          endY = cartRect.top + cartRect.height / 2 - 24;
        }

        const id = `fly-${Date.now()}-${Math.random()}`;
        const newFly = { id, image: imageSrc, startX, startY, endX, endY };

        set(state => ({ flyingItems: [...state.flyingItems, newFly] }));

        setTimeout(() => {
          set(state => ({
            flyingItems: state.flyingItems.filter(i => i.id !== id),
            badgeBouncing: true,
          }));
          setTimeout(() => set({ badgeBouncing: false }), 400);
        }, 750);
      },

      addItem: (product, size, colorOrQty = null, qtyOrUndefined = 1, event = null) => {
        const { items, triggerFlyToCart, persistCartState } = get();
        
        let color = null;
        let quantity = 1;
        
        if (typeof colorOrQty === 'number') {
          quantity = colorOrQty;
        } else {
          color = colorOrQty;
          quantity = qtyOrUndefined ?? 1;
        }

        const key = `${product.id}-${size || 'Default'}-${color || 'None'}`;
        const existing = items.find(i => i.key === key);

        let newItems;
        if (existing) {
          newItems = items.map(i =>
            i.key === key ? { ...i, quantity: i.quantity + quantity, isUnavailable: false, isOutOfStock: false } : i
          );
        } else {
          newItems = [...items, { 
            key, 
            product, 
            size: size || 'Default', 
            color: color || null, 
            quantity, 
            added_at: Date.now(),
            isUnavailable: false,
            isOutOfStock: false
          }];
        }

        set({ items: newItems });
        persistCartState(newItems);

        // Fly animation
        const imageSrc = product?.image || (product?.images && product.images[0]) || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
        triggerFlyToCart(imageSrc, event);

        // Haptic Feedback
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate([25, 15, 35]);
          } catch (e) {}
        }
      },

      removeItem: (key) => {
        const { items, persistCartState } = get();
        const newItems = items.filter(i => i.key !== key);
        set({ items: newItems });
        persistCartState(newItems);
      },

      removeUnavailableItems: () => {
        const { items, persistCartState } = get();
        const newItems = items.filter(i => !i.isUnavailable && !i.isOutOfStock);
        set({ items: newItems });
        persistCartState(newItems);
      },

      updateQuantity: (key, quantity) => {
        const { items, removeItem, persistCartState } = get();
        if (quantity < 1) {
          removeItem(key);
          return;
        }
        const newItems = items.map(i => {
          if (i.key === key) {
            const capped = i.maxAvailable ? Math.min(quantity, i.maxAvailable) : quantity;
            return { ...i, quantity: capped };
          }
          return i;
        });
        set({ items: newItems });
        persistCartState(newItems);
      },

      clearCart: () => {
        set({ items: [], appliedCouponCode: null, discountResult: null });
        if (typeof window !== 'undefined') {
          clearStoredCart();
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: { items: [] }, version: 0 }));
          } catch (e) {}
        }
      },

      // Derived selectors
      getTotalItems: () => get().items.filter(i => !i.isUnavailable && !i.isOutOfStock).reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.filter(i => !i.isUnavailable && !i.isOutOfStock).reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0),
      getTotal: () => {
        const sub = get().getSubtotal();
        const discountAmount = get().discountResult?.discount_amount || 0;
        return Math.max(0, sub - discountAmount);
      },

      get totalItems() {
        return get().items.filter(i => !i.isUnavailable && !i.isOutOfStock).reduce((sum, i) => sum + i.quantity, 0);
      },
      get subtotal() {
        return get().items.filter(i => !i.isUnavailable && !i.isOutOfStock).reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({ 
        items: state.items,
        appliedCouponCode: state.appliedCouponCode 
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);

          // Check for IndexedDB / persistent local stored state
          if (typeof window !== 'undefined') {
            loadStoredCart().then(stored => {
              if (stored && Array.isArray(stored.items) && stored.items.length > 0) {
                // Check if we should show recovery reminder (> 1 hour gap)
                const lastReminder = stored.last_reminder_at || 0;
                const timeDiff = Date.now() - lastReminder;
                if (timeDiff > REMINDER_THRESHOLD_MS && state.items.length > 0) {
                  state.showRecoveryNotification = true;
                }
              }
              // Trigger asynchronous live database validation in background
              state.rehydrateCartWithDatabase();
            }).catch(() => {
              state.rehydrateCartWithDatabase();
            });
          }
        }
      },
    }
  )
);

export { useCartStore };
export default useCartStore;
