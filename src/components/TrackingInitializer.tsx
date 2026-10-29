'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { loadTrackingConfig, trackPageView } from '@/lib/tracking';

/**
 * Global Tracking Initializer Component
 * 
 * Guarantees:
 * 1. Single initialization of tracking scripts (GTM, GA4, Meta Pixel, TikTok Pixel).
 * 2. Guaranteed initial PageView AFTER scripts are ready.
 * 3. SPA route navigation page_view tracking without duplicates in React Strict Mode.
 */
export default function TrackingInitializer() {
  const pathname = usePathname();
  const isLoadedRef = useRef(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    loadTrackingConfig()
      .then(() => {
        if (isCancelled) return;
        isLoadedRef.current = true;
        // Fire initial pageview on first load once tracking configuration is active
        if (lastTrackedPathRef.current !== pathname) {
          lastTrackedPathRef.current = pathname;
          trackPageView();
        }
      })
      .catch(err => {
        console.warn('[TrackingInitializer] Error loading tracking config:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Track virtual pageviews on client-side route navigation
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (lastTrackedPathRef.current === pathname) return;

    lastTrackedPathRef.current = pathname;
    trackPageView();
  }, [pathname]);

  return null;
}
