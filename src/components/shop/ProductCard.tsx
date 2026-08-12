'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';
import { trackAddToCart } from '../../lib/tracking';

export function ProductCard({ product, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { addItem, openCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const originalPrice = product.original_price || product.originalPrice;
  const reviewsCount = product.reviews_count || product.reviews || 0;
  const rating = product.rating || 5.0;
  const discount = (originalPrice && Number(originalPrice) > Number(product.price))
    ? Math.round(((Number(originalPrice) - Number(product.price)) / Number(originalPrice)) * 100)
    : null;

  const inStock = product.inventory_id
    ? (product.inventory?.current_stock > 0)
    : (product.in_stock !== false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    setAdding(true);
    addItem(product, product.sizes?.[0] || 'Free Size', product.colors?.[0] || 'Default', 1);
    trackAddToCart(product, 1, product.sizes?.[0] || 'Free Size');
    setTimeout(() => {
      setAdding(false);
      openCart();
    }, 600);
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem(product, product.sizes?.[0] || 'Free Size', product.colors?.[0] || 'Default', 1);
    trackAddToCart(product, 1, product.sizes?.[0] || 'Free Size');
    router.push('/checkout');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] rounded-2xl bg-base-900 overflow-hidden border border-base-400/30 group-hover:border-base-400/80 transition-all duration-300">
          <motion.img
            src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'}
            alt={product.name}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
            }}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full h-full object-cover"
          />

          {/* Glow overlay on hover */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-gradient-to-t from-brand/10 via-transparent to-transparent pointer-events-none"
          />

          {/* Badge */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
            {product.badge && (
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                  product.badge === 'BESTSELLER'
                    ? 'bg-brand text-white'
                    : product.badge === 'NEW DROP' ? 'bg-emerald-500 text-white' :
                    product.badge === 'SALE' ? 'bg-red-500 text-white' :
                    'bg-base-400/90 text-surface-primary'
                }`}
              >
                {product.badge}
              </span>
            )}
            {discount && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/90 text-white">
                -{discount}%
              </span>
            )}
            {!inStock && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/90 text-white animate-pulse">
                STOCK OUT
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked(!liked);
            }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center transition-all duration-200 ${
              isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart
              size={14}
              className={`transition-colors duration-200 ${
                liked ? 'fill-red-400 text-red-400' : 'text-surface-secondary'
              }`}
            />
          </button>

          {/* Hover/Always Actions */}
          {inStock && (
            <motion.div
              initial={{ y: isMobile ? 0 : 12, opacity: isMobile ? 1 : 0 }}
              animate={{
                y: (isMobile || hovered) ? 0 : 12,
                opacity: (isMobile || hovered) ? 1 : 0
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute bottom-3 left-2 right-2 flex gap-1.5 z-20"
            >
              <button
                onClick={handleQuickAdd}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-full font-bold text-[9px] uppercase tracking-wider transition-all duration-300 ${
                  adding 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white/95 hover:bg-brand hover:text-white text-surface-primary border border-brand/20 shadow-sm'
                }`}
              >
                {adding ? (isMobile ? 'Added' : 'Added!') : (isMobile ? '+ Cart' : 'Add to Cart')}
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-full font-bold text-[9px] uppercase tracking-wider bg-brand text-white hover:bg-brand/90 transition-all duration-300 shadow-sm"
              >
                {isMobile ? 'Buy' : 'Buy Now'}
              </button>
            </motion.div>
          )}
        </div>

        {/* Info */}
        <div className="mt-3 px-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-small text-surface-primary group-hover:text-brand transition-colors duration-200 line-clamp-1">
                {product.name}
              </p>
              <p className="text-xs text-surface-muted mt-0.5 capitalize">{product.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-small text-surface-primary">{formatPrice(product.price)}</p>
              {originalPrice && (
                <p className="text-xs text-surface-muted line-through">{formatPrice(originalPrice)}</p>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={i < Math.floor(rating) ? 'fill-brand text-brand' : 'text-base-300'}
                />
              ))}
            </div>
            <span className="text-[10px] text-surface-muted">({reviewsCount})</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default ProductCard;
