'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let visitorId = sessionStorage.getItem('pm_visitor_id');
    if (!visitorId) {
      visitorId = `v_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
      sessionStorage.setItem('pm_visitor_id', visitorId);
    }

    const channel = supabase.channel('online-visitors', {
      config: {
        presence: {
          key: visitorId,
        },
      },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          onlineAt: new Date().toISOString(),
          page: pathname || '/',
          device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
        });
      }
    });

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {}
    };
  }, [pathname]);

  return null;
}
