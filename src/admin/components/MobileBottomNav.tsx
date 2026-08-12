'use client';
// @ts-nocheck
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import './MobileBottomNav.css';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Headphones, Truck, Megaphone, ClipboardList,
  BarChart3, ShieldCheck, Package, Factory, Users, MoreHorizontal, Download,
  Share2, PlusSquare, Store, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { usePwaInstall } from '../context/PwaInstallContext';
import { isNativeApp } from '../platform/runtime';
import { Modal } from './Modal';
import { cn } from '../lib/utils';

export const MobileBottomNav = () => {
  const { hasAnyRole } = useAuth();
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);
  const { canInstall, canManualInstall, installMethod, isInstalled, promptInstall } = usePwaInstall();
  const showInstallAction = !isNativeApp();

  const allItems = [
    { path: '/admin',                      label: 'Overview',    icon: LayoutDashboard, roles: null },
    { path: '/admin/ordersboard',          label: 'Orders',      icon: ShoppingCart,    roles: null },
    { path: '/admin/storefrontmanagement', label: 'Storefront',  icon: Store,           roles: ['Admin'] },
    { path: '/admin/call-team',             label: 'Calls',       icon: Headphones,      roles: ['Admin', 'Call Team'] },
    { path: '/admin/moderator',             label: 'Moderator',   icon: ShieldCheck,     roles: ['Admin', 'Moderator'] },
    { path: '/admin/steadfast',             label: 'Courier Hub', icon: Truck,           roles: ['Admin', 'Courier Team', 'Moderator'] },
    { path: '/admin/factory',               label: 'Confirmed',   icon: Factory,         roles: ['Admin', 'Factory Team'] },
    { path: '/admin/inventorypage',         label: 'Inventory',   icon: Package,         roles: ['Admin', 'Moderator'] },
    { path: '/admin/digital-marketer',      label: 'Marketing',   icon: Megaphone,       roles: ['Admin', 'Digital Marketer'] },
    { path: '/admin/taskboard',             label: 'Tasks',       icon: ClipboardList,   roles: null },
    { path: '/admin/reportspanel',          label: 'Analytics',   icon: BarChart3,       roles: ['Admin'] },
    { path: '/admin/usermanagement',        label: 'Users',       icon: Users,           roles: ['Admin'] },
  ];

  const visibleItems = allItems.filter(item => !item.roles || hasAnyRole(item.roles));
  const primaryItems = visibleItems.slice(0, 4);
  const overflowItems = visibleItems.slice(4);
  const hasOverflow = overflowItems.length > 0;
  const isActive = (path) => pathname === path;
  const isOverflowActive = overflowItems.some(item => isActive(item.path));

  const handleInstallClick = async () => {
    if (isInstalled) return;
    if (installMethod === 'manual-ios') { setIsInstallHelpOpen(true); return; }
    if (!canInstall) return;
    await promptInstall();
    setIsMoreOpen(false);
  };

  useEffect(() => {
    const handleBackButton = (e) => { if (isMoreOpen) { e.preventDefault(); setIsMoreOpen(false); } };
    window.addEventListener('app:backbutton', handleBackButton);
    return () => window.removeEventListener('app:backbutton', handleBackButton);
  }, [isMoreOpen]);

  return (
    <>
      {/* Bottom Nav Bar — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-end border-t border-border bg-card/95 backdrop-blur-xl pb-safe md:hidden">
        <div className="flex w-full items-center">
          {primaryItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Motion.div
                key={item.path}
                className="flex-1"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Link
                  href={item.path}
                  onClick={() => setIsMoreOpen(false)}
                  className="flex flex-col items-center gap-0.5 py-2 w-full"
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                    active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                  )}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold tracking-wide',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {item.label}
                  </span>
                  {active && (
                    <Motion.span
                      layoutId="nav-pip"
                      className="absolute bottom-1 h-1 w-4 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                </Link>
              </Motion.div>
            );
          })}

          {hasOverflow && (
            <Motion.div className="flex-1" whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
              <button
                onClick={() => setIsMoreOpen(prev => !prev)}
                className="flex flex-col items-center gap-0.5 py-2 w-full"
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  (isOverflowActive || isMoreOpen) ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                )}>
                  <MoreHorizontal size={20} strokeWidth={1.8} />
                </div>
                <span className={cn(
                  'text-[9px] font-bold tracking-wide',
                  (isOverflowActive || isMoreOpen) ? 'text-primary' : 'text-muted-foreground'
                )}>
                  More
                </span>
              </button>
            </Motion.div>
          )}
        </div>
      </nav>

      {/* More Sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Overlay */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setIsMoreOpen(false)}
            />
            {/* Sheet */}
            <Motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-card pb-safe md:hidden"
            >
              {/* Handle */}
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-display font-bold text-foreground">More Sections</p>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 px-4 pb-6">
                {overflowItems.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link key={item.path} href={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all',
                        active ? 'bg-primary/10' : 'hover:bg-secondary'
                      )}
                    >
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        active ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                      )}>
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      <span className={cn('text-[9px] font-bold text-center leading-tight', active ? 'text-primary' : 'text-muted-foreground')}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}

                {showInstallAction && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={!canInstall && !canManualInstall}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all disabled:opacity-40',
                      (canInstall || canManualInstall) ? 'hover:bg-secondary' : ''
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      isInstalled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40' : 'bg-secondary text-muted-foreground'
                    )}>
                      <Download size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground text-center leading-tight">
                      {isInstalled ? 'Installed' : 'Install'}
                    </span>
                  </button>
                )}
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* iOS Install Guide Modal */}
      <Modal
        isOpen={isInstallHelpOpen}
        onClose={() => setIsInstallHelpOpen(false)}
        title="Install on iPhone"
        subtitle="Use Safari's share menu to add this app to your Home Screen."
      >
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Manual PWA Install</p>
              <p className="text-xs text-muted-foreground">Works even when browser doesn't show a prompt.</p>
            </div>
          </div>

          <ol className="space-y-3">
            {[
              { icon: <Share2 size={14} />, title: 'Tap the Share button', desc: "Use Safari's bottom toolbar and open the share sheet." },
              { icon: <PlusSquare size={14} />, title: 'Select "Add to Home Screen"', desc: 'Scroll the actions list if the option is lower in the sheet.' },
              { icon: <Download size={14} />, title: 'Tap "Add"', desc: 'The app will appear on the Home Screen and run as an installed app.' },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <button
            onClick={() => setIsInstallHelpOpen(false)}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Understood
          </button>
        </div>
      </Modal>
    </>
  );
};
