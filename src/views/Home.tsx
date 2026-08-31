'use client';
// @ts-nocheck
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronRight, Zap, Star, TrendingUp, Heart, MessageCircle, Sparkles, ExternalLink } from 'lucide-react';
import { getProducts, getCategories } from '../lib/api';
import { supabase } from '../lib/supabase';
import { collections } from '../data/products';
import ProductCard from '../components/shop/ProductCard';

const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const formatPrice = (p) => `৳${Number(p).toLocaleString('en-BD')}`;

const defaultHome = {
  heroBgImage: "/api/media/uploads/img_1786604752550_8584.webp",
  heroBadge: "Vintage Weaves",
  heroSubBadge: "EST 2026",
  heroHeading: "WOVEN IN NOSTALGIA.\nTAILORED FOR TODAY.",
  heroSubtext: "Premium vintage fashion and heritage crafts. Handloomed yarns and organic dyes that whisper stories of the past.",
  heroButtonText: "Shop Now",

  collectionsLabel: "THE SECTIONS",
  collectionsTitle: "Browse Curated Archives",

  latestLabel: "New Arrivals",
  latestTitle: "Latest Collection",

  catalogLabel: "The Catalog",
  catalogTitle: "Most Wanted",
  catalogSubtext: "Hand-picked vintage classics, designed to transcend seasons.",

  brandStoryLabel: "OUR HERITAGE & STORIES",
  brandStoryImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
  brandStoryTitle: "Woven in Nostalgia,\nTailored for Today.",
  brandStoryText1: "PutiMach was born out of frustration — the frustration of losing our handloom heritage, and the rush of fast fashion that ignores stories and craft.",
  brandStoryText2: "Every weave carries the legacy of master weavers of Sonargaon and Tangail. Timeless patterns, handcrafted detail, made to age elegantly.",
  brandStoryStats: [
    { val: "100%", label: "Handloomed" },
    { val: "Organic", label: "Heritage Dyes" },
    { val: "Master", label: "Weavers" }
  ],

  instagramLabel: "#PUTIMACHSTORIES",
  instagramTitle: "ON INSTAGRAM",
  instagramSubtext: "Follow @putimachhh for style updates and heritage weaving documentation.",
  instagramUrl: "https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn",
  instagramProfileImage: "",
  instagramImages: []
};

