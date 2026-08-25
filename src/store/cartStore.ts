// @ts-nocheck
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CART_STORAGE_KEY = 'putimach-cart';

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

const useCartStore = create(
  persist(
    (set, get) => ({
      items: getInitialCartItems(),
      isOpen: false,
      flyingItems: [],
      badgeBouncing: false,
      _hasHydrated: false,

      // Discount & Promotion State
      appliedCouponCode: null,
      discountResult: null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),

      // Discount Actions
      setAppliedCoupon: (code) => set({ appliedCouponCode: code ? code.trim().toUpperCase() : null }),
      setDiscountResult: (res) => set({ discountResult: res }),
      clearDiscount: () => set({ appliedCouponCode: null, discountResult: null }),

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

        // Remove item after animation completes & trigger badge bounce
        setTimeout(() => {
          set(state => ({
            flyingItems: state.flyingItems.filter(i => i.id !== id),
            badgeBouncing: true,
          }));
          setTimeout(() => set({ badgeBouncing: false }), 400);
        }, 750);
      },

      addItem: (product, size, colorOrQty = null, qtyOrUndefined = 1, event = null) => {
        const { items, triggerFlyToCart } = get();
        
        let color = null;
        let quantity = 1;
        
        if (typeof colorOrQty === 'number') {
          quantity = colorOrQty;
        } else {
          color = colorOrQty;
          quantity = qtyOrUndefined ?? 1;
        }

        const key = `${product.id}-${size}-${color || 'None'}`;
        const existing = items.find(i => i.key === key);

        let newItems;
        if (existing) {
          newItems = items.map(i =>
            i.key === key ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          newItems = [...items, { key, product, size, color, quantity }];
        }

        set({ items: newItems });

        // Save fallback immediately
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: { items: newItems, appliedCouponCode: get().appliedCouponCode }, version: 0 }));
          } catch (e) {}
        }

        // Trigger Fly To Cart animation
        const imageSrc = product?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
        triggerFlyToCart(imageSrc, event);

        // Haptic Feedback for Mobile Devices
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate([25, 15, 35]);
          } catch (e) {}
        }
      },

      removeItem: (key) => {
        const newItems = get().items.filter(i => i.key !== key);
        set({ items: newItems });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: { items: newItems, appliedCouponCode: get().appliedCouponCode }, version: 0 }));
          } catch (e) {}
        }
      },

      updateQuantity: (key, quantity) => {
        if (quantity < 1) {
          get().removeItem(key);
          return;
        }
        const newItems = get().items.map(i => i.key === key ? { ...i, quantity } : i);
        set({ items: newItems });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: { items: newItems, appliedCouponCode: get().appliedCouponCode }, version: 0 }));
          } catch (e) {}
        }
      },

      clearCart: () => {
        set({ items: [], appliedCouponCode: null, discountResult: null });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: { items: [] }, version: 0 }));
          } catch (e) {}
        }
      },

      // Derived selectors
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0),
      getTotal: () => {
        const sub = get().getSubtotal();
        const discountAmount = get().discountResult?.discount_amount || 0;
        return Math.max(0, sub - discountAmount);
      },

      get totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
      get subtotal() {
        return get().items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
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
          if ((!state.items || state.items.length === 0) && typeof window !== 'undefined') {
            const localItems = getInitialCartItems();
            if (localItems.length > 0) {
              state.items = localItems;
            }
          }
        }
      },
    }
  )
);

export { useCartStore };
export default useCartStore;
