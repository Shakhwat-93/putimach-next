'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, Globe, Layout, Type, FileText, Loader2, Image, Layers, Star, Truck } from 'lucide-react';
import { getSiteSettings, updateSiteSettings } from '../../lib/api';

const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const defaultHome = {
  heroBgImage: "/images/hero-banner.webp",
  heroBadge: "New Season Drop",
  heroSubBadge: "SS 2026",
  heroHeading: "WEAR THE STREETS.\nOWN THE MOMENT.",
  heroSubtext: "Premium streetwear for Bangladesh's next generation. Built to last. Priced for the culture.",
  heroButtonText: "Shop Now",

  collectionsLabel: "Categories",
  collectionsTitle: "Shop by Collection",

  latestLabel: "New Arrivals",
  latestTitle: "Latest Drop",

  catalogLabel: "The Catalog",
  catalogTitle: "Most Wanted",
  catalogSubtext: "Hand-picked bestsellers. Each piece designed to outlast trends.",

  brandStoryLabel: "Our Story",
  brandStoryImage: "/images/hoodie-rust.webp",
  brandStoryTitle: "Born From the Streets.\nBuilt for the Future.",
  brandStoryText1: "Rust Revive was born in Dhaka out of frustration — the frustration of paying premium prices for average quality, or settling for cheap products that fall apart after one wash.",
  brandStoryText2: "We set out to prove that you don't have to choose. Premium materials, real craftsmanship, and designs that actually hit — all at prices that respect the hustle.",
  brandStoryStats: [
    { val: "400 GSM", label: "Premium Fleece" },
    { val: "100%", label: "Local Crafted" },
    { val: "0", label: "Compromise" }
  ],

  instagramLabel: "Join The Culture",
  instagramTitle: "Follow @rust.revive",
  instagramSubtext: "Tag us in your street fits to get featured on our official channel.",
  instagramUrl: "https://www.instagram.com/rust.revive?igsh=MWl3Y3N0MmM0MGRhMQ%3D%3D&utm_source=qr",
  instagramProfileImage: "/images/hoodie-rust.webp",
  instagramImages: [
    { src: "/images/hoodie-rust.webp", likes: "1.2k", comments: "84" },
    { src: "/images/hoodie-black.webp", likes: "956", comments: "42" },
    { src: "/images/tee-charcoal.webp", likes: "2.4k", comments: "128" },
    { src: "/images/cargo-black.webp", likes: "1.8k", comments: "96" },
  ]
};

const defaultShop = {
  title: "Shop All",
  subtitle: "The Catalog"
};

const defaultReturn = [
  { id: 1, title: 'Delivery Inspection Policy', text: 'To guarantee absolute peace of mind, we allow and encourage all customers to inspect the quality, color, and size of their heritage garments at the time of delivery before finalizing Cash on Delivery payments.\n\nIf you find any manufacturing defect, sizing discrepancy, or if the garment does not meet your expectations, you may return it immediately with the delivery concierge without any charge.' },
  { id: 2, title: '7-Day Easy Exchange', text: 'If you have accepted the garment and later decide to exchange it for a different size, color, or a different style, we offer a hassle-free 7-day exchange window.\n\n• The garment must be unworn, unwashed, and in its original pristine condition.\n• All security tags, designer labels, and packaging must remain completely intact.\n• Exchanges are subject to stock availability.' },
  { id: 3, title: 'Non-Returnable & Conditions', text: 'Garments that have been custom altered, bespoke tailormade, or show signs of wear, dry cleaning, or washing cannot be accepted for returns or exchanges.\n\nReturn delivery shipping charges are the responsibility of the customer unless the return is due to a verified manufacturing damage or shipping error from our end.' }
];

const defaultSizing = {
  title: 'Sizing Guide',
  description: 'Our garments are designed with a modern, relaxed/oversized streetwear fit.',
  columns: ['Size', 'Chest', 'Waist', 'Length'],
  rows: [
    { Size: 'S', Chest: '36 - 38', Waist: '28 - 30', Length: '27' },
    { Size: 'M', Chest: '38 - 40', Waist: '30 - 32', Length: '28' },
    { Size: 'L', Chest: '40 - 42', Waist: '32 - 34', Length: '29' },
    { Size: 'XL', Chest: '42 - 44', Waist: '34 - 36', Length: '30' }
  ]
};

