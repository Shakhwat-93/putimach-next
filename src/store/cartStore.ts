// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),

      addItem: (product, size, colorOrQty = null, qtyOrUndefined = 1) => {
        const { items } = get();
        
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
