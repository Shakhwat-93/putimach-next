'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ShoppingBag, Heart, Star, Check, ChevronDown,
  Zap, ArrowRight, X, Ruler, Loader2, Share2, Truck, ShieldCheck, RefreshCw
} from 'lucide-react';
import { getProductBySlug, getProducts } from '../lib/api';
import { reviews } from '../data/products';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/utils';
import { trackViewContent, trackAddToCart } from '../lib/tracking';
import { ProductCard } from '../components/shop/ProductCard';

export default function ProductDetailView() {
  const { slug } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [descOpen, setDescOpen] = useState(true);
  const [featOpen, setFeatOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const { addItem, openCart, items } = useCartStore();

  const mainImage = product?.image || (Array.isArray(product?.images) && product.images[0]);
  const otherImages = Array.isArray(product?.images) ? product.images.filter(img => img && img !== mainImage) : [];
  const images = product ? [mainImage, ...otherImages].filter(Boolean) : [];
  const sliderRef = useRef(null);

  const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleScroll = (e) => {
    const width = e.currentTarget.offsetWidth;
    if (width <= 0) return;
    const scrollLeft = e.currentTarget.scrollLeft;
    const page = Math.round(scrollLeft / width);
    if (page !== activeImg && page >= 0 && page < images.length) {
      setActiveImg(page);
    }
  };

  const handleThumbnailClick = (index) => {
    setActiveImg(index);
    if (sliderRef.current) {
      const width = sliderRef.current.offsetWidth;
      sliderRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || 'PutiMach Product',
          url: window.location.href,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadProduct() {
      setLoading(true);
      try {
        const prod = await getProductBySlug(slug);
        if (!isMounted) return;

        if (prod) {
          setProduct(prod);
          setSelectedSize(prod?.sizes?.[0] || null);
          setSelectedColor(prod?.colors?.[0] || null);
          trackViewContent(prod);
          setLoading(false);

          if (prod?.category) {
            getProducts({ category: prod.category })
              .then(rel => {
                if (isMounted) {
                  setRelatedProducts(rel.filter((p) => p.id !== prod.id).slice(0, 4));
                }
              })
              .catch(err => console.warn('Error fetching related products:', err));
          }
        } else {
          setProduct(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
        if (isMounted) {
          setProduct(null);
          setLoading(false);
        }
      }
    }
    loadProduct();
    return () => { isMounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 bg-[#FDFBF7]">
        <Loader2 size={36} className="text-[#C5A880] animate-spin" />
        <p className="text-[#1C1613]/60 text-xs font-mono tracking-widest uppercase">Loading Product Details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 bg-[#FDFBF7]">
        <h1 className="text-2xl font-serif font-black text-[#1C1613]">Product Not Found</h1>
        <Link href="/shop" className="px-6 py-3 bg-[#1C1613] text-white font-bold text-xs uppercase tracking-wider rounded-xl">
          Back to Shop
        </Link>
      </div>
    );
  }

  const originalPrice = product.original_price || product.originalPrice;
  const reviewsCount = product.reviews_count || product.reviews || 0;
  const rating = product.rating || 5.0;
  const longDesc = product.long_description || product.longDescription || product.description;
  const featuresList = Array.isArray(product.features) && product.features.length > 0 
    ? product.features.filter(Boolean) 
    : ['100% Premium Material', 'Custom Oversized Fit', 'Garment Washed Finish', 'Breathable & Durable'];

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const selectedVariant = hasVariants && selectedSize
    ? product.variants.find(v => {
        const sizeMatch = String(v.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase();
        const colorMatch = !selectedColor || String(v.color).trim().toLowerCase() === String(selectedColor).trim().toLowerCase();
        return sizeMatch && colorMatch;
      })
    : null;

  const currentStock = hasVariants
    ? (selectedVariant ? selectedVariant.stock : (product.stock || 0))
    : (product.stock ?? 999);

  const inStock = currentStock > 0;
  const isVariantOutOfStock = hasVariants && selectedSize && !inStock;
  const discount = originalPrice && originalPrice > product.price 
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : null;

  const productReviews = reviews.filter((r) => r.productId === product.id || r.productId === String(product.id));
  const sizeGuide = product?.size_guide;
  const sizeChartImageUrl = sizeGuide?.image_url || sizeGuide?.chart_image || product?.size_chart_image || null;

  const handleAddToCart = () => {
    if (!inStock) return;
    if (!selectedSize && product.sizes?.length > 0) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    setAdding(true);
    addItem(product, selectedSize || 'One Size', selectedColor || 'None', 1);
    trackAddToCart(product, 1, selectedSize || 'One Size');
    
    setTimeout(() => {
      setAdding(false);
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        openCart();
      }, 800);
    }, 300);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    if (!selectedSize && product.sizes?.length > 0) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    addItem(product, selectedSize || 'One Size', selectedColor || 'None', 1);
    trackAddToCart(product, 1, selectedSize || 'One Size');
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-16 lg:pt-24 pb-28 lg:pb-20 text-[#1C1613]">
      
      {/* Mobile Sticky Navigation Header Bar */}
      <div className="lg:hidden sticky top-14 z-30 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E9E2D2] px-4 py-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-full bg-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] active:scale-95 transition-transform"
          aria-label="Go Back"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="font-serif font-black text-sm text-[#1C1613] truncate max-w-[55%]">
          {product.name}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] active:scale-95 transition-transform"
            aria-label="Share product"
          >
            <Share2 size={16} />
          </button>
          <button 
            onClick={openCart} 
            className="relative w-10 h-10 rounded-full bg-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] active:scale-95 transition-transform"
            aria-label="View Cart"
          >
            <ShoppingBag size={18} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5533] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="container-site py-4 lg:py-8">
        
        {/* Desktop Breadcrumb Navigation */}
        <nav className="hidden lg:flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link href="/" className="hover:text-[#1C1613] transition-colors">Home</Link>
          <ChevronLeft size={12} className="rotate-180 text-gray-400" />
          <Link href="/shop" className="hover:text-[#1C1613] transition-colors">Shop</Link>
          <ChevronLeft size={12} className="rotate-180 text-gray-400" />
          <span className="text-[#1C1613] capitalize font-medium">{product.category}</span>
          <ChevronLeft size={12} className="rotate-180 text-gray-400" />
          <span className="text-gray-400 truncate max-w-[240px]">{product.name}</span>
        </nav>

        {/* Main Product Layout Grid */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start">

          {/* Left Column: Product Image Gallery Showcase (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-28">
            
            {/* Main Hero Card Container */}
            <div className="relative w-full rounded-[2.2rem] bg-gradient-to-b from-[#F7F4EE] via-[#F4EFE6] to-[#EFEADF] border border-[#E9E2D2] shadow-sm overflow-hidden flex items-center justify-center p-3 sm:p-6 min-h-[380px] sm:min-h-[480px]">
              
              <div 
                ref={sliderRef}
                onScroll={handleScroll}
                className="w-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {images.map((img, i) => (
                  <div 
                    key={i} 
                    className="w-full flex-shrink-0 snap-start flex items-center justify-center p-2"
                  >
                    <img
                      src={img}
                      alt={`${product.name} - ${i + 1}`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-auto max-h-[62vh] object-contain rounded-2xl drop-shadow-md select-none hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                    />
                  </div>
                ))}
              </div>

              {/* Floating Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {product.badge && (
                  <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                    product.badge === 'LIMITED' ? 'bg-[#1C1613] text-[#C5A880]' :
                    product.badge === 'NEW DROP' ? 'bg-emerald-600 text-white' :
                    product.badge === 'SALE' ? 'bg-[#FF5533] text-white' :
                    'bg-[#C5A880] text-white'
                  }`}>
                    {product.badge}
                  </span>
                )}
                {discount && (
                  <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black bg-[#FF5533] text-white tracking-widest shadow-sm">
                    -{discount}% OFF
                  </span>
                )}
                {!inStock && (
                  <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black bg-red-600 text-white tracking-widest animate-pulse shadow-sm">
                    SOLD OUT
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => setLiked(!liked)}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/85 backdrop-blur-md border border-[#E9E2D2] flex items-center justify-center hover:bg-white transition-all shadow-sm z-10 active:scale-90"
                aria-label="Save to Wishlist"
              >
                <Heart
                  size={19}
                  className={`transition-colors ${liked ? 'fill-[#FF5533] text-[#FF5533]' : 'text-[#1C1613]'}`}
                />
              </button>

              {/* Pagination Dots Indicator */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeImg === i ? 'bg-[#FF5533] w-6' : 'bg-[#1C1613]/30 w-1.5'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none px-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleThumbnailClick(i)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200 bg-[#F7F4EE] p-1 ${
                      activeImg === i ? 'border-[#FF5533] scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Information & Purchase Controls (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Header Info */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif">
                  {product.category || 'Luxury Streetwear'}
                </p>
                {inStock ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 uppercase tracking-wider">
                    In Stock
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200/60 uppercase tracking-wider">
                    {isVariantOutOfStock ? 'Size Sold Out' : 'Sold Out'}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-black text-[#1C1613] tracking-wide mb-4 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Price Tag Container */}
            <div className="flex items-baseline gap-3 bg-[#F4EFE6]/60 p-4 sm:p-5 rounded-2xl border border-[#E9E2D2]">
              <span className="font-serif font-black text-3xl sm:text-4xl text-[#1C1613]">
                {formatPrice(product.price)}
              </span>
              {originalPrice && (
                <>
                  <span className="text-base text-gray-400 line-through">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-xs font-bold bg-[#FF5533] text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div>
                <p className="font-serif font-bold text-xs uppercase tracking-wider text-[#1C1613] mb-2.5">
                  Select Color
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 border ${
                          isSelected
                            ? 'border-[#1C1613] bg-[#1C1613] text-white shadow-sm scale-105'
                            : 'border-[#E9E2D2] bg-white text-[#1C1613] hover:border-[#1C1613]/50'
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="font-serif font-bold text-xs uppercase tracking-wider text-[#1C1613]">
                    Select Size
                  </p>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[11px] font-bold text-[#C5A880] hover:text-[#1C1613] transition-colors flex items-center gap-1.5 bg-white border border-[#E9E2D2] px-3.5 py-1.5 rounded-full active:scale-95 shadow-sm"
                  >
                    <Ruler size={13} className="text-[#C5A880]" />
                    <span>Size Guide & Chart</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setSelectedSize(size);
                          setSizeError(false);
                        }}
                        className={`min-w-[52px] h-12 px-4 rounded-xl font-black text-xs uppercase transition-all duration-200 border ${
                          isSelected
                            ? 'border-[#1C1613] bg-[#1C1613] text-white shadow-md scale-105'
                            : 'border-[#E9E2D2] bg-white text-[#1C1613] hover:border-[#1C1613]/50'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {sizeError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1"
                    >
                      ⚠️ Please select a size to proceed
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Desktop Action Buttons */}
            <div className="hidden lg:flex gap-3 pt-2">
              <button
                disabled={!inStock}
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 ${
                  !inStock
                    ? 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
                    : added
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-[#1C1613] text-[#1C1613] hover:bg-[#1C1613] hover:text-white'
                }`}
              >
                {!inStock ? (
                  'Sold Out'
                ) : added ? (
                  <>
                    <Check size={16} /> Added To Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} /> Add To Cart
                  </>
                )}
              </button>

              <button
                disabled={!inStock}
                onClick={handleBuyNow}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-md ${
                  !inStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#FF5533] text-white hover:bg-[#e04422]'
                }`}
              >
                <Zap size={16} /> Buy Now
              </button>
            </div>



            {/* Product Accordions */}
            <div className="space-y-3 pt-2">
              <div className="rounded-2xl border border-[#E9E2D2] bg-white overflow-hidden">
                <button
                  onClick={() => setDescOpen(!descOpen)}
                  className="w-full flex items-center justify-between px-5 py-4 font-serif font-bold text-xs uppercase tracking-wider text-[#1C1613]"
                >
                  Product Description
                  <ChevronDown size={16} className={`transition-transform duration-300 ${descOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {descOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-xs text-gray-600 leading-relaxed whitespace-pre-line border-t border-[#E9E2D2]/50 pt-3">
                        {longDesc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-2xl border border-[#E9E2D2] bg-white overflow-hidden">
                <button
                  onClick={() => setFeatOpen(!featOpen)}
                  className="w-full flex items-center justify-between px-5 py-4 font-serif font-bold text-xs uppercase tracking-wider text-[#1C1613]"
                >
                  Features & Details
                  <ChevronDown size={16} className={`transition-transform duration-300 ${featOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {featOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="px-5 pb-5 space-y-2 border-t border-[#E9E2D2]/50 pt-3">
                        {featuresList.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                            <Check size={14} className="text-[#C5A880] flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

        </div>

        {/* Customer Reviews Section */}
        {productReviews.length > 0 && (
          <div className="mt-16 sm:mt-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-[#C5A880] uppercase tracking-widest font-serif mb-1">Verified Feedback</p>
                <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#1C1613]">Customer Reviews</h2>
              </div>
              <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-[#E9E2D2] shadow-sm">
                <Star size={14} className="fill-[#C5A880] text-[#C5A880]" />
                <span className="font-bold text-xs text-[#1C1613]">{rating} / 5.0</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {productReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-2xl p-5 border border-[#E9E2D2] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-0.5 mb-3">
                    {[...Array(review.rating)].map((_, j) => (
                      <Star key={j} size={12} className="fill-[#C5A880] text-[#C5A880]" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    "{review.comment}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1613]">{review.name}</span>
                    <span className="text-[10px] text-gray-400">{review.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 sm:mt-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-[#C5A880] uppercase tracking-widest font-serif mb-1">Recommended For You</p>
                <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#1C1613]">Related Products</h2>
              </div>
              <Link href={`/shop?cat=${product.category}`} className="text-xs font-bold text-[#1C1613] hover:text-[#C5A880] transition-colors flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Floating Sticky Bottom Mobile Action Bar (Mobile Only - Matching App Reference) */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="bg-[#1C1613]/95 backdrop-blur-xl border border-white/10 p-2.5 rounded-full shadow-2xl flex items-center gap-2">
          
          {/* Wishlist / Heart Button */}
          <button
            onClick={() => setLiked(!liked)}
            className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-transform shrink-0"
            aria-label="Wishlist"
          >
            <Heart size={20} className={liked ? 'fill-[#FF5533] text-[#FF5533]' : 'text-white'} />
          </button>

          {/* Add to Cart Button */}
          <button
            disabled={!inStock}
            onClick={handleAddToCart}
            className={`flex-1 h-12 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 ${
              !inStock
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : added
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-[#1C1613] hover:bg-gray-100'
            }`}
          >
            {!inStock ? (
              'Sold Out'
            ) : added ? (
              <>
                <Check size={16} /> Added!
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> Cart
              </>
            )}
          </button>

          {/* Buy Now Button */}
          <button
            disabled={!inStock}
            onClick={handleBuyNow}
            className={`flex-1 h-12 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
              !inStock
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-[#FF5533] text-white hover:bg-[#e04422]'
            }`}
          >
            <Zap size={16} /> Buy Now
          </button>

        </div>
      </div>

      {/* Size Guide Modal */}
      <AnimatePresence>
        {sizeGuideOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setSizeGuideOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-xl max-h-[90vh] bg-white rounded-3xl p-6 overflow-y-auto border border-[#E9E2D2] shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E9E2D2] mb-4">
                <div>
                  <h3 className="font-serif font-black text-xl text-[#1C1613]">Size Chart & Fit Guide</h3>
                  <p className="text-xs text-gray-500">Measurements for {product.name}</p>
                </div>
                <button
                  onClick={() => setSizeGuideOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#1C1613] hover:bg-gray-200"
                >
                  <X size={16} />
                </button>
              </div>

              {sizeChartImageUrl ? (
                <div className="rounded-2xl overflow-hidden bg-gray-50 p-2 mb-4 border border-[#E9E2D2]">
                  <img
                    src={sizeChartImageUrl}
                    alt="Size Chart"
                    className="w-full h-auto object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-4 text-xs text-gray-600">
                  <p className="font-semibold text-[#1C1613]">Standard Measurement Guide (Inches)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 font-bold text-[#1C1613]">
                          <th className="p-2 border">Size</th>
                          <th className="p-2 border">Chest</th>
                          <th className="p-2 border">Length</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-2 border font-bold">S</td><td className="p-2 border">38"</td><td className="p-2 border">27"</td></tr>
                        <tr><td className="p-2 border font-bold">M</td><td className="p-2 border">40"</td><td className="p-2 border">28"</td></tr>
                        <tr><td className="p-2 border font-bold">L</td><td className="p-2 border">42"</td><td className="p-2 border">29"</td></tr>
                        <tr><td className="p-2 border font-bold">XL</td><td className="p-2 border">44"</td><td className="p-2 border">30"</td></tr>
                        <tr><td className="p-2 border font-bold">XXL</td><td className="p-2 border">46"</td><td className="p-2 border">31"</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSizeGuideOpen(false)}
                className="w-full py-3 mt-4 bg-[#1C1613] text-white rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Close Guide
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Copy Link Toast Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#1C1613] text-white text-xs px-4 py-2.5 rounded-full shadow-lg border border-white/10 font-bold flex items-center gap-2"
          >
            <Check size={14} className="text-emerald-400" /> Link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
