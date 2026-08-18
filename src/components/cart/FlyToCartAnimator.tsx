'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

export default function FlyToCartAnimator() {
  const flyingItems = useCartStore(state => state.flyingItems || []);

  if (flyingItems.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              left: item.startX,
              top: item.startY,
              scale: 1,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              left: [item.startX, (item.startX + item.endX) / 2 + 30, item.endX],
              top: [item.startY, Math.min(item.startY, item.endY) - 90, item.endY],
              scale: [1, 0.75, 0.25],
              opacity: [1, 1, 0],
              rotate: [0, -25, 360],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.75,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed w-12 h-12 rounded-full overflow-hidden border-2 border-[#C5A880] shadow-[0_10px_30px_rgba(255,85,51,0.5)] bg-[#1C1613] pointer-events-none"
          >
            <img
              src={item.image}
              alt=""
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
              }}
              className="w-full h-full object-cover rounded-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
