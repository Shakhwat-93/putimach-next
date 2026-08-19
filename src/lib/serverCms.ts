import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

export interface BrandSettings {
  brandName: string;
  logoUrl: string;
  tagline?: string;
  copyright?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  whatsapp?: string;
  facebook_url?: string;
  instagram_url?: string;
  flagship_name?: string;
  flagship_address?: string;
  google_maps_url?: string;
}

export interface StorefrontCmsData {
  brandSettings: BrandSettings;
  navMenu: any[];
  categories: any[];
  contactInfo: ContactInfo;
}

export const getStorefrontCmsData = cache(async (): Promise<StorefrontCmsData> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const defaultBrand: BrandSettings = {
    brandName: 'PutiMach',
    logoUrl: '/api/media/uploads/img_1786602897193_2103.webp',
    tagline: 'Timeless Style. Modern Soul.',
    copyright: '© 2026 PutiMach. All rights reserved.',
  };

  const defaultContact: ContactInfo = {
    email: 'putimach324@gmail.com',
    phone: '01827-406756',
    address: 'House 42, Road 11, Banani, Dhaka, Bangladesh',
    whatsapp: '01827406756',
    facebook_url: 'https://www.facebook.com/share/1HitDwyphD',
    instagram_url: 'https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn',
    flagship_name: 'PUTIMACH BANANI FLAGSHIP',
    flagship_address: 'House 42, Road 11, Banani, Dhaka',
  };

  if (!supabaseUrl || !supabaseKey) {
    return {
      brandSettings: defaultBrand,
      navMenu: [],
      categories: [],
      contactInfo: defaultContact,
    };
  }

  try {
    const sb = createClient(supabaseUrl, supabaseKey);

    const [cbSettingsRes, siteSettingsRes, categoriesRes] = await Promise.all([
      sb.from('cb_settings').select('id, data'),
      sb.from('site_settings').select('id, data'),
      sb.from('cb_categories').select('id, data, created_at').order('created_at', { ascending: true }).limit(100),
    ]);

    const cbList = cbSettingsRes.data || [];
    const siteList = siteSettingsRes.data || [];

    const getSetting = (key: string) => {
      const fromCb = cbList.find(s => s.id === key)?.data;
      if (fromCb) return fromCb;
      return siteList.find(s => s.id === key)?.data || null;
    };

    const brandData = getSetting('brand_settings') || getSetting('branding');
    const navMenuData = getSetting('nav_menu');
    const contactData = getSetting('contact_info');

    const categories = (categoriesRes.data || []).map(row => ({
      id: row.id,
      created_at: row.created_at,
      ...(row.data || {}),
    }));

    return {
      brandSettings: {
        brandName: brandData?.brandName || brandData?.app_name || defaultBrand.brandName,
        logoUrl: brandData?.logoUrl || brandData?.logo_url || defaultBrand.logoUrl,
        tagline: brandData?.tagline || defaultBrand.tagline,
        copyright: brandData?.copyright || defaultBrand.copyright,
      },
      navMenu: Array.isArray(navMenuData) ? navMenuData : [
        { url: '/', type: 'link', label: 'Home' },
        { url: '/shop', type: 'link', label: 'Shop All' },
        { url: '/contact-us', type: 'link', label: 'Contact' },
      ],
      categories,
      contactInfo: {
        ...defaultContact,
        ...(contactData || {}),
      },
    };
  } catch (err) {
    console.warn('[serverCms] Error loading storefront CMS data:', err);
    return {
      brandSettings: defaultBrand,
      navMenu: [],
      categories: [],
      contactInfo: defaultContact,
    };
  }
});
