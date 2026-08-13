'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loadTrackingConfig, trackPageView } from '@/lib/tracking';

export default function TrackingInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    loadTrackingConfig().then(() => {
      trackPageView();
    });
  }, []);

  useEffect(() => {
    trackPageView();
  }, [pathname]);

  return null;
}
