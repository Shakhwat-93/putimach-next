'use client';
// @ts-nocheck
import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileQuickFab } from './MobileQuickFab';
import { UnattendedOrdersAlertModal } from './UnattendedOrdersAlertModal';
import { getSessionStorage } from '../platform/storage';
import { Download, X } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

export const DashboardLayout = ({ children }) => {
  const router = useRouter();
  const { user, loading, isAuthReady } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const pathname = usePathname();
  const scrollRef = useRef(null);
  const scrollKey = `route_scroll:${pathname}`;
  const storage = getSessionStorage();

  useEffect(() => {
    if (isAuthReady && !loading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, loading, isAuthReady, pathname, router]);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const config = await api.getSystemConfig('app_version');
        if (config && Number(config.versionCode) > 2) {
          setUpdateAvailable(true);
          setUpdateVersion(config);
        }
      } catch (err) {
        console.warn('[DashboardLayout] Background update check failed:', err);
      }
    };
    checkUpdates();
    const interval = setInterval(checkUpdates, 600000);
    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const saved = storage.getItem(scrollKey);
    node.scrollTop = saved ? Number(saved) || 0 : 0;
    const handleScroll = () => { storage.setItem(scrollKey, String(node.scrollTop)); };
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => { handleScroll(); node.removeEventListener('scroll', handleScroll); };
  }, [scrollKey, storage]);

  useEffect(() => {
    const handleBackButton = (event) => {
      if (isSidebarOpen) { event.preventDefault(); setIsSidebarOpen(false); }
    };
    window.addEventListener('app:backbutton', handleBackButton);
    return () => window.removeEventListener('app:backbutton', handleBackButton);
  }, [isSidebarOpen]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-[#14100E] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
          <p className="text-xs text-[#C5A880] font-mono uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/admin/login') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 relative z-10">
        {/* Header */}
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

        {/* OTA Update Banner */}
        {updateAvailable && !dismissedUpdate && updateVersion && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Download size={14} className="animate-bounce shrink-0" />
              <span className="text-xs font-semibold">
                New update available! <strong>v{updateVersion.versionName}</strong> (Build {updateVersion.versionCode})
              </span>
              <button
                onClick={() => router.push('/admin/settings?section=update')}
                className="ml-2 rounded-full bg-amber-600 px-3 py-0.5 text-[10px] font-bold text-white hover:bg-amber-700 transition-colors"
              >
                Update Now
              </button>
            </div>
            <button
              onClick={() => setDismissedUpdate(true)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 [-webkit-overflow-scrolling:touch]"
        >
          {children}
        </main>
      </div>

      {/* Mobile FAB & Modals */}
      <MobileQuickFab />
      <UnattendedOrdersAlertModal />
    </div>
  );
};
