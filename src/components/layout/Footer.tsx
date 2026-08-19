'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { supabase } from '../../lib/supabase';
import { getCategories } from '../../lib/api';

const helpLinks = [
  { label: 'FAQ', to: '/faq' },
  { label: 'Shipping Info', to: '/shipping-info' },
  { label: 'Returns & Exchanges', to: '/returns-exchanges' },
  { label: 'Track Order', to: '/track' },
  { label: 'Contact Us', to: '/contact-us' },
];

export default function Footer({
  initialBrand,
  initialContact,
  initialCategories,
}: {
  initialBrand?: { logoUrl: string; brandName: string; tagline?: string; copyright?: string };
  initialContact?: any;
  initialCategories?: any[];
} = {}) {
  const [contact, setContact] = useState(initialContact || null);
  const [categories, setCategories] = useState(initialCategories || []);
  const [brandSettings, setBrandSettings] = useState(initialBrand || {
    logoUrl: '/api/media/uploads/img_1786602897193_2103.webp',
    brandName: 'PutiMach',
    copyright: '© 2026 PutiMach. All rights reserved.'
  });

  useEffect(() => {
    if (initialBrand) setBrandSettings(initialBrand);
  }, [initialBrand]);

  useEffect(() => {
    if (initialContact) setContact(initialContact);
  }, [initialContact]);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    async function syncFreshFooterData() {
      try {
        const { data: bData } = await supabase
          .from('cb_settings')
          .select('data')
          .eq('id', 'brand_settings')
          .maybeSingle();
        if (bData?.data?.brandName || bData?.data?.copyright) {
          setBrandSettings(prev => ({ ...prev, ...bData.data }));
        }

        const { data: cData } = await supabase
          .from('cb_settings')
          .select('data')
          .eq('id', 'contact_info')
          .maybeSingle();
        if (cData?.data) {
          setContact(cData.data);
        }
      } catch (err) {
        // Non-critical background sync
      }
    }
    syncFreshFooterData();
  }, []);

  const shopLinks = [
    { label: 'All Products', to: '/shop' },
    ...categories.map(c => ({ label: c.name, to: `/shop?cat=${c.slug}` }))
  ];

  const footerLinks = {
    Shop: shopLinks,
    Help: helpLinks,
  };

  const phone = contact?.phone || '01827-406756';
  const email = contact?.email || 'putimach324@gmail.com';
  const facebook = contact?.facebook_url || 'https://www.facebook.com/share/1HitDwyphD';
  const instagram = contact?.instagram_url || 'https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn';

  return (
    <footer className="border-t border-base-300 bg-base-900 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial-brand opacity-30 pointer-events-none" />

      <div className="container-site py-12 relative z-10">

        {/* Links Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="section-label mb-4">{title}</p>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.to}
                      className="text-small text-surface-muted hover:text-surface-primary transition-colors duration-200 flex items-center gap-1 group"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 3rd Column: Concierge Info */}
          <div>
            <p className="section-label mb-4">Concierge</p>
            <ul className="space-y-3 text-small text-surface-muted">
              <li>
                <span className="block text-[10px] text-surface-secondary uppercase tracking-wider font-bold mb-0.5">Concierge Phone</span>
                <a href={`tel:${phone.replace(/-/g, '')}`} className="hover:text-surface-primary transition-colors font-mono">{phone}</a>
              </li>
              <li>
                <span className="block text-[10px] text-surface-secondary uppercase tracking-wider font-bold mb-0.5">Concierge Email</span>
                <a href={`mailto:${email}`} className="hover:text-surface-primary transition-colors normal-case break-all">{email}</a>
              </li>
              <li className="pt-2 flex items-center gap-4">
                <a href={facebook} target="_blank" rel="noreferrer" className="hover:text-surface-primary font-bold text-xs uppercase tracking-wider">Facebook</a>
                <span className="text-surface-dim">•</span>
                <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-surface-primary font-bold text-xs uppercase tracking-wider">Instagram</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="divider mb-8" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-muted">
            {brandSettings.copyright}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="text-xs text-surface-muted hover:text-surface-secondary transition-colors">Privacy</Link>
            <Link href="/terms-of-service" className="text-xs text-surface-muted hover:text-surface-secondary transition-colors">Terms</Link>
            <Link href="/cookie-policy" className="text-xs text-surface-muted hover:text-surface-secondary transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
