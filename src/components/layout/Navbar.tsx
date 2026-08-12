'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Search, Zap, Package, UserCheck } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import CartDrawer from './CartDrawer';
import { getCategories } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [navMenu, setNavMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [brandSettings, setBrandSettings] = useState({
    logoUrl: '/logo.webp',
    brandName: 'PutiMach'
  });

  const { openCart, items } = useCartStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories();
        if (data) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching navbar categories:', err);
      }
    }
    async function fetchNavMenu() {
      try {
        const { data, error } = await supabase
          .from('cb_settings')
          .select('data')
          .eq('id', 'nav_menu')
          .single();
        if (!error && data?.data) {
          setNavMenu(data.data);
        }
      } catch (err) {
        console.error('Error fetching nav menu:', err);
      }
    }
    async function fetchBrandSettings() {
      try {
        const { data, error } = await supabase
          .from('cb_settings')
          .select('data')
          .eq('id', 'brand_settings')
          .maybeSingle();
        if (!error && data?.data) {
          setBrandSettings(prev => ({ ...prev, ...data.data }));
        }
      } catch (err) {
        console.error('Error fetching brand settings:', err);
      }
    }
    fetchCategories();
    fetchNavMenu();
    fetchBrandSettings();
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const displayMenu = useMemo(() => {
    let list = Array.isArray(navMenu) ? [...navMenu] : [];

    if (categories.length > 0) {
      const activeCatSlugs = new Set(categories.map((c) => String(c.slug || '').trim().toLowerCase()));
      list = list.filter((item) => {
        if (!item.url || !item.url.startsWith('/shop?cat=')) return true;
        const catSlug = item.url.replace('/shop?cat=', '').trim().toLowerCase();
        return activeCatSlugs.has(catSlug);
      });
    }

    if (!list || list.length === 0) {
      const defaultNav = [
        { label: 'NEW DROPS', url: '/shop?badge=NEW DROP' },
        { label: 'ALL PRODUCTS', url: '/shop' },
      ];
      categories.forEach((cat) => {
        defaultNav.push({
          label: cat.name.toUpperCase(),
          url: `/shop?cat=${cat.slug || cat.name.toLowerCase()}`,
        });
      });
      defaultNav.push({ label: 'TRACK ORDER', url: '/track-order' });
      return defaultNav;
    }

    return list;
  }, [navMenu, categories]);

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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
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
                  <img src={brandSettings.logoUrl} alt="Logo" className="w-20 h-20 xs:w-24 xs:h-24 md:w-14 md:h-14 lg:w-32 lg:h-32 object-contain group-hover:scale-105 transition-transform shrink-0" />
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
              <button
                onClick={openCart}
                className="relative text-[#1C1613] hover:text-[#C5A880] transition-colors p-1.5 flex items-center"
                aria-label="Shopping Cart"
              >
                <ShoppingBag size={22} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#1C1613] text-[#C5A880] text-[10px] font-bold flex items-center justify-center border border-[#FDFBF7]">
                    {totalItems}
                  </span>
                )}
              </button>
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
              className="fixed inset-0 z-50 bg-[#1C1613]/70 backdrop-blur-sm"
            />

            {/* Left Side Drawer Container */}
            <motion.div
              key="menu-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-full max-w-xs sm:max-w-sm bg-[#FDFBF7] border-r border-[#E9E2D2] shadow-2xl flex flex-col justify-between text-[#1C1613]"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E2D2] bg-white">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  {brandSettings.logoUrl && (
                    <img src={brandSettings.logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
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

              {/* Menu Links */}
              <div className="flex-1 overflow-y-auto py-2">
                {displayMenu.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.url || '/shop'}
                    onClick={() => setMobileOpen(false)}
                    className="block px-6 py-4 border-b border-[#E9E2D2]/60 font-serif text-xs font-black tracking-widest text-[#1C1613] hover:text-[#C5A880] hover:bg-[#F7F4EE]/50 transition-all uppercase"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Bottom Action Buttons */}
              <div className="p-6 border-t border-[#E9E2D2] bg-white space-y-3">
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
