'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function updateFavicon(iconUrl: string) {
  if (!iconUrl || typeof document === 'undefined') return;

  try {
    let iconLink = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.id = 'dynamic-favicon';
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = iconUrl;

    let shortcutLink = document.getElementById('dynamic-shortcut-favicon') as HTMLLinkElement | null;
    if (!shortcutLink) {
      shortcutLink = document.createElement('link');
      shortcutLink.id = 'dynamic-shortcut-favicon';
      shortcutLink.rel = 'shortcut icon';
      document.head.appendChild(shortcutLink);
    }
    shortcutLink.href = iconUrl;

    let appleLink = document.getElementById('dynamic-apple-icon') as HTMLLinkElement | null;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.id = 'dynamic-apple-icon';
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = iconUrl;
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