const defaultContact = {
  announcement: 'FREE EXPRESS SHIPPING ON ALL ORDERS OVER ৳5000',
  phone: '01827-406756',
  whatsapp: '01827406756',
  email: 'putimach324@gmail.com',
  address: 'House 42, Road 11, Banani, Dhaka, Bangladesh',
  facebook_url: 'https://www.facebook.com/share/1HitDwyphD',
  instagram_url: 'https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn',
  google_maps_url: 'https://maps.google.com/?q=House+42,+Road+11,+Banani,+Dhaka',
  flagship_name: 'PUTIMACH BANANI FLAGSHIP',
  flagship_address: 'House 42, Road 11, Banani, Dhaka'
};

export default function WebsitePages() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'shop', 'shipping', 'returns', 'sizing', 'contact'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [homeData, setHomeData] = useState(defaultHome);
  const [shopData, setShopData] = useState(defaultShop);
  const [shippingData, setShippingData] = useState({ inside: 60, sub: 100, outside: 120 });
  const [returnsData, setReturnsData] = useState(defaultReturn);
  const [sizingData, setSizingData] = useState(defaultSizing);
  const [contactData, setContactData] = useState(defaultContact);
  const [statsText, setStatsText] = useState(JSON.stringify(defaultHome.brandStoryStats, null, 2));

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [h, s, sh, ret, size, cont] = await Promise.all([
          getSiteSettings('home_page'),
          getSiteSettings('shop_page'),
          getSiteSettings('shipping_rates'),
          getSiteSettings('return_policy'),
          getSiteSettings('sizing_guide'),
          getSiteSettings('contact_info'),
        ]);

        if (h) {
          const mergedH = { ...defaultHome, ...h };
          setHomeData(mergedH);
          setStatsText(JSON.stringify(h.brandStoryStats || defaultHome.brandStoryStats, null, 2));
        }
        if (s) {
          setShopData({ ...defaultShop, ...s });
        }
        if (sh) {
          setShippingData({ inside: 60, sub: 100, outside: 120, ...sh });
        }
        if (ret && Array.isArray(ret)) {
          setReturnsData(ret);
        }
        if (size) {
          setSizingData({ ...defaultSizing, ...size });
        }
        if (cont) {
          setContactData({ ...defaultContact, ...cont });
        }
      } catch (err) {
        console.error('Error fetching site settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleHomeChange = (key, value) => {
    setHomeData((prev) => ({ ...prev, [key]: value }));
  };

  const handleShopChange = (key, value) => {
    setShopData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      let statsObj = homeData.brandStoryStats;
      try {
        statsObj = JSON.parse(statsText);
      } catch (e) {
        console.warn('Invalid stats JSON, keeping existing stats');
      }

      const newHome = { ...homeData, brandStoryStats: statsObj };
      setHomeData(newHome);

      if (activeTab === 'home') {
        await updateSiteSettings('home_page', newHome);
      } else if (activeTab === 'shop') {
        await updateSiteSettings('shop_page', shopData);
      } else if (activeTab === 'shipping') {
        await updateSiteSettings('shipping_rates', shippingData);
      } else if (activeTab === 'returns') {
        await updateSiteSettings('return_policy', returnsData);
      } else if (activeTab === 'sizing') {
        await updateSiteSettings('sizing_guide', sizingData);
      } else if (activeTab === 'contact') {
        await updateSiteSettings('contact_info', contactData);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving site settings:', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const currentInstaImages = homeData.instagramImages || defaultHome.instagramImages;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-base-300">
        <div>
          <h1 className="text-h3 font-black text-surface-primary flex items-center gap-2">
            <Globe className="text-brand" />
            Website Content Manager
          </h1>
          <p className="text-surface-secondary text-small mt-1">
            Dynamically update live website copy, section headings, images, and social links in real-time.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-small transition-all duration-200 ${
            saved ? 'bg-emerald-500 text-white shadow-glow-sm' : 'bg-brand text-white hover:bg-brand-400 shadow-glow'
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check size={16} />
              Saved Successfully!
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-base-300 pb-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-bold transition-all duration-200 ${
            activeTab === 'home'
              ? 'bg-brand text-white shadow-glow-sm'
              : 'text-surface-secondary hover:text-surface-primary glass'
          }`}
        >
          <Layout size={16} />
          Home Page
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-bold transition-all duration-200 ${
            activeTab === 'shop'
              ? 'bg-brand text-white shadow-glow-sm'
              : 'text-surface-secondary hover:text-surface-primary glass'
          }`}
        >
          <FileText size={16} />
          Shop Page
        </button>
        <button
          onClick={() => setActiveTab('shipping')}
          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-bold transition-all duration-200 ${
            activeTab === 'shipping'
              ? 'bg-brand text-white shadow-glow-sm'
              : 'text-surface-secondary hover:text-surface-primary glass'
          }`}
        >
          <Truck size={16} />
          Shipping Rates
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-bold transition-all duration-200 ${
            activeTab === 'returns'
              ? 'bg-brand text-white shadow-glow-sm'
              : 'text-surface-secondary hover:text-surface-primary glass'
          }`}
        >
          <FileText size={16} />
          Returns Policy
        </button>
        <button
          onClick={() => setActiveTab('sizing')}
          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-bold transition-all duration-200 ${
            activeTab === 'sizing'
              ? 'bg-brand text-white shadow-glow-sm'
              : 'text-surface-secondary hover:text-surface-primary glass'
          }`}
        >
          <Layers size={16} />
          Sizing Guide
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-bold transition-all duration-200 ${
            activeTab === 'contact'
              ? 'bg-brand text-white shadow-glow-sm'
              : 'text-surface-secondary hover:text-surface-primary glass'
          }`}
        >
          <Globe size={16} />
          Contact & Footer
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4">
          <Loader2 size={36} className="text-brand animate-spin" />
          <p className="text-surface-muted text-small uppercase tracking-widest font-mono">Loading Page Content...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Hero Section Copy */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Type size={18} />
                  Hero Section
                </h2>

                <div>
                  <label className="label flex items-center gap-1.5 font-bold">
                    <Image size={15} className="text-brand" />
                    Hero Background Image URL
                  </label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={homeData.heroBgImage || ''}
                    onChange={(e) => handleHomeChange('heroBgImage', e.target.value)}
                  />
                  <p className="text-xs text-surface-muted mt-1">Provide a relative path (e.g. /images/hero-banner.webp) or an absolute image URL.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Hero Top Badge</label>
                    <input
                      type="text"
                      className="input"
                      value={homeData.heroBadge || ''}
                      onChange={(e) => handleHomeChange('heroBadge', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Sub Badge / Season</label>
                    <input
                      type="text"
                      className="input"
                      value={homeData.heroSubBadge || ''}
                      onChange={(e) => handleHomeChange('heroSubBadge', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Hero Main Heading (Use \n or new line for break)</label>
                  <textarea
                    rows={2}
                    className="input py-3 font-mono font-bold text-lg"
                    value={homeData.heroHeading || ''}
                    onChange={(e) => handleHomeChange('heroHeading', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Hero Subtext</label>
                  <textarea
                    rows={2}
                    className="input py-3"
                    value={homeData.heroSubtext || ''}
                    onChange={(e) => handleHomeChange('heroSubtext', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Call to Action (CTA) Button Text</label>
                  <input
                    type="text"
                    className="input max-w-xs font-bold"
                    value={homeData.heroButtonText || ''}
                    onChange={(e) => handleHomeChange('heroButtonText', e.target.value)}
                  />
                </div>
              </div>

              {/* Collections Section Header */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Layers size={18} />
                  Collections Section Header
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Section Subtitle / Label</label>
                    <input
                      type="text"
                      className="input"
                      value={homeData.collectionsLabel || ''}
                      onChange={(e) => handleHomeChange('collectionsLabel', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Main Title</label>
                    <input
                      type="text"
                      className="input font-bold"
                      value={homeData.collectionsTitle || ''}
                      onChange={(e) => handleHomeChange('collectionsTitle', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Latest Drop Section Header */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Star size={18} />
                  Latest Drop Section Header
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Section Subtitle / Label</label>
                    <input
                      type="text"
                      className="input"
                      value={homeData.latestLabel || ''}
                      onChange={(e) => handleHomeChange('latestLabel', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Main Title</label>
                    <input
                      type="text"
                      className="input font-bold"
                      value={homeData.latestTitle || ''}
                      onChange={(e) => handleHomeChange('latestTitle', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Catalog Section Header */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Layout size={18} />
                  Product Catalog Section Header
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Section Subtitle / Label</label>
                    <input
                      type="text"
                      className="input"
                      value={homeData.catalogLabel || ''}
                      onChange={(e) => handleHomeChange('catalogLabel', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Main Title</label>
                    <input
                      type="text"
                      className="input font-bold"
                      value={homeData.catalogTitle || ''}
                      onChange={(e) => handleHomeChange('catalogTitle', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Section Description / Subtext</label>
                  <textarea
                    rows={2}
                    className="input py-3"
                    value={homeData.catalogSubtext || ''}
                    onChange={(e) => handleHomeChange('catalogSubtext', e.target.value)}
                  />
                </div>
              </div>

              {/* Brand Story Copy */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Brand Story Section
                </h2>

                <div>
                  <label className="label flex items-center gap-1.5 font-bold">
                    <Image size={15} className="text-brand" />
                    Brand Story Image URL
                  </label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={homeData.brandStoryImage || ''}
                    onChange={(e) => handleHomeChange('brandStoryImage', e.target.value)}
                  />
                  <p className="text-xs text-surface-muted mt-1">Provide a relative path (e.g. /images/hoodie-rust.webp) or an absolute image URL.</p>
                </div>

                <div>
                  <label className="label">Section Subtitle / Label</label>
                  <input
                    type="text"
                    className="input max-w-xs"
                    value={homeData.brandStoryLabel || ''}
                    onChange={(e) => handleHomeChange('brandStoryLabel', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Brand Story Heading</label>
                  <textarea
                    rows={2}
                    className="input py-3 font-mono font-bold"
                    value={homeData.brandStoryTitle || ''}
                    onChange={(e) => handleHomeChange('brandStoryTitle', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Story Paragraph 1</label>
                  <textarea
                    rows={3}
                    className="input py-3 text-small leading-relaxed"
                    value={homeData.brandStoryText1 || ''}
                    onChange={(e) => handleHomeChange('brandStoryText1', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Story Paragraph 2</label>
                  <textarea
                    rows={3}
                    className="input py-3 text-small leading-relaxed"
                    value={homeData.brandStoryText2 || ''}
                    onChange={(e) => handleHomeChange('brandStoryText2', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Brand Story Stats (JSON Array)</label>
                  <textarea
                    rows={5}
                    className="input py-3 font-mono text-xs bg-base-950 text-brand"
                    value={statsText}
                    onChange={(e) => setStatsText(e.target.value)}
                  />
                </div>
              </div>

              {/* Instagram / Social Section Header */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <InstagramIcon size={18} />
                  Instagram Community Section
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Section Subtitle / Label</label>
                    <input
                      type="text"
                      className="input"
                      value={homeData.instagramLabel || ''}
                      onChange={(e) => handleHomeChange('instagramLabel', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Main Title</label>
                    <input
                      type="text"
                      className="input font-bold"
                      value={homeData.instagramTitle || ''}
                      onChange={(e) => handleHomeChange('instagramTitle', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Section Subtext</label>
                  <input
                    type="text"
                    className="input"
                    value={homeData.instagramSubtext || ''}
                    onChange={(e) => handleHomeChange('instagramSubtext', e.target.value)}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center gap-1.5 font-bold text-brand">
                      <InstagramIcon size={15} />
                      Official Instagram Account URL
                    </label>
                    <input
                      type="text"
                      className="input font-mono text-xs"
                      value={homeData.instagramUrl || ''}
                      onChange={(e) => handleHomeChange('instagramUrl', e.target.value)}
                    />
                    <p className="text-xs text-surface-muted mt-1">Opens when users click "Follow Official" or any feed item.</p>
                  </div>

                  <div>
                    <label className="label flex items-center gap-1.5 font-bold">
                      <Image size={15} className="text-brand" />
                      Brand Profile Avatar Image URL
                    </label>
                    <input
                      type="text"
                      className="input font-mono text-xs"
                      value={homeData.instagramProfileImage || ''}
                      onChange={(e) => handleHomeChange('instagramProfileImage', e.target.value)}
                    />
                    <p className="text-xs text-surface-muted mt-1">Circular avatar photo for rust.revive in the showcase card.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-base-300/50">
                  <label className="label font-bold text-brand flex items-center gap-1.5">
                    <Image size={15} />
                    Instagram Feed Showcase Images (4 Posts)
                  </label>
                  <p className="text-xs text-surface-muted">Customize the 4 showcase photos and their engagement counts displayed in the interactive grid.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {currentInstaImages.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-base-950 border border-base-300 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-surface-primary">Post Card #{idx + 1}</span>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-base-800 border border-base-300 flex-shrink-0">
                            <img src={item.src} alt="" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-surface-secondary">Image URL</label>
                          <input
                            type="text"
                            className="input text-xs font-mono"
                            value={item.src || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHomeData((prev) => {
                                const arr = [...(prev.instagramImages || defaultHome.instagramImages)];
                                arr[idx] = { ...arr[idx], src: val };
                                return { ...prev, instagramImages: arr };
                              });
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-surface-secondary">Likes</label>
                            <input
                              type="text"
                              className="input text-xs font-mono"
                              value={item.likes || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomeData((prev) => {
                                  const arr = [...(prev.instagramImages || defaultHome.instagramImages)];
                                  arr[idx] = { ...arr[idx], likes: val };
                                  return { ...prev, instagramImages: arr };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-surface-secondary">Comments</label>
                            <input
                              type="text"
                              className="input text-xs font-mono"
                              value={item.comments || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomeData((prev) => {
                                  const arr = [...(prev.instagramImages || defaultHome.instagramImages)];
                                  arr[idx] = { ...arr[idx], comments: val };
                                  return { ...prev, instagramImages: arr };
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'shop' ? (
            <motion.div
              key="shop"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Shop Page Copy */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Layout size={18} />
                  Shop Catalog Header
                </h2>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Shop Page Main Title</label>
                    <input
                      type="text"
                      className="input font-bold text-lg"
                      value={shopData.title || ''}
                      onChange={(e) => handleShopChange('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Subtitle / Section Label</label>
                    <input
                      type="text"
                      className="input text-surface-secondary"
                      value={shopData.subtitle || ''}
                      onChange={(e) => handleShopChange('subtitle', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'shipping' ? (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Shipping Rates Section */}
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Truck size={18} />
                  Delivery & Shipping Charges
                </h2>

                <p className="text-xs text-surface-muted leading-relaxed">
                  These delivery charges are loaded dynamically on the checkout page when customers choose their delivery region.
                </p>

                <div className="grid sm:grid-cols-3 gap-6">
                  <div>
                    <label className="label">Inside Dhaka (৳)</label>
                    <input
                      type="number"
                      min="0"
                      className="input font-bold text-lg text-brand"
                      value={shippingData.inside ?? 60}
                      onChange={(e) => setShippingData(p => ({ ...p, inside: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-surface-muted mt-1">Default rate: ৳60</p>
                  </div>
                  <div>
                    <label className="label">Sub Dhaka / Dhaka Suburbs (৳)</label>
                    <input
                      type="number"
                      min="0"
                      className="input font-bold text-lg text-brand"
                      value={shippingData.sub ?? 100}
                      onChange={(e) => setShippingData(p => ({ ...p, sub: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-surface-muted mt-1">Default rate: ৳100 (e.g. Savar, Gazipur)</p>
                  </div>
                  <div>
                    <label className="label">Outside Dhaka (৳)</label>
                    <input
                      type="number"
                      min="0"
                      className="input font-bold text-lg text-brand"
                      value={shippingData.outside ?? 120}
                      onChange={(e) => setShippingData(p => ({ ...p, outside: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-surface-muted mt-1">Default rate: ৳120</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'returns' ? (
            <motion.div
              key="returns"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Returns & Exchanges Policy
                </h2>
                <p className="text-xs text-surface-muted leading-relaxed">
                  Configure the three standard policy blocks shown on the Returns & Exchanges page.
                </p>
                {returnsData.map((section, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-base-700/50 border border-base-300/40 space-y-4">
                    <div>
                      <label className="label">Section {idx + 1} Title</label>
                      <input
                        type="text"
                        className="input font-bold"
                        value={section.title || ''}
                        onChange={(e) => {
                          const newRet = [...returnsData];
                          newRet[idx].title = e.target.value;
                          setReturnsData(newRet);
                        }}
                      />
                    </div>
                    <div>
                      <label className="label">Section {idx + 1} Content Text</label>
                      <textarea
                        rows={5}
                        className="input py-3 text-xs leading-relaxed"
                        value={section.text || ''}
                        onChange={(e) => {
                          const newRet = [...returnsData];
                          newRet[idx].text = e.target.value;
                          setReturnsData(newRet);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'sizing' ? (
            <motion.div
              key="sizing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Layers size={18} />
                  Sizing Guide Configurations
                </h2>
                <div>
                  <label className="label">Page Main Title</label>
                  <input
                    type="text"
                    className="input font-bold"
                    value={sizingData.title || ''}
                    onChange={(e) => setSizingData(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Page Subtitle / Fit Description</label>
                  <textarea
                    rows={2}
                    className="input py-3 text-xs"
                    value={sizingData.description || ''}
                    onChange={(e) => setSizingData(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                
                <div className="border-t border-base-300/40 pt-4">
                  <h3 className="font-bold text-sm text-surface-secondary uppercase tracking-wider mb-4">Size Table Rows (Inches)</h3>
                  <div className="space-y-3">
                    {sizingData.rows?.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-3 items-end p-3 rounded-lg bg-base-900/30 border border-base-300/20">
                        <div>
                          <label className="label text-[10px] uppercase font-bold text-[#C5A880]">Size</label>
                          <input
                            type="text"
                            className="input font-bold py-1.5 text-center text-brand"
                            value={row.Size || row.size || ''}
                            onChange={(e) => {
                              const newRows = [...sizingData.rows];
                              newRows[idx].Size = e.target.value;
                              setSizingData(p => ({ ...p, rows: newRows }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="label text-[10px] uppercase">Chest</label>
                          <input
                            type="text"
                            className="input py-1.5 text-center"
                            value={row.Chest || row.chest || ''}
                            onChange={(e) => {
                              const newRows = [...sizingData.rows];
                              newRows[idx].Chest = e.target.value;
                              setSizingData(p => ({ ...p, rows: newRows }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="label text-[10px] uppercase">Waist</label>
                          <input
                            type="text"
                            className="input py-1.5 text-center"
                            value={row.Waist || row.waist || ''}
                            onChange={(e) => {
                              const newRows = [...sizingData.rows];
                              newRows[idx].Waist = e.target.value;
                              setSizingData(p => ({ ...p, rows: newRows }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="label text-[10px] uppercase">Length</label>
                          <input
                            type="text"
                            className="input py-1.5 text-center"
                            value={row.Length || row.length || ''}
                            onChange={(e) => {
                              const newRows = [...sizingData.rows];
                              newRows[idx].Length = e.target.value;
                              setSizingData(p => ({ ...p, rows: newRows }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass rounded-2xl p-6 border border-base-300 space-y-5">
                <h2 className="font-bold text-h5 text-brand border-b border-base-300/50 pb-3 flex items-center gap-2">
                  <Globe size={18} />
                  Contact Details & Announcement Bar
                </h2>
                
                <div>
                  <label className="label flex items-center gap-1 font-bold text-brand text-xs uppercase tracking-wider">Announcement Bar Text</label>
                  <input
                    type="text"
                    className="input font-bold"
                    placeholder="E.g., FREE EXPRESS SHIPPING ON ALL ORDERS OVER ৳5000"
                    value={contactData.announcement || ''}
                    onChange={(e) => setContactData(p => ({ ...p, announcement: e.target.value }))}
                  />
                  <p className="text-[10px] text-surface-muted mt-1">Leave empty to hide the header announcement bar completely.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Concierge Phone Number</label>
                    <input
                      type="text"
                      className="input"
                      value={contactData.phone || ''}
                      onChange={(e) => setContactData(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">WhatsApp Contact Number</label>
                    <input
                      type="text"
                      className="input"
                      value={contactData.whatsapp || ''}
                      onChange={(e) => setContactData(p => ({ ...p, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Concierge Email</label>
                  <input
                    type="email"
                    className="input font-mono"
                    value={contactData.email || ''}
                    onChange={(e) => setContactData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Office Address (Normal)</label>
                  <input
                    type="text"
                    className="input"
                    value={contactData.address || ''}
                    onChange={(e) => setContactData(p => ({ ...p, address: e.target.value }))}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Facebook Page Link</label>
                    <input
                      type="text"
                      className="input text-xs"
                      value={contactData.facebook_url || ''}
                      onChange={(e) => setContactData(p => ({ ...p, facebook_url: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Instagram Page Link</label>
                    <input
                      type="text"
                      className="input text-xs"
                      value={contactData.instagram_url || ''}
                      onChange={(e) => setContactData(p => ({ ...p, instagram_url: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="border-t border-base-300/40 pt-4 space-y-4">
                  <h3 className="font-bold text-sm text-surface-secondary uppercase tracking-wider">Flagship Boutique Finder</h3>
                  <div>
                    <label className="label">Flagship Store Name</label>
                    <input
                      type="text"
                      className="input font-bold"
                      value={contactData.flagship_name || ''}
                      onChange={(e) => setContactData(p => ({ ...p, flagship_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Flagship Store Address</label>
                    <input
                      type="text"
                      className="input"
                      value={contactData.flagship_address || ''}
                      onChange={(e) => setContactData(p => ({ ...p, flagship_address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Google Maps Concierge URL</label>
                    <input
                      type="text"
                      className="input text-xs font-mono"
                      value={contactData.google_maps_url || ''}
                      onChange={(e) => setContactData(p => ({ ...p, google_maps_url: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
