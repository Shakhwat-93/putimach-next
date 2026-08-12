'use client';
// @ts-nocheck
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import useAuthStore from '../../store/authStore';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { session, loading, initialize } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    const cleanup = initialize();
    return () => cleanup && cleanup();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-brand animate-spin" />
          <p className="text-xs text-surface-muted font-mono tracking-widest uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return {/* <Navigate to="/admin/login" /> */};
  }

  return children;
}
