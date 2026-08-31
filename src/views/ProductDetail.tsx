'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ShoppingBag, Heart, Star, Check, ChevronDown,
  Zap, ArrowRight, X, Ruler, Loader2, Share2, Truck, ShieldCheck, RefreshCw
} from 'lucide-react';
import { getProductBySlug, getProducts } from '../lib/api';
import { reviews } from '../data/products';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/utils';
import { trackViewContent, trackAddToCart } from '../lib/tracking';
import { ProductCard } from '../components/shop/ProductCard';
import ProductDetailSkeleton from '@/components/skeletons/storefront/ProductDetailSkeleton';
import { supabase } from '../lib/supabase';
import { extractProductImages, DEFAULT_PRODUCT_FALLBACK, cleanImageUrl } from '../lib/productMedia';

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
  const [whatsappPhone, setWhatsappPhone] = useState('8801827406756');
  const [headerVisible, setHeaderVisible] = useState(true);
  const { addItem, openCart, items } = useCartStore();

  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;

    const handleWindowScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 120) {
            if (currentScrollY > lastScrollY + 20) {
              setHeaderVisible(false);
            } else if (currentScrollY < lastScrollY - 20) {
              setHeaderVisible(true);
            }
          } else {
            setHeaderVisible(true);
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  useEffect(() => {
    async function loadContactPhone() {
      try {
        let contactData = null;
        const { data: sData } = await supabase.from('site_settings').select('data').eq('id', 'contact_info').maybeSingle();
        if (sData?.data) {
          contactData = sData.data;
        } else {
          const { data: cData } = await supabase.from('cb_settings').select('data').eq('id', 'contact_info').maybeSingle();
          contactData = cData?.data;
        }
        const raw = contactData?.whatsapp || contactData?.phone || '01827406756';
        const clean = raw.replace(/[^0-9]/g, '');
        const formatted = clean.startsWith('880') ? clean : clean.startsWith('0') ? `88${clean}` : `880${clean}`;
        setWhatsappPhone(formatted);
      } catch (err) {
        console.warn('Failed to load contact phone:', err);
      }
    }
    loadContactPhone();
  }, []);

  // Map color galleries for rapid, race-condition-free color switching
  const colorGalleriesMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    // 1. Check normalized color_images / color_galleries
    const rawColorImages = product?.color_images || product?.colorImages || product?.color_galleries || {};
    if (typeof rawColorImages === 'object' && rawColorImages !== null) {
      Object.entries(rawColorImages).forEach(([cName, val]) => {
        if (!cName) return;
        const cleanKey = String(cName).trim().toLowerCase();
        const list: string[] = [];

        if (Array.isArray(val)) {
          val.forEach(item => {
            const cl = cleanImageUrl(item);
            if (cl && !list.includes(cl)) list.push(cl);
          });
        } else if (typeof val === 'string') {
          const cl = cleanImageUrl(val);
          if (cl) list.push(cl);
        }

        if (list.length > 0) {
          map[cleanKey] = list;
        }
      });
    }

    // 2. Check variant items
    if (Array.isArray(product?.variants)) {
      product.variants.forEach((v) => {
        if (v?.color && (v.image_url || v.image)) {
          const cleanKey = String(v.color).trim().toLowerCase();
          const cl = cleanImageUrl(v.image_url || v.image);
          if (cl) {
            if (!map[cleanKey]) map[cleanKey] = [];
            if (!map[cleanKey].includes(cl)) map[cleanKey].push(cl);
          }
        }
      });
    }

    return map;
  }, [product]);

  // Guaranteed complete gallery: Main Image ALWAYS FIRST + ALL Color Images (No filtering)
  const images = useMemo(() => {
    if (!product) return [];

    const list: string[] = [];

    // 1. Dedicated Main Product Image (ALWAYS FIRST)
    const rawMain = product.main_image || product.mainImage || product.primary_image || product.primaryImage || product.image;
    const cleanMain = cleanImageUrl(rawMain);
    if (cleanMain) {
      list.push(cleanMain);
    }

    // 2. Color-specific images in the exact order of product.colors
    const colorOrder = Array.isArray(product.colors) ? product.colors : Object.keys(colorGalleriesMap);
    colorOrder.forEach((colorName) => {
      const cleanKey = String(colorName).trim().toLowerCase();
      const colImgs = colorGalleriesMap[cleanKey];
      if (Array.isArray(colImgs)) {
        colImgs.forEach((img) => {
          const cl = cleanImageUrl(img);
          if (cl && !list.includes(cl)) {
            list.push(cl);
          }
        });
      }
    });

    // 3. Fallback: Any other color galleries not listed in product.colors
    Object.values(colorGalleriesMap).forEach((colImgs) => {
      if (Array.isArray(colImgs)) {
        colImgs.forEach((img) => {
          const cl = cleanImageUrl(img);
          if (cl && !list.includes(cl)) {
            list.push(cl);
          }
        });
      }
    });

    // 4. Any general images from product.images
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        const cl = cleanImageUrl(img);
        if (cl && !list.includes(cl)) {
          list.push(cl);
        }
      });
    }

    const unique = Array.from(new Set(list.filter(Boolean)));
    return unique.length > 0 ? unique : [DEFAULT_PRODUCT_FALLBACK];
  }, [product, colorGalleriesMap]);

  const sliderRef = useRef(null);
  const thumbnailRowRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const autoplayTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);

  const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Smoothly navigate to specific slide index
  const goToSlide = useCallback((index: number, smooth = true) => {
    if (index < 0 || index >= images.length) return;
    setActiveImg(index);
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    if (sliderRef.current) {
      const width = sliderRef.current.offsetWidth;
      sliderRef.current.scrollTo({
        left: width * index,
        behavior: smooth ? 'smooth' : 'instant',
      });
    }

    if (thumbnailRowRef.current) {
      const buttons = thumbnailRowRef.current.querySelectorAll('button');
      if (buttons[index]) {
        buttons[index].scrollIntoView({
          behavior: smooth ? 'smooth' : 'instant',
          block: 'nearest',
          inline: 'center',
        });
      }
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 450);
  }, [images.length]);

  // Autoplay auto-slide with smooth 4s interval, pause on hover/interaction
  useEffect(() => {
    if (images.length <= 1 || isHovered || isInteracting) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      setActiveImg((prev) => {
        const next = (prev + 1) % images.length;
        if (sliderRef.current) {
          const width = sliderRef.current.offsetWidth;
          sliderRef.current.scrollTo({
            left: width * next,
            behavior: 'smooth',
          });
        }
        if (thumbnailRowRef.current) {
          const buttons = thumbnailRowRef.current.querySelectorAll('button');
          if (buttons[next]) {
            buttons[next].scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center',
            });
          }
        }
        return next;
      });
    }, 4000);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [images.length, isHovered, isInteracting]);

  // Temporarily pause autoplay on user interaction
  const handleUserInteraction = () => {
    setIsInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 6000);
  };

  const handleScroll = (e) => {
    if (isScrollingRef.current) return;
    const width = e.currentTarget.offsetWidth;
    if (width <= 0) return;
    const scrollLeft = e.currentTarget.scrollLeft;
    const page = Math.round(scrollLeft / width);
    if (page !== activeImg && page >= 0 && page < images.length) {
      setActiveImg(page);
    }
  };

  const handleThumbnailClick = (index) => {
    handleUserInteraction();
    goToSlide(index, true);
  };

  const handlePrevSlide = (e) => {
    e.stopPropagation();
    handleUserInteraction();
    const prev = activeImg > 0 ? activeImg - 1 : images.length - 1;
    goToSlide(prev, true);
  };

  const handleNextSlide = (e) => {
    e.stopPropagation();
    handleUserInteraction();
    const next = (activeImg + 1) % images.length;
    goToSlide(next, true);
  };

  // Color Selection: Switches main view to first image of selected color without filtering gallery
  const handleSelectColor = (color) => {
    if (!color) return;
    setSelectedColor(color);
    handleUserInteraction();

    const cleanKey = String(color).trim().toLowerCase();
    const colorImgs = colorGalleriesMap[cleanKey];
    if (Array.isArray(colorImgs) && colorImgs.length > 0) {
      const firstColorImg = colorImgs[0];
      const targetIdx = images.findIndex((img) => img === firstColorImg);
      if (targetIdx !== -1) {
        goToSlide(targetIdx, true);
      }
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [slug]);

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
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

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
    return <ProductDetailSkeleton />;
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

  const handleAddToCart = (e) => {
    if (!inStock) return;
    if (!selectedSize && product.sizes?.length > 0) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    setAdding(true);
    const itemImage = (selectedColor && colorGalleriesMap[selectedColor.toLowerCase()]?.[0]) || images[activeImg] || images[0] || product.image;
    const cartProduct = {
      ...product,
      image: itemImage,
    };
    addItem(cartProduct, selectedSize || 'One Size', selectedColor || 'None', 1, e);
    trackAddToCart(cartProduct, 1, selectedSize || 'One Size');
    
    setTimeout(() => {
      setAdding(false);
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
      }, 1200);
    }, 300);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    if (!selectedSize && product.sizes?.length > 0) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    const itemImage = (selectedColor && colorGalleriesMap[selectedColor.toLowerCase()]?.[0]) || images[activeImg] || images[0] || product.image;
    const cartProduct = {
      ...product,
      image: itemImage,
    };
    addItem(cartProduct, selectedSize || 'One Size', selectedColor || 'None', 1);
    trackAddToCart(cartProduct, 1, selectedSize || 'One Size');
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-32 lg:pt-24 pb-28 lg:pb-20 text-[#1C1613] w-full max-w-full overflow-x-hidden">
      
      {/* Mobile Sticky Navigation Header Bar */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: headerVisible ? 0 : -140, opacity: headerVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#E9E2D2] px-4 py-2.5 flex items-center justify-between shadow-sm transition-all duration-300"
      >
        <button 
          onClick={() => router.back()} 
          className="w-9 h-9 rounded-full bg-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] active:scale-95 transition-transform"
          aria-label="Go Back"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="font-serif font-black text-sm text-[#1C1613] truncate max-w-[55%]">
          {product.name}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] active:scale-95 transition-transform"
            aria-label="Share product"
          >
            <Share2 size={15} />
          </button>
          <button 
            onClick={openCart} 
            className="relative w-9 h-9 rounded-full bg-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] active:scale-95 transition-transform"
            aria-label="View Cart"
          >
            <ShoppingBag size={17} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5533] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      <div className="container-site py-4 lg:py-6 w-full max-w-full min-w-0 overflow-x-hidden">
        
        {/* Desktop Breadcrumb Navigation */}
        <nav className="hidden lg:flex items-center gap-2 text-xs text-gray-500 mb-4 lg:mb-5">
          <Link href="/" className="hover:text-[#1C1613] transition-colors">Home</Link>
          <ChevronLeft size={12} className="rotate-180 text-gray-400" />
          <Link href="/shop" className="hover:text-[#1C1613] transition-colors">Shop</Link>
          <ChevronLeft size={12} className="rotate-180 text-gray-400" />
          <span className="text-[#1C1613] capitalize font-medium">{product.category}</span>
          <ChevronLeft size={12} className="rotate-180 text-gray-400" />
          <span className="text-gray-400 truncate max-w-[240px]">{product.name}</span>
        </nav>

        {/* Main Product Layout Grid */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start w-full max-w-full min-w-0">

          {/* Left Column: Product Image Gallery Showcase (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-24 w-full max-w-full min-w-0 overflow-hidden">
            
            {/* Main Hero Card Container */}
            <div 
              className="relative w-full max-w-full min-w-0 rounded-2xl sm:rounded-[1.8rem] bg-gradient-to-b from-[#F7F4EE] via-[#F4EFE6] to-[#EFEADF] border border-[#E9E2D2] shadow-xs overflow-hidden flex items-center justify-center p-2 sm:p-4 h-[300px] xs:h-[340px] sm:h-[380px] md:h-[420px] lg:h-[430px] xl:h-[460px] max-h-[46vh] lg:max-h-[460px] group/gallery"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={() => handleUserInteraction()}
            >
              
              <div 
                ref={sliderRef}
                onScroll={handleScroll}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {images.map((img, i) => (
                  <div 
                    key={i} 
                    className="w-full h-full flex-shrink-0 snap-start flex items-center justify-center p-1 sm:p-2"
                  >
                    <img
                      src={img}
                      alt={`${product.name} - ${i + 1}`}
                      fetchPriority={i === 0 ? 'high' : 'auto'}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding={i === 0 ? 'sync' : 'async'}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl drop-shadow-sm select-none transition-transform duration-300 group-hover/gallery:scale-[1.02]"
                    />
                  </div>
                ))}
              </div>

              {/* Prev / Next Controls on Desktop Hover */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#1C1613] backdrop-blur-md border border-[#E9E2D2] items-center justify-center shadow-md opacity-0 group-hover/gallery:opacity-100 transition-all z-10 active:scale-95 cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#1C1613] backdrop-blur-md border border-[#E9E2D2] items-center justify-center shadow-md opacity-0 group-hover/gallery:opacity-100 transition-all z-10 active:scale-95 cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Floating Badges */}
              <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
                {product.badge && (
                  <span className={`px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs ${
                    product.badge === 'LIMITED' ? 'bg-[#1C1613] text-[#C5A880]' :
                    product.badge === 'NEW DROP' ? 'bg-emerald-600 text-white' :
                    product.badge === 'SALE' ? 'bg-[#FF5533] text-white' :
                    'bg-[#C5A880] text-white'
                  }`}>
                    {product.badge}
                  </span>
                )}
                {discount && (
                  <span className="px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-[#FF5533] text-white tracking-wider shadow-xs">
                    -{discount}% OFF
                  </span>
                )}
                {!inStock && (
                  <span className="px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-red-600 text-white tracking-wider animate-pulse shadow-xs">
                    SOLD OUT
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => setLiked(!liked)}
                className="absolute top-3.5 right-3.5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/85 backdrop-blur-md border border-[#E9E2D2] flex items-center justify-center hover:bg-white transition-all shadow-xs z-10 active:scale-90"
                aria-label="Save to Wishlist"
              >
                <Heart
                  size={17}
                  className={`transition-colors ${liked ? 'fill-[#FF5533] text-[#FF5533]' : 'text-[#1C1613]'}`}
                />
              </button>

              {/* Pagination Dots Indicator */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeImg === i ? 'bg-[#FF5533] w-5' : 'bg-[#1C1613]/25 w-1.5'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div 
                ref={thumbnailRowRef}
                className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none px-0.5 w-full max-w-full min-w-0 items-center scroll-smooth"
              >
                {images.map((img, i) => {
                  const isSelected = activeImg === i;
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleThumbnailClick(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`relative w-14 h-14 xs:w-15 xs:h-15 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-150 bg-[#F7F4EE] p-1 flex-shrink-0 cursor-pointer active:scale-95 touch-manipulation select-none ${
                        isSelected 
                          ? 'border-[#FF5533] shadow-xs ring-2 ring-[#FF5533]/25 scale-105 opacity-100 z-10' 
                          : 'border-[#E9E2D2] opacity-70 hover:opacity-100 hover:border-[#1C1613]/40'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Product Information & Purchase Controls (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-3.5 sm:space-y-4 w-full max-w-full min-w-0 overflow-hidden">
            
            {/* Header Info */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="text-[11px] font-bold text-[#C5A880] uppercase tracking-[0.2em] font-serif">
                  {product.category || 'Luxury Streetwear'}
                </p>
                {inStock ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 uppercase tracking-wider">
                    In Stock
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60 uppercase tracking-wider">
                    {isVariantOutOfStock ? 'Size Sold Out' : 'Sold Out'}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-black text-[#1C1613] tracking-wide mb-2 leading-snug break-words">
                {product.name}
              </h1>
            </div>

            {/* Price Tag Container */}
            <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3 bg-[#F4EFE6]/60 p-3 sm:p-3.5 rounded-xl border border-[#E9E2D2] w-full max-w-full min-w-0">
              <span className="font-serif font-black text-2xl sm:text-3xl text-[#1C1613]">
                {formatPrice(product.price)}
              </span>
              {originalPrice && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-[10px] font-bold bg-[#FF5533] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div>
                <p className="font-serif font-bold text-[11px] uppercase tracking-wider text-[#1C1613] mb-1.5">
                  Select Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        type="button"
                        key={color}
                        onClick={() => handleSelectColor(color)}
                        className={`max-w-full px-3 py-1.5 rounded-lg font-bold text-xs text-left transition-all duration-150 border whitespace-normal break-words leading-snug cursor-pointer ${
                          isSelected
                            ? 'border-[#1C1613] bg-[#1C1613] text-white shadow-xs'
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <p className="font-serif font-bold text-[11px] uppercase tracking-wider text-[#1C1613]">
                    Select Size
                  </p>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[10px] sm:text-[11px] font-bold text-[#C5A880] hover:text-[#1C1613] transition-colors flex items-center gap-1 bg-white border border-[#E9E2D2] px-2.5 py-1 rounded-full active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Ruler size={11} className="text-[#C5A880]" />
                    <span>Size Guide & Chart</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        type="button"
                        key={size}
                        onClick={() => {
                          setSelectedSize(size);
                          setSizeError(false);
                        }}
                        className={`min-w-[42px] sm:min-w-[46px] h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg font-black text-xs uppercase transition-all duration-150 border cursor-pointer ${
                          isSelected
                            ? 'border-[#1C1613] bg-[#1C1613] text-white shadow-xs scale-105'
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
                      className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"
                    >
                      ⚠️ Please select a size to proceed
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* WhatsApp Size Assistance Guide Banner */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-2xs w-full max-w-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.151 4.204 4.294-1.127z"/>
                      </svg>
                    </div>
                    <div className="text-xs min-w-0 flex-1">
                      <p className="font-bold text-[#1C1613] leading-tight truncate">সাইজ বুঝতে সমস্যা হচ্ছে?</p>
                      <p className="text-[10px] text-[#7C6E65] truncate">আমাদের সাথে হোয়াটসঅ্যাপে কথা বলুন</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`হ্যালো PutiMach! আমি "${product.name}" এর সঠিক সাইজ নির্বাচনে সাহায্য চাচ্ছি।`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all flex items-center justify-center gap-1 active:scale-95 text-center"
                  >
                    <span>WhatsApp Help</span>
                  </a>
                </div>
              </div>
            )}

            {/* Desktop Action Buttons */}
            <div className="hidden lg:flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={!inStock}
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 border-2 cursor-pointer ${
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
                    <Check size={15} /> Added To Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag size={15} /> Add To Cart
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={!inStock}
                onClick={handleBuyNow}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer ${
                  !inStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#FF5533] text-white hover:bg-[#e04422]'
                }`}
              >
                <Zap size={15} /> Buy Now
              </button>
            </div>

            {/* Product Accordions */}
            <div className="space-y-2.5 pt-1">
              <div className="rounded-xl border border-[#E9E2D2] bg-white overflow-hidden">
                <button
                  onClick={() => setDescOpen(!descOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 font-serif font-bold text-xs uppercase tracking-wider text-[#1C1613]"
                >
                  Product Description
                  <ChevronDown size={15} className={`transition-transform duration-200 ${descOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {descOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-xs text-gray-600 leading-relaxed whitespace-pre-line border-t border-[#E9E2D2]/50 pt-2.5">
                        {longDesc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-xl border border-[#E9E2D2] bg-white overflow-hidden">
                <button
                  onClick={() => setFeatOpen(!featOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 font-serif font-bold text-xs uppercase tracking-wider text-[#1C1613]"
                >
                  Features & Details
                  <ChevronDown size={15} className={`transition-transform duration-200 ${featOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {featOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="px-4 pb-4 space-y-1.5 border-t border-[#E9E2D2]/50 pt-2.5">
                        {featuresList.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                            <Check size={13} className="text-[#C5A880] flex-shrink-0" />
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
              <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="text-xs font-bold text-[#1C1613] hover:text-[#C5A880] transition-colors flex items-center gap-1">
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

      {/* Floating Sticky Bottom Mobile Action Bar (Mobile Only - Sleek & Compact) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-40">
        <div className="bg-[#1C1613]/95 backdrop-blur-xl border border-white/10 p-1.5 sm:p-2.5 rounded-full shadow-2xl flex items-center gap-1.5 sm:gap-2">
          
          {/* Wishlist / Heart Button */}
          <button
            type="button"
            onClick={() => setLiked(!liked)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 cursor-pointer"
            aria-label="Wishlist"
          >
            <Heart size={18} className={liked ? 'fill-[#FF5533] text-[#FF5533]' : 'text-white'} />
          </button>

          {/* Add to Cart Button */}
          <button
            type="button"
            disabled={!inStock}
            onClick={handleAddToCart}
            className={`flex-1 h-10 sm:h-12 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
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
                <Check size={14} /> Added!
              </>
            ) : (
              <>
                <ShoppingBag size={14} /> Cart
              </>
            )}
          </button>

          {/* Buy Now Button */}
          <button
            type="button"
            disabled={!inStock}
            onClick={handleBuyNow}
            className={`flex-1 h-10 sm:h-12 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer ${
              !inStock
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-[#FF5533] text-white hover:bg-[#e04422]'
            }`}
          >
            <Zap size={14} /> Buy Now
          </button>

        </div>
      </div>

      {/* Size Guide Modal */}
      <AnimatePresence>
        {sizeGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
              onClick={() => setSizeGuideOpen(false)}
            />

            {/* Centered Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-md sm:max-w-lg max-h-[85vh] bg-white rounded-3xl p-4 sm:p-6 overflow-y-auto border border-[#E9E2D2] shadow-2xl my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E9E2D2] mb-3 sm:mb-4">
                <div>
                  <h3 className="font-serif font-black text-lg sm:text-xl text-[#1C1613]">Size Chart & Fit Guide</h3>
                  <p className="text-[11px] sm:text-xs text-gray-500">Measurements for {product.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#1C1613] hover:bg-gray-200 transition-colors cursor-pointer active:scale-95"
                  aria-label="Close size guide"
                >
                  <X size={15} />
                </button>
              </div>

              {sizeChartImageUrl ? (
                <div className="rounded-2xl overflow-hidden bg-gray-50 p-1.5 sm:p-2 mb-3 sm:mb-4 border border-[#E9E2D2] max-h-[55vh] flex items-center justify-center">
                  <img
                    src={sizeChartImageUrl}
                    alt="Size Chart"
                    className="w-full h-auto max-h-[50vh] object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 text-xs text-gray-600 mb-3 sm:mb-4">
                  <p className="font-semibold text-[#1C1613]">Standard Measurement Guide (Inches)</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100 font-bold text-[#1C1613]">
                          <th className="p-2 border-b">Size</th>
                          <th className="p-2 border-b">Chest</th>
                          <th className="p-2 border-b">Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr><td className="p-2 font-bold text-[#1C1613]">S</td><td className="p-2">38"</td><td className="p-2">27"</td></tr>
                        <tr><td className="p-2 font-bold text-[#1C1613]">M</td><td className="p-2">40"</td><td className="p-2">28"</td></tr>
                        <tr><td className="p-2 font-bold text-[#1C1613]">L</td><td className="p-2">42"</td><td className="p-2">29"</td></tr>
                        <tr><td className="p-2 font-bold text-[#1C1613]">XL</td><td className="p-2">44"</td><td className="p-2">30"</td></tr>
                        <tr><td className="p-2 font-bold text-[#1C1613]">XXL</td><td className="p-2">46"</td><td className="p-2">31"</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="w-full py-2.5 sm:py-3 bg-[#1C1613] hover:bg-[#332A24] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer active:scale-98"
              >
                Close Guide
              </button>
            </motion.div>
          </div>
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
