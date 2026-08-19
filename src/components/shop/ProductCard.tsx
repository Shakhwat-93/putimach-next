'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Zap, Check } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';
import { trackAddToCart } from '../../lib/tracking';

export function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const [liked, setLiked] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Use selective selector so cart changes do not re-render all grid cards
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  const originalPrice = product.original_price || product.originalPrice;
  const discount = (originalPrice && Number(originalPrice) > Number(product.price))
    ? Math.round(((Number(originalPrice) - Number(product.price)) / Number(originalPrice)) * 100)
    : null;

  const inStock = product.inventory_id
    ? (product.inventory?.current_stock > 0)
    : (product.in_stock !== false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || adding) return;
    setAdding(true);
    addItem(product, product.sizes?.[0] || 'Free Size', product.colors?.[0] || 'Default', 1, e);
    trackAddToCart(product, 1, product.sizes?.[0] || 'Free Size');
    setTimeout(() => {
      setAdding(false);
    }, 700);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem(product, product.sizes?.[0] || 'Free Size', product.colors?.[0] || 'Default', 1);
    trackAddToCart(product, 1, product.sizes?.[0] || 'Free Size');
    router.push('/checkout');
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((prev) => !prev);
  };

  return (
    <div className="group flex flex-col h-full select-none transition-all duration-300">
      {/* ── Top Clickable Card & Image Area ── */}
      <Link
        href={`/product/${product.slug}`}
        prefetch={true}
        className="block flex-1 relative cursor-pointer"
      >
        <div className="relative aspect-[3/4] rounded-2xl bg-base-900 overflow-hidden border border-base-400/30 group-hover:border-base-400/80 transition-all duration-300">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'}
            alt={product.name || 'Product Image'}
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
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

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleLike}
            aria-label="Save to Wishlist"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full glass flex items-center justify-center transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <Heart
              size={14}
              className={`transition-colors duration-200 ${
                liked ? 'fill-red-400 text-red-400' : 'text-surface-secondary'
              }`}
            />
          </button>
        </div>

        {/* Product Title & Price Details */}
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
        </div>
      </Link>

      {/* ── Separate Interactive Action Buttons (Outside Link Tag) ── */}
      {inStock && (
        <div className="px-1 pt-2 flex items-center gap-1.5 mt-auto">
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label="Add to cart"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-200 border shadow-sm cursor-pointer active:scale-95 ${
              adding 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20' 
                : 'bg-white text-[#1C1613] border-[#E9E2D2] hover:border-[#1C1613] hover:bg-[#FDFBF7]'
            }`}
          >
            {adding ? (
              <Check size={13} className="animate-bounce shrink-0 text-white" />
            ) : (
              <ShoppingBag size={12} className="shrink-0" />
            )}
            <span>{adding ? 'Added!' : 'Cart'}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            aria-label="Buy now"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider bg-[#1C1613] text-[#C5A880] hover:bg-[#2A221E] transition-all duration-200 shadow-sm border border-[#C5A880]/30 cursor-pointer active:scale-95"
          >
            <Zap size={12} className="shrink-0" />
            <span>Buy</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductCard;
