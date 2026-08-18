// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      flyingItems: [],
      badgeBouncing: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),

      triggerFlyToCart: (imageSrc, clickEventOrRect) => {
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

        if (existing) {
          set({
            items: items.map(i =>
              i.key === key ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({
            items: [...items, { key, product, size, color, quantity }],
          });
        }

        // Trigger Fly To Cart animation
        const imageSrc = product?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
        triggerFlyToCart(imageSrc, event);

        // Haptic Feedback for Mobile Devices
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate([25, 15, 35]);
          } catch (e) {
            // ignore
          }
        }
      },

      removeItem: (key) => {
        set(state => ({ items: state.items.filter(i => i.key !== key) }));
      },

      updateQuantity: (key, quantity) => {
        if (quantity < 1) {
          get().removeItem(key);
          return;
        }
        set(state => ({
          items: state.items.map(i => i.key === key ? { ...i, quantity } : i),
        }));
      },

      clearCart: () => set({ items: [] }),

      // Derived selectors
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0),
      getTotal: () => get().items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0),

      get totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
      get subtotal() {
        return get().items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
      },
    }),
    {
      name: 'putimach-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export { useCartStore };
export default useCartStore;