/* ─── Scroll Reveal Wrapper ─────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────── */
function Hero({ settings }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const fallbackImg = "/api/media/uploads/img_1786604752550_8584.webp";

  const [activeHeroBg, setActiveHeroBg] = useState(() => {
    return settings?.heroBgImage || fallbackImg;
  });

  useEffect(() => {
    if (settings?.heroBgImage) {
      setActiveHeroBg(settings.heroBgImage);
    }
  }, [settings?.heroBgImage]);

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center bg-[#1C1613] overflow-hidden border-b border-[#E9E2D2]" style={{ height: '100vh', minHeight: '100vh' }}>
      <motion.div style={{ y }} className="absolute inset-0 z-0 bg-[#1C1613]">
        <img
          src={activeHeroBg}
          alt="Hero Banner"
          className="w-full h-full object-cover opacity-100"
          draggable="false"
          fetchPriority="high"
          loading="eager"
          decoding="sync"
          onError={() => {
            if (activeHeroBg !== fallbackImg) {
              setActiveHeroBg(fallbackImg);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C1613]/40 via-transparent to-[#1C1613]/40"></div>
      </motion.div>
      
      <motion.div style={{ opacity }} className="relative z-10 text-center px-4 max-w-3xl mx-auto -translate-y-20">
        <div className="animate-fade-in-up">
          <Link 
            href="/shop" 
            className="border border-[#1C1613]/30 bg-[#9C8975]/35 backdrop-blur-sm text-[#1C1613] hover:bg-[#1C1613] hover:text-[#FDFBF7] hover:border-[#1C1613] font-black tracking-[0.25em] text-sm uppercase px-8 py-4 transition-all duration-300 inline-block cursor-pointer"
          >
            {settings.heroButtonText || 'Shop Now'}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Collections ────────────────────────────────────────────────────── */
function Collections({ settings, categories }) {
  if (!categories || categories.length === 0) return null;

  const list = categories.map(cat => ({
    id: cat.slug || cat.id,
    label: (cat.name || '').trim(),
    image: cat.image_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=650&q=70'
  }));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex items-baseline justify-between border-b border-[#E9E2D2] pb-3 mb-6">
        <div>
          <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif mb-1">
            {settings.collectionsLabel || 'THE SECTIONS'}
          </p>
          <h2 className="text-lg font-serif text-[#1C1613] uppercase tracking-wider">
            {settings.collectionsTitle || 'Browse Curated Archives'}
          </h2>
        </div>
        <Link 
          href="/shop" 
          className="text-xs font-semibold text-[#C5A880] uppercase tracking-widest hover:text-[#1C1613] transition-colors font-sans flex-shrink-0"
        >
          View All
        </Link>
      </div>
      
      {/* Horizontal Scroll Slider */}
      <div 
        className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {list.map((cat, idx) => (
          <Link
            key={idx}
            href={`/shop?category=${cat.id}`}
            style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
            className="relative w-32 sm:w-40 h-44 sm:h-52 rounded-xl overflow-hidden group border border-[#E9E2D2] block"
          >
            <img
              src={cat.image}
              alt={`${cat.label} Collection`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading={idx < 4 ? 'eager' : 'lazy'}
              fetchPriority={idx < 2 ? 'high' : 'auto'}
              decoding="async"
              sizes="(max-width: 640px) 33vw, 200px"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1613]/75 via-[#1C1613]/10 to-transparent group-hover:from-[#1C1613]/85 transition-all duration-300" />
            {/* Label */}
            <div className="absolute inset-0 flex flex-col justify-end p-3">
              <span className="text-[8px] font-bold text-[#C5A880] uppercase tracking-widest mb-0.5 font-serif leading-none">Explore</span>
              <h3 className="text-xs sm:text-sm font-serif text-white uppercase tracking-wide leading-tight">{cat.label}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Recommended For You ────────────────────────────────────────────── */
function Recommended({ products, settings }) {
  const recommended = products.slice(0, 4);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between border-b border-[#E9E2D2] pb-3 mb-8">
        <h2 className="text-lg font-serif font-semibold uppercase tracking-vintage text-[#1C1613]">
          Recommended For You
        </h2>
        <Link 
          href="/shop?sort=popular" 
          className="text-xs font-semibold text-[#C5A880] uppercase tracking-vintage hover:text-[#1C1613] transition-colors font-sans"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {recommended.map((prod, idx) => (
          <ProductCard key={prod.id} product={prod} index={idx} />
        ))}
      </div>
    </section>
  );
}

/* ─── New Arrivals ───────────────────────────────────────────────────── */
function NewArrivals({ products, settings }) {
  const latest = products.slice(0, 8);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between border-b border-[#E9E2D2] pb-3 mb-8">
        <div>
          <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif mb-1">
            {settings.latestLabel || 'New Arrivals'}
          </p>
          <h2 className="text-lg font-serif text-[#1C1613] uppercase tracking-wider">
            {settings.latestTitle || 'Latest Collection'}
          </h2>
        </div>
        <Link 
          href="/shop?sort=newest" 
          className="text-xs font-semibold text-[#C5A880] uppercase tracking-widest hover:text-[#1C1613] transition-colors font-sans flex-shrink-0"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {latest.map((prod, idx) => (
          <ProductCard key={prod.id} product={prod} index={idx} />
        ))}
      </div>
    </section>
  );
}

/* ─── Instagram Section ──────────────────────────────────────────────── */
function InstagramSection({ settings }) {
  const images = [
    settings.instagramImage1 || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80',
    settings.instagramImage2 || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    settings.instagramImage3 || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
    settings.instagramImage4 || 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80',
    settings.instagramImage5 || 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=400&q=80',
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="text-center mb-8">
        <p className="text-[10px] font-bold text-[#C5A880] uppercase tracking-[0.25em] font-serif mb-1">
          {settings.instagramLabel || '#PUTIMACHSTORIES'}
        </p>
        <h2 className="text-xl font-serif text-[#1C1613] uppercase tracking-wider mb-2">
          {settings.instagramTitle || 'ON INSTAGRAM'}
        </h2>
        <p className="text-xs text-[#1C1613]/60 max-w-md mx-auto font-sans mb-4">
          {settings.instagramSubtext || 'Follow @putimachhh for style updates and heritage weaving documentation.'}
        </p>
        {settings.instagramUrl && (
          <a
            href={settings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A880] hover:text-[#1C1613] uppercase tracking-widest transition-colors font-sans mb-4 group"
          >
            <InstagramIcon size={14} className="group-hover:scale-115 transition-transform duration-300" />
            View Instagram
            <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {images.map((img, idx) => (
          <a
            key={idx}
            href={settings.instagramUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square rounded-xl overflow-hidden group border border-[#E9E2D2] bg-[#1C1613] block"
          >
            <img
              src={img}
              alt={`Instagram post ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[#1C1613]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <InstagramIcon size={24} className="text-[#C5A880]" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function mergeSettings(siteData) {
  const clean = {};
  if (siteData && typeof siteData === 'object') {
    Object.keys(siteData).forEach(k => {
      if (siteData[k] !== '' && siteData[k] !== null && siteData[k] !== undefined) {
        clean[k] = siteData[k];
      }
    });
  }
  return { ...defaultHome, ...clean };
}

/* ─── Home Page (Client Shell) ────────────────────────────────────────── */
// Receives server-fetched data as props — first render is always populated.
// useEffect only does background refresh to keep data fresh without blocking UI.
export default function Home({ initialSettings = null, initialProducts = [], initialCategories = [] }) {
  const serverSettings = initialSettings ? mergeSettings(initialSettings) : defaultHome;
  const topSelling = initialProducts?.find(p => p.badge?.toLowerCase() === 'featured' || p.badge?.toLowerCase() === 'hot') || initialProducts?.[0] || null;

  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [topSellingProduct, setTopSellingProduct] = useState(topSelling);
  const [settings, setSettings] = useState(serverSettings);

  // Background refresh: silently sync fresh data without touching visible UI
  useEffect(() => {
    async function backgroundSync() {
      try {
        let siteData = null;
        const { data: sData } = await supabase
          .from('site_settings')
          .select('data')
          .eq('id', 'home_page')
          .maybeSingle();

        if (sData?.data) {
          siteData = sData.data;
        } else {
          const { data: cbData } = await supabase
            .from('cb_settings')
            .select('data')
            .eq('id', 'home_page')
            .maybeSingle();
          siteData = cbData?.data;
        }

        if (siteData && typeof siteData === 'object') {
          const freshSettings = mergeSettings(siteData);
          setSettings(prev => {
            const finalBg = freshSettings.heroBgImage || prev?.heroBgImage || defaultHome.heroBgImage;
            return {
              ...prev,
              ...freshSettings,
              heroBgImage: finalBg,
            };
          });
        }

        const [prodData, catData] = await Promise.all([
          getProducts({ forceRefresh: true }).catch(() => null),
          getCategories({ forceRefresh: true }).catch(() => null),
        ]);

        if (prodData?.length) {
          setProducts(prodData);
          const top = prodData.find(p => p.badge?.toLowerCase() === 'featured' || p.badge?.toLowerCase() === 'hot') || prodData[0];
          setTopSellingProduct(top || null);
        }
        if (catData?.length) setCategories(catData);
      } catch (err) {
        console.warn('[Home] Background sync notice:', err);
      }
    }
    backgroundSync();
  }, []);

  return (
    <main className="space-y-20 pb-20 bg-[#FDFBF7] vintage-grain">
      <Hero settings={settings} />
      <Collections settings={settings} categories={categories} />
      {products.length > 0 && (
        <>
          <Recommended products={products} settings={settings} />
          <NewArrivals products={products} settings={settings} />
        </>
      )}

      <InstagramSection settings={settings} />
    </main>
  );
}
