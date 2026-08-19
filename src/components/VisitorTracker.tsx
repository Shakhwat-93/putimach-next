'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
  const pathname = usePathname();
  const visitorIdRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let vId = sessionStorage.getItem('pm_visitor_id');
    if (!vId) {
      vId = `v_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
      sessionStorage.setItem('pm_visitor_id', vId);
    }
    visitorIdRef.current = vId;

    const sendHeartbeat = () => {
      if (document.visibilityState === 'hidden') return;
      
      const payload = {
        visitorId: visitorIdRef.current || vId,
        page: window.location.pathname || pathname || '/',
        device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
      };

      fetch('/admin-api/visitor-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    };

    // Immediate ping on route load
    sendHeartbeat();

    // 15s interval heartbeat
    const interval = setInterval(sendHeartbeat, 15000);

    // On tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}

