'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Search, Zap, Package, UserCheck, ChevronDown, ArrowRight, Layers } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import CartDrawer from './CartDrawer';
import { getCategories } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function Navbar({
  initialBrand,
  initialNavMenu,
  initialCategories,
}: {
  initialBrand?: { logoUrl: string; brandName: string; tagline?: string; copyright?: string };
  initialNavMenu?: any[];
  initialCategories?: any[];
} = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories || []);
  const [navMenu, setNavMenu] = useState(initialNavMenu || null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [brandSettings, setBrandSettings] = useState(initialBrand || {
    logoUrl: '/api/media/uploads/img_1786602897193_2103.webp',
    brandName: 'PutiMach',
    tagline: 'Timeless Style. Modern Soul.'
  });
  const [mounted, setMounted] = useState(false);

  const { openCart, items, badgeBouncing } = useCartStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialBrand) setBrandSettings(initialBrand);
  }, [initialBrand]);

  useEffect(() => {
    if (initialNavMenu) setNavMenu(initialNavMenu);
  }, [initialNavMenu]);

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    let isMounted = true;
    async function loadFreshCms() {
      try {
        const [bRes, catsRes] = await Promise.all([
          supabase.from('cb_settings').select('data').eq('id', 'brand_settings').maybeSingle(),
          getCategories()
        ]);
        if (!isMounted) return;
        if (bRes?.data?.data?.logoUrl || bRes?.data?.data?.brandName) {
          setBrandSettings(prev => ({ ...prev, ...bRes.data.data }));
        }
        if (Array.isArray(catsRes) && catsRes.length > 0) {
          setCategories(catsRes);
        }
      } catch (err) {
        // Non-critical background sync
      }
    }
    loadFreshCms();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  // Filter only active, published categories
  const activeCategories = useMemo(() => {
    return (categories || []).filter((c) => {
      if (!c || !c.name) return false;
      if (c.status === 'draft' || c.status === 'inactive' || c.is_active === false) return false;
      return true;
    });
  }, [categories]);

  // Build category hierarchy supporting subcategories if parent_id exists
  const categoryTree = useMemo(() => {
    const active = activeCategories;
    const hasParents = active.some((c) => Boolean(c.parent_id || c.parentId || c.parent || c.parent_slug));
    if (!hasParents) {
      return active.map((c) => ({ ...c, subcategories: [] }));
    }
    const parents = active.filter((c) => !c.parent_id && !c.parentId && !c.parent && !c.parent_slug);
    const children = active.filter((c) => Boolean(c.parent_id || c.parentId || c.parent || c.parent_slug));

    return parents.map((p) => {
      const pId = String(p.id || '').trim().toLowerCase();
      const pSlug = String(p.slug || '').trim().toLowerCase();
      const subs = children.filter((c) => {
        const parentRef = String(c.parent_id || c.parentId || c.parent || c.parent_slug || '').trim().toLowerCase();
        return parentRef === pId || parentRef === pSlug;
      });
      return {
        ...p,
        subcategories: subs,
      };
    });
  }, [activeCategories]);

  // Primary navigation items (excluding category links to prevent duplicates)
  const primaryNavLinks = useMemo(() => {
    let list = Array.isArray(navMenu) ? [...navMenu] : [];

    list = list.filter((item) => {
      if (!item || !item.url) return false;
      const u = item.url.toLowerCase();
      if (u.includes('category=') || u.includes('cat=' )) return false;
      return true;
    });

    if (list.length === 0) {
      return [
        { label: 'HOME', url: '/' },
        { label: 'NEW DROPS', url: '/shop?badge=NEW DROP' },
        { label: 'ALL PRODUCTS', url: '/shop' },
      ];
    }

    return list;
  }, [navMenu]);

  const toggleCatExpand = (catId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const { data, error } = await supabase
          .from('cb_settings')
          .select('data')
          .eq('id', 'contact_info')
          .maybeSingle();
        if (data && data.data?.announcement) {
          setAnnouncementText(data.data.announcement);
        }
      } catch (err) {
        console.error('Failed to load announcement:', err);
      }
    }
    loadAnnouncement();
  }, []);

  const [navVisible, setNavVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 20);

      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY + 6) {
          // Scrolling DOWN -> Hide Navbar
          setNavVisible(false);
        } else if (currentScrollY < lastScrollY - 6) {
          // Scrolling UP -> Show Navbar
          setNavVisible(true);
        }
      } else {
        setNavVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: navVisible ? 0 : -110, opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#E9E2D2]' : 'bg-transparent border-transparent'
        }`}
      >
        {announcementText && (
          <div className="bg-[#1C1613] text-[#C5A880] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] py-2 px-4 text-center border-b border-[#C5A880]/15">
            {announcementText}
          </div>
        )}
        <div className="container-site">
          <div className="relative flex items-center justify-between h-16 lg:h-20">
            
            {/* Left: Menu Toggle Button */}
            <div className="flex items-center">
              <button 
                onClick={() => setMobileOpen(true)}
                className="flex items-center gap-2 text-[#1C1613] hover:text-[#C5A880] transition-colors focus:outline-none cursor-pointer group" 
                aria-label="Open menu"
              >
                <span className="relative flex flex-col gap-1 w-6">
                  <span className="h-[2.5px] w-6 bg-[#1C1613] group-hover:bg-[#C5A880] transition-all" />
                  <span className="h-[2.5px] w-4 bg-[#1C1613] group-hover:bg-[#C5A880] transition-all" />
                  <span className="h-[2.5px] w-6 bg-[#1C1613] group-hover:bg-[#C5A880] transition-all" />
                </span>
                <span className="hidden md:inline text-xs font-bold uppercase tracking-widest mt-0.5">Menu</span>
              </button>
            </div>

            {/* Center: Brand Logo */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center max-w-[65%] xs:max-w-[70%] sm:max-w-none">
              <Link href="/" className="flex items-center gap-2.5 group">
                {brandSettings.logoUrl && (
                  <img 
                    src={brandSettings.logoUrl} 
                    alt={brandSettings.brandName || "Logo"} 
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0';
                    }}
                    className="w-20 h-20 xs:w-24 xs:h-24 md:w-14 md:h-14 lg:w-32 lg:h-32 object-contain group-hover:scale-105 transition-transform shrink-0" 
                  />
                )}
                <span className="hidden md:inline font-serif md:text-lg lg:text-2xl font-black tracking-wider uppercase text-[#1C1613] truncate leading-none">
                  {brandSettings.brandName}
                </span>
              </Link>
            </div>

            {/* Right: Search & Cart */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSearchOpen(true)}
                className="text-[#1C1613] hover:text-[#C5A880] transition-colors p-1.5"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <motion.button
                id="global-navbar-cart-btn"
                onClick={openCart}
                animate={badgeBouncing ? { scale: [1, 1.45, 1], rotate: [0, -10, 10, 0] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className="relative text-[#1C1613] hover:text-[#C5A880] transition-colors p-1.5 flex items-center cursor-pointer"
                aria-label="Shopping Cart"
              >
                <ShoppingBag size={22} />
                {mounted && totalItems > 0 && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border border-[#FDFBF7] transition-all duration-300 ${badgeBouncing ? 'scale-125 bg-[#FF5533] text-white shadow-lg' : 'bg-[#1C1613] text-[#C5A880]'}`}>
                    {totalItems}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1C1613]/80 backdrop-blur-md flex items-start justify-center pt-24 px-4"
          >
            <div className="w-full max-w-xl bg-[#FDFBF7] p-6 rounded-2xl border border-[#E9E2D2] shadow-2xl relative">
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute top-4 right-4 text-surface-muted hover:text-surface-primary"
              >
                <X size={20} />
              </button>
              <form onSubmit={handleSearchSubmit} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-white border border-base-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
                <button type="submit" className="btn-primary">
                  Search
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Navigation Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Dark Backdrop Overlay */}
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-[#1C1613]/70 backdrop-blur-sm"
            />

            {/* Left Side Drawer Container */}
            <motion.div
              key="menu-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-[65] w-full max-w-xs sm:max-w-sm bg-[#FDFBF7] border-r border-[#E9E2D2] shadow-2xl flex flex-col justify-between text-[#1C1613] h-[100dvh]"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E2D2] bg-white shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  {brandSettings.logoUrl && (
                    <img 
                      src={brandSettings.logoUrl} 
                      alt={brandSettings.brandName || "Logo"} 
                      onError={(e) => {
                        e.currentTarget.style.opacity = '0';
                      }}
                      className="h-9 w-auto object-contain" 
                    />
                  )}
                  <span className="font-serif text-lg font-black tracking-wider uppercase text-[#1C1613]">
                    {brandSettings.brandName}
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#F7F4EE] hover:bg-[#1C1613] hover:text-white border border-[#E9E2D2] flex items-center justify-center text-[#1C1613] transition-colors active:scale-95 cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain py-2 scrollbar-thin">
                {/* 1. Primary Page Links */}
                <div className="py-1 border-b border-[#E9E2D2]/60">
                  {primaryNavLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.url || '/shop'}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between px-6 py-3 font-serif text-xs font-black tracking-widest text-[#1C1613] hover:text-[#C5A880] hover:bg-[#F7F4EE]/60 transition-all uppercase"
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={13} className="text-[#C5A880]/50" />
                    </Link>
                  ))}
                </div>

                {/* 2. Dedicated Shop by Category Section */}
                <div className="py-3.5 border-b border-[#E9E2D2]/60">
                  <div className="px-6 pb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-serif text-[11px] font-black tracking-[0.2em] uppercase text-[#C5A880]">
                      <Layers size={13} className="text-[#C5A880]" />
                      <span>Shop by Category</span>
                    </div>
                    {activeCategories.length > 0 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E9E2D2]/70 text-[#1C1613] uppercase tracking-wider">
                        {activeCategories.length} Collections
                      </span>
                    )}
                  </div>

                  {activeCategories.length === 0 ? (
                    <div className="px-6 py-3 text-xs text-gray-400 italic font-serif">
                      Loading categories...
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {categoryTree.map((cat) => {
                        const hasSub = cat.subcategories && cat.subcategories.length > 0;
                        const isExpanded = Boolean(expandedCats[cat.id || cat.slug]);
                        const catUrl = `/shop?category=${encodeURIComponent(cat.slug || cat.id)}`;

                        return (
                          <div key={cat.id || cat.slug} className="group">
                            <div className="flex items-center justify-between px-6 py-2.5 hover:bg-[#F7F4EE]/80 transition-colors">
                              <Link
                                href={catUrl}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-3 flex-1 min-w-0"
                              >
                                {cat.image_url ? (
                                  <img
                                    src={cat.image_url}
                                    alt={cat.name}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    className="w-8 h-8 rounded-lg object-cover border border-[#E9E2D2] shrink-0"
                                  />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-[#C5A880] group-hover:bg-[#FF5533] transition-colors shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-serif text-xs font-black tracking-wider text-[#1C1613] group-hover:text-[#FF5533] transition-colors uppercase truncate">
                                    {cat.name}
                                  </p>
                                  {cat.description && (
                                    <p className="text-[10px] text-gray-400 truncate font-normal">
                                      {cat.description}
                                    </p>
                                  )}
                                </div>
                              </Link>

                              {hasSub ? (
                                <button
                                  type="button"
                                  onClick={(e) => toggleCatExpand(cat.id || cat.slug, e)}
                                  className="p-1.5 rounded-md hover:bg-[#E9E2D2]/60 text-[#1C1613] transition-colors ml-2 shrink-0 cursor-pointer"
                                  aria-label={`Toggle ${cat.name} subcategories`}
                                >
                                  <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              ) : (
                                <Link
                                  href={catUrl}
                                  onClick={() => setMobileOpen(false)}
                                  className="text-[#C5A880]/60 group-hover:text-[#FF5533] group-hover:translate-x-1 transition-all ml-2 shrink-0"
                                >
                                  <ArrowRight size={13} />
                                </Link>
                              )}
                            </div>

                            {/* Subcategories (if present) */}
                            {hasSub && isExpanded && (
                              <div className="bg-[#F7F4EE]/40 border-y border-[#E9E2D2]/40 pl-14 pr-6 py-1.5 space-y-1">
                                {cat.subcategories.map((sub: any) => (
                                  <Link
                                    key={sub.id || sub.slug}
                                    href={`/shop?category=${encodeURIComponent(sub.slug || sub.id)}`}
                                    onClick={() => setMobileOpen(false)}
                                    className="block py-1.5 text-xs text-gray-600 hover:text-[#FF5533] font-medium transition-colors uppercase truncate"
                                  >
                                    • {sub.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Customer Care & Info */}
                <div className="py-2">
                  <Link
                    href="/track"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-6 py-3 font-serif text-xs font-black tracking-widest text-[#1C1613] hover:text-[#C5A880] hover:bg-[#F7F4EE]/60 transition-all uppercase"
                  >
                    <span>TRACK MY ORDER</span>
                    <ArrowRight size={13} className="text-[#C5A880]/50" />
                  </Link>
                  <Link
                    href="/contact-us"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-6 py-3 font-serif text-xs font-black tracking-widest text-[#1C1613] hover:text-[#C5A880] hover:bg-[#F7F4EE]/60 transition-all uppercase"
                  >
                    <span>CONTACT & HELP</span>
                    <ArrowRight size={13} className="text-[#C5A880]/50" />
                  </Link>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="p-6 border-t border-[#E9E2D2] bg-white space-y-3 shrink-0">
                <Link
                  href="/track"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3.5 px-4 border border-[#E9E2D2] bg-[#F7F4EE] hover:bg-[#1C1613] hover:text-white text-[#1C1613] rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-sm cursor-pointer"
                >
                  <Package size={15} />
                  Track My Order
                </Link>

                <Link
                  href="/shop"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3.5 px-4 bg-[#C5A880] hover:bg-[#b09268] text-white rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-md cursor-pointer"
                >
                  <UserCheck size={15} />
                  Enter Store
                </Link>

                <div className="text-center pt-2">
                  <p className="text-[10px] font-serif font-bold tracking-widest text-gray-400 uppercase">
                    {brandSettings.brandName} EST. 2026
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CartDrawer />
    </>
  );
}
