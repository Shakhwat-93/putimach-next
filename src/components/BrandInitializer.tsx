'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function updateFavicon(iconUrl: string) {
  if (!iconUrl || typeof document === 'undefined') return;

  try {
    const existingIcons = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
    existingIcons.forEach(el => el.parentNode?.removeChild(el));

    const iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.href = iconUrl;
    document.head.appendChild(iconLink);

    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.href = iconUrl;
    document.head.appendChild(shortcutLink);

    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = iconUrl;
    document.head.appendChild(appleLink);
  } catch (e) {
    console.warn('Failed to update favicon:', e);
  }
}

export default function BrandInitializer() {
  useEffect(() => {
    let isMounted = true;

    async function loadBrandConfig() {
      try {
        let brandData = null;

        const { data: siteData } = await supabase
          .from('site_settings')
          .select('data')
          .eq('id', 'brand_settings')
          .maybeSingle();

        if (siteData?.data) {
          brandData = siteData.data;
        } else {
          const { data: cbData } = await supabase
            .from('cb_settings')
            .select('data')
            .eq('id', 'brand_settings')
            .maybeSingle();
          brandData = cbData?.data;
        }

        const logoUrl = brandData?.logoUrl || brandData?.logo_url;
        if (isMounted && logoUrl) {
          updateFavicon(logoUrl);
        }
      } catch (err) {
        console.warn('Brand config load notice:', err);
      }
    }

    loadBrandConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
