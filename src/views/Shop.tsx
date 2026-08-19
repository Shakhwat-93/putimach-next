'use client';
// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, Search, ChevronDown, Grid2X2, Grid3X3, 
  Loader2, ChevronLeft, ChevronRight, X, Check, RotateCcw, Sparkles 
} from 'lucide-react';
import { getProducts, getCategories } from '../lib/api';
import ProductCard from '../components/shop/ProductCard';
import { trackSearch } from '../lib/tracking';

const sortOptions = [
  { val: 'featured', label: 'Featured' },
  { val: 'price-asc', label: 'Price: Low to High' },
  { val: 'price-desc', label: 'Price: High to Low' },
  { val: 'newest', label: 'Newest' },
  { val: 'rating', label: 'Top Rated' },
];

const priceRanges = [
  { val: 'all', label: 'All Prices' },
  { val: '0-1500', label: 'Under ৳1,500' },
  { val: '1500-3000', label: '৳1,500 – ৳3,000' },
  { val: '3000-5000', label: '৳3,000 – ৳5,000' },
  { val: '5000+', label: 'Above ৳5,000' },
];

/* ─── Shop Banner Slider ─────────────────────────────────────────────── */
function ShopBannerSlider({ slides }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const normalizedSlides = useMemo(() => {
    if (!slides) return [];
    return slides.map((slide, idx) => {
      if (typeof slide === 'string') {
        return { id: idx, image: slide, title: '', subtitle: '', cta_text: '', cta_link: '' };
      }
      return {
        id: slide.id || idx,
        image: slide.image || '',
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        cta_text: slide.cta_text || '',
        cta_link: slide.cta_link || ''
      };
    });
  }, [slides]);

  useEffect(() => {
    if (normalizedSlides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % normalizedSlides.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [normalizedSlides]);

  if (normalizedSlides.length === 0) return null;

  const prev = () => { clearInterval(timerRef.current); setCurrent(c => (c - 1 + normalizedSlides.length) % normalizedSlides.length); };
  const next = () => { clearInterval(timerRef.current); setCurrent(c => (c + 1) % normalizedSlides.length); };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E9E2D2] shadow-sm bg-[#1C1613] group aspect-[16/7] sm:aspect-[2.2/1] lg:aspect-[2.3/1]">
      <AnimatePresence mode="wait">
        {normalizedSlides.map((slide, idx) =>
          idx === current ? (
            <motion.div
              key={slide.id || idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center bg-[#1C1613]"
            >
              <img
                src={slide.image}
                alt={slide.title || `Slide ${idx + 1}`}
                className="w-full h-full object-cover object-center rounded-2xl sm:rounded-3xl"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              {(slide.title || slide.subtitle || slide.cta_text) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 rounded-2xl sm:rounded-3xl"
                  style={{ background: 'linear-gradient(to right, rgba(28,22,19,0.45), rgba(28,22,19,0.18), rgba(28,22,19,0.45))' }}>
                  {slide.subtitle && <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.3em] mb-2 font-serif">{slide.subtitle}</p>}
                  {slide.title && <h2 className="text-2xl sm:text-4xl font-serif text-white uppercase tracking-widest mb-3">{slide.title}</h2>}
                  {slide.cta_text && slide.cta_link && (
                    <a href={slide.cta_link}
                      className="border border-white/80 bg-transparent text-white hover:bg-white hover:text-[#1C1613] font-semibold tracking-[0.2em] text-[10px] uppercase px-8 py-3 transition-all duration-300 inline-block mt-2 rounded-full">
                      {slide.cta_text}
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      {normalizedSlides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-200 rounded-full z-10 opacity-0 group-hover:opacity-100 backdrop-blur-sm">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-200 rounded-full z-10 opacity-0 group-hover:opacity-100 backdrop-blur-sm">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
            {normalizedSlides.map((_, i) => (
              <span
                key={i}
                onClick={() => { clearInterval(timerRef.current); setCurrent(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer shrink-0 inline-block ${
                  i === current ? 'bg-[#FF5533] w-4' : 'bg-white/60 w-1.5 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Shop View Component ───────────────────────────────────────── */
export default function Shop() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shopSlider, setShopSlider] = useState([]);
  const [shopSettings, setShopSettings] = useState({
    title: 'Exclusive Catalog',
    subtitle: 'Luxury Streetwear',
  });
  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [grid, setGrid] = useState('3');
  const sortDropdownRef = useRef(null);

  const activeCategory = searchParams.get('cat') || 'all';
  const activePrice = searchParams.get('price') || 'all';
  const activeSort = searchParams.get('sort') || 'featured';
  const searchQuery = searchParams.get('q') || '';

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    if (sortOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [sortOpen]);

  useEffect(() => {
    const fetchWithTimeout = (url, ms = 1500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      return fetch(url, { signal: controller.signal })
        .then(res => { clearTimeout(id); return res; })
        .catch(err => { clearTimeout(id); throw err; });
    };

    async function loadData() {
      setLoading(true);
      try {
        const t = Date.now();
        const [prodList, catList, shopSiteRes, sliderRes] = await Promise.all([
          getProducts().catch(err => { console.error('Failed to load products:', err); return []; }),
          getCategories().catch(err => { console.error('Failed to load categories:', err); return []; }),
          fetchWithTimeout(`/admin-api/site-settings/shop_page?t=${t}`)
            .then(r => r.ok ? r.json().catch(() => null) : null)
            .catch(() => null),
          fetchWithTimeout(`/admin-api/site-settings/shop_slider?t=${t}`)
            .then(r => r.ok ? r.json().catch(() => null) : null)
            .catch(() => null),
        ]);
        setProducts(prodList);
        setCategories(catList);
        if (shopSiteRes?.success && shopSiteRes.data) {
          setShopSettings({ title: 'Exclusive Catalog', subtitle: 'Luxury Streetwear', ...shopSiteRes.data });
        }
        if (sliderRes?.success && Array.isArray(sliderRes.data) && sliderRes.data.length > 0) {
          setShopSlider(sliderRes.data);
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fire Search tracking event when user searches
  useEffect(() => {
    if (!searchQuery) return;
    const timer = setTimeout(() => {
      trackSearch(searchQuery);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Robust URL Search Params Updater
  const updateParam = (key, val) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!val || val === 'all' || val === 'featured') {
      params.delete(key);
    } else {
      params.set(key, val);
    }
    const qs = params.toString();
    router.push(qs ? `?${qs}` : '/shop', { scroll: false });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cat');
    params.delete('price');
    params.delete('q');
    params.delete('sort');
    const qs = params.toString();
    router.push(qs ? `?${qs}` : '/shop', { scroll: false });
  };

  const computedCategories = useMemo(() => {
    const allCount = products.length;
    const catCounts = { all: allCount };

    categories.forEach((c) => {
      const slug = c.slug || c.id;
      catCounts[slug] = products.filter((p) => p.category === slug || p.category === c.name).length;
    });

    return [
      { id: 'all', label: 'All Items', count: allCount },
      ...categories.map((c) => ({
        id: c.slug || c.id,
        label: c.name,
        count: catCounts[c.slug || c.id] || 0,
      })),
    ];
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory);
    }

    // Price
    if (activePrice !== 'all') {
      const [min, max] = activePrice === '5000+' ? [5000, Infinity] : activePrice.split('-').map(Number);
      result = result.filter((p) => p.price >= min && p.price <= max);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort
    if (activeSort === 'price-asc') result.sort((a, b) => Number(a.price) - Number(b.price));
    if (activeSort === 'price-desc') result.sort((a, b) => Number(b.price) - Number(a.price));
    if (activeSort === 'newest') result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (activeSort === 'rating') result.sort((a, b) => (b.rating || 5) - (a.rating || 5));

    return result;
  }, [products, activeCategory, activePrice, activeSort, searchQuery]);

  const activeFiltersCount = [
    activeCategory !== 'all',
    activePrice !== 'all',
    searchQuery !== '',
    activeSort !== 'featured',
  ].filter(Boolean).length;

  const currentSortLabel = sortOptions.find((o) => o.val === activeSort)?.label || 'Featured';
  const currentCategoryLabel = computedCategories.find((c) => c.id === activeCategory)?.label || activeCategory;
  const currentPriceLabel = priceRanges.find((p) => p.val === activePrice)?.label || activePrice;

  return (
    <div className="min-h-screen pt-20 pb-20 bg-[#FDFBF7]">
      {/* ─── Page Header ─── */}
      <div className="container-site py-8 lg:py-12">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-[#C5A880]" />
            <p className="text-xs font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif">
              {shopSettings.subtitle}
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#1C1613] tracking-tight mb-2">
            {shopSettings.title}
          </h1>
          <p className="text-sm text-[#1C1613]/60">
            {loading ? 'Curating catalog...' : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'masterpiece' : 'masterpieces'} available`}
          </p>
        </motion.div>
      </div>

      {/* ─── Shop Banner Slider ─── */}
      {shopSlider.length > 0 && (
        <div className="container-site mb-8">
          <ShopBannerSlider slides={shopSlider} />
        </div>
      )}

      <div className="container-site">
        {/* ─── Quick Category Pills (Instant 1-Tap Filter) ─── */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 min-w-max">
            {computedCategories.map((c) => {
              const isSelected = activeCategory === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => updateParam('cat', c.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none active:scale-95 border ${
                    isSelected
                      ? 'bg-[#1C1613] text-[#C5A880] border-[#1C1613] shadow-md ring-2 ring-[#C5A880]/20'
                      : 'bg-white text-[#1C1613]/80 border-[#E9E2D2] hover:border-[#1C1613] hover:text-[#1C1613] hover:bg-[#F7F4EE]'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-[#C5A880]/20 text-[#C5A880]' : 'bg-[#1C1613]/5 text-[#1C1613]/60'
                  }`}>
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Toolbar (Filters + Search + Sort + Grid) ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3 sm:p-4 rounded-2xl border border-[#E9E2D2] shadow-sm">
          {/* Left: Filter Toggle + Search */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
            {/* Filter Toggle (Desktop: Sidebar, Mobile: Modal) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setMobileFilterOpen(true);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 ${
                sidebarOpen || activeFiltersCount > 0
                  ? 'bg-[#1C1613] text-[#C5A880] border-[#1C1613] shadow-sm'
                  : 'bg-[#FDFBF7] border-[#E9E2D2] text-[#1C1613] hover:border-[#1C1613] hover:bg-[#F4EFE6]'
              }`}
            >
              <SlidersHorizontal size={14} className="shrink-0" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#FF5533] text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1C1613]/40" />
              <input
                type="text"
                placeholder="Search collection..."
                value={searchQuery}
                onChange={(e) => updateParam('q', e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#E9E2D2] focus:border-[#1C1613] rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-[#1C1613] placeholder-[#1C1613]/40 focus:outline-none transition-colors"
                id="shop-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => updateParam('q', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1C1613]/40 hover:text-[#1C1613] cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Right: Luxury Sort Dropdown + Grid Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sort Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#E9E2D2] bg-[#FDFBF7] text-xs font-bold text-[#1C1613] hover:border-[#1C1613] hover:bg-[#F4EFE6] transition-all duration-200 cursor-pointer active:scale-95 select-none"
              >
                <span className="text-[#1C1613]/60 font-medium">Sort:</span>
                <span>{currentSortLabel}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 text-[#1C1613]/60 ${sortOpen ? 'rotate-180 text-[#1C1613]' : ''}`} />
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-[#E9E2D2] overflow-hidden z-50 shadow-2xl p-1.5 select-none"
                  >
                    <div className="px-3 py-2 border-b border-[#E9E2D2]/60 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A880] font-serif">Sort Collection</p>
                    </div>
                    {sortOptions.map((opt) => {
                      const isCurrent = activeSort === opt.val;
                      return (
                        <button
                          type="button"
                          key={opt.val}
                          onClick={() => {
                            updateParam('sort', opt.val);
                            setSortOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                            isCurrent
                              ? 'bg-[#1C1613] text-[#C5A880] font-bold shadow-sm'
                              : 'text-[#1C1613] hover:bg-[#F7F4EE] hover:text-[#1C1613]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isCurrent && <Check size={14} className="text-[#C5A880] shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Grid Toggle (Desktop Only) */}
            <div className="hidden md:flex items-center gap-1 border border-[#E9E2D2] rounded-xl p-1 bg-[#FDFBF7]">
              <button
                type="button"
                onClick={() => setGrid('2')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${grid === '2' ? 'bg-[#1C1613] text-[#C5A880]' : 'text-[#1C1613]/50 hover:text-[#1C1613]'}`}
                title="2 Columns"
              >
                <Grid2X2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setGrid('3')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${grid === '3' ? 'bg-[#1C1613] text-[#C5A880]' : 'text-[#1C1613]/50 hover:text-[#1C1613]'}`}
                title="3 Columns"
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Active Filter Badges Bar ─── */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white rounded-xl border border-[#E9E2D2] shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1613]/50 mr-1">Active:</span>

            {activeCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1613] text-[#C5A880] text-xs font-medium shadow-xs">
                Category: {currentCategoryLabel}
                <button type="button" onClick={() => updateParam('cat', 'all')} className="hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {activePrice !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1613] text-[#C5A880] text-xs font-medium shadow-xs">
                Price: {currentPriceLabel}
                <button type="button" onClick={() => updateParam('price', 'all')} className="hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1613] text-[#C5A880] text-xs font-medium shadow-xs">
                &ldquo;{searchQuery}&rdquo;
                <button type="button" onClick={() => updateParam('q', '')} className="hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {activeSort !== 'featured' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1613] text-[#C5A880] text-xs font-medium shadow-xs">
                Sort: {currentSortLabel}
                <button type="button" onClick={() => updateParam('sort', 'featured')} className="hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#FF5533] hover:underline ml-auto cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset All
            </button>
          </div>
        )}

        {/* ─── Main Content Layout (Sidebar + Product Grid) ─── */}
        <div className="flex gap-8 items-start">
          {/* Desktop Sidebar Filters */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 280 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden shrink-0 hidden md:block"
              >
                <div className="w-[280px] bg-white p-5 rounded-2xl border border-[#E9E2D2] shadow-sm space-y-6">
                  {/* Category Filter */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A880] font-serif mb-3">
                      Categories
                    </h3>
                    <div className="space-y-1">
                      {computedCategories.map((c) => {
                        const isSelected = activeCategory === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => updateParam('cat', c.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-[#1C1613] text-[#C5A880] font-bold shadow-xs'
                                : 'text-[#1C1613]/80 hover:text-[#1C1613] hover:bg-[#F7F4EE]'
                            }`}
                          >
                            <span>{c.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-[#C5A880]/20 text-[#C5A880]' : 'bg-[#1C1613]/5 text-[#1C1613]/60'
                            }`}>
                              {c.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div className="pt-4 border-t border-[#E9E2D2]/60">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A880] font-serif mb-3">
                      Price Range
                    </h3>
                    <div className="space-y-1">
                      {priceRanges.map((p) => {
                        const isSelected = activePrice === p.val;
                        return (
                          <button
                            type="button"
                            key={p.val}
                            onClick={() => updateParam('price', p.val)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-[#1C1613] text-[#C5A880] font-bold shadow-xs'
                                : 'text-[#1C1613]/80 hover:text-[#1C1613] hover:bg-[#F7F4EE]'
                            }`}
                          >
                            <span>{p.label}</span>
                            {isSelected && <Check size={13} className="text-[#C5A880]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clear Button */}
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="w-full py-2.5 rounded-xl border border-[#FF5533]/30 text-[#FF5533] hover:bg-[#FF5533]/10 font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      Clear All Filters
                    </button>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Product Grid Area */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-[#E9E2D2]">
                <Loader2 className="animate-spin text-[#C5A880] mb-4" size={36} />
                <p className="text-[#1C1613]/60 text-xs font-mono tracking-widest uppercase">Loading exclusive collection...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#E9E2D2] p-8 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#F7F4EE] border border-[#E9E2D2] flex items-center justify-center mx-auto mb-4 text-[#C5A880]">
                  <SlidersHorizontal size={24} />
                </div>
                <h3 className="text-xl font-serif font-black text-[#1C1613] mb-2">No matching pieces found</h3>
                <p className="text-[#1C1613]/60 text-xs mb-6 max-w-sm mx-auto">
                  Try adjusting your price range or exploring different categories to discover our latest drop.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-[#1C1613] text-[#C5A880] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#2A221E] transition-all shadow-sm border border-[#C5A880]/30 cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-4 sm:gap-6 ${grid === '2' ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
                {filteredProducts.map((p, idx) => (
                  <ProductCard key={p.id || idx} product={p} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Slide-Over Drawer ─── */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-[999] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              className="absolute inset-0 bg-[#1C1613]/70 backdrop-blur-xs cursor-pointer"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xs bg-[#FDFBF7] h-full shadow-2xl flex flex-col z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#E9E2D2] bg-white">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-[#C5A880]" />
                  <h3 className="font-serif font-black text-base text-[#1C1613]">Filter Catalog</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#F7F4EE] flex items-center justify-center text-[#1C1613]/60 hover:text-[#1C1613] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Filters Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Categories */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#C5A880] font-serif mb-3">Categories</p>
                  <div className="space-y-1.5">
                    {computedCategories.map((c) => {
                      const isSelected = activeCategory === c.id;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => updateParam('cat', c.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#1C1613] text-[#C5A880] font-bold shadow-xs'
                              : 'bg-white text-[#1C1613]/80 border border-[#E9E2D2]'
                          }`}
                        >
                          <span>{c.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-[#C5A880]/20 text-[#C5A880]' : 'bg-[#1C1613]/5 text-[#1C1613]/60'
                          }`}>
                            {c.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Ranges */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#C5A880] font-serif mb-3">Price Range</p>
                  <div className="space-y-1.5">
                    {priceRanges.map((p) => {
                      const isSelected = activePrice === p.val;
                      return (
                        <button
                          type="button"
                          key={p.val}
                          onClick={() => updateParam('price', p.val)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#1C1613] text-[#C5A880] font-bold shadow-xs'
                              : 'bg-white text-[#1C1613]/80 border border-[#E9E2D2]'
                          }`}
                        >
                          <span>{p.label}</span>
                          {isSelected && <Check size={14} className="text-[#C5A880]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-[#E9E2D2] bg-white flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearAllFilters();
                    setMobileFilterOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-[#E9E2D2] text-[#1C1613] font-bold text-xs uppercase tracking-wider hover:bg-[#F7F4EE] transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#1C1613] text-[#C5A880] font-bold text-xs uppercase tracking-wider hover:bg-[#2A221E] transition-all shadow-sm cursor-pointer"
                >
                  Apply ({filteredProducts.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
