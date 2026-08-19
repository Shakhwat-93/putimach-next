'use client';
// @ts-nocheck
import {
  Bell, Search, User as UserIcon, LogOut, Settings, Menu,
  Package, Info, AlertOctagon, Edit2, Truck, Trash2, Users, CreditCard,
  X, Loader2, ChevronRight, Command
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useState, useRef, useEffect } from 'react';
import { PresenceStack } from './PresenceStack';
import { LiveVisitorCounter } from './LiveVisitorCounter';
import { supabase } from '../lib/supabase';
import CurrencyIcon from './CurrencyIcon';
import { cn } from '../lib/utils';

export const Header = ({ onMenuToggle }) => {
  const { profile, userRoles, isAdmin, signOut } = useAuth();
  const {
    notifications, toasts, startupUnreadNotifications, isStartupUnreadModalOpen,
    unreadCount, markAsRead, markAllAsRead, clearAllNotifications,
    closeStartupUnreadModal, notificationPermission, enablePushNotifications
  } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ orders: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Today');

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const filterNotifs = (allNotifs, tab) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return allNotifs.filter(n => {
      const d = new Date(n.created_at);
      if (tab === 'Today') return d >= today;
      if (tab === 'This Week') return d < today && d >= weekAgo;
      if (tab === 'Earlier') return d < weekAgo;
      return true;
    });
  };

  const filteredNotifs = filterNotifs(notifications, activeTab);
  const primaryRole = userRoles[0] || 'User';
  const isOverviewPage = pathname === '/';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
        setIsSearchDropdownOpen(true);
      }
      if (e.key === 'Escape') setIsSearchDropdownOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults({ orders: [], users: [] }); return; }
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const s = `%${searchQuery}%`;
        const { data: orders } = await supabase.from('orders')
          .select('id, customer_name, phone, amount, status, product_name')
          .or(`id.ilike.${s},customer_name.ilike.${s},phone.ilike.${s},product_name.ilike.${s}`)
          .order('created_at', { ascending: false }).limit(5);
        let users = [];
        if (isAdmin) {
          const { data: ud } = await supabase.from('users').select('id, name, email')
            .or(`name.ilike.${s},email.ilike.${s}`).limit(3);
          users = ud || [];
        }
        setSearchResults({ orders: orders || [], users });
      } catch (err) { console.error('Search error:', err); }
      finally { setIsSearching(false); }
    };
    const delay = setTimeout(performSearch, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, isAdmin]);

  const navigateToOrder = (order) => { router.push(`/admin/ordersboard?viewOrder=${order.id}`); setIsSearchDropdownOpen(false); setSearchQuery(''); };
  const navigateToUser = (user) => { router.push(`/admin/usermanagement?viewUser=${user.id}`); setIsSearchDropdownOpen(false); setSearchQuery(''); };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr), now = new Date(), diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'ORDER_CREATED': return <Package size={14} />;
      case 'STATUS_CHANGE': return <Info size={14} />;
      case 'ORDER_UPDATED': return <Edit2 size={14} />;
      case 'TRACKING_ADDED': return <Truck size={14} />;
      case 'ORDER_DELETED': return <Trash2 size={14} />;
      case 'LOW_STOCK': return <AlertOctagon size={14} />;
      case 'TASK_ASSIGNED': return <Users size={14} />;
      case 'TASK_UPDATED': return <Edit2 size={14} />;
      case 'TASK_DEADLINE': return <Bell size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const getNotifTone = (notif) => {
    const type = String(notif?.type || '').toUpperCase();
    const next = String(notif?.data?.newStatus || '').toLowerCase();
    if (type === 'STATUS_CHANGE') {
      if (next.includes('confirm')) return 'success';
      if (next.includes('cancel')) return 'danger';
      if (next.includes('pending')) return 'warning';
      return 'primary';
    }
    if (type === 'ORDER_CREATED') return 'primary';
    if (type === 'ORDER_DELETED') return 'danger';
    if (type === 'LOW_STOCK') return 'warning';
    if (type.startsWith('TASK_')) return 'success';
    return 'primary';
  };

  const getNotifBadgeLabel = (notif) => {
    const type = String(notif?.type || '').toUpperCase();
    const next = String(notif?.data?.newStatus || '').trim();
    if (type === 'STATUS_CHANGE' && next) return next;
    switch (type) {
      case 'ORDER_CREATED': return 'New Order';
      case 'ORDER_UPDATED': return 'Updated';
      case 'ORDER_DELETED': return 'Deleted';
      case 'LOW_STOCK': return 'Low Stock';
      case 'TASK_ASSIGNED': return 'Assigned';
      default: return '';
    }
  };

  const handleNotifClick = (notif) => {
    markAsRead(notif.id);
    router.push(notif.type?.startsWith('TASK_') ? '/admin/taskboard' : '/admin/ordersboard');
    setIsNotifOpen(false);
  };

  const toneClasses = {
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    danger:  'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    info:    'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400',
    primary: 'bg-primary/10 text-primary',
  };

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/90 backdrop-blur-md px-4">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search... (Ctrl+K)"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setIsSearchDropdownOpen(true); }}
          onFocus={() => setIsSearchDropdownOpen(true)}
          className="h-9 w-full rounded-xl border border-input bg-background/60 pl-9 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}

        {/* Search dropdown */}
        {isSearchDropdownOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] sm:min-w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-slide-up">
            {searchResults.orders.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">
                  <Package size={11} /> Orders
                </div>
                {searchResults.orders.map(order => (
                  <button key={order.id} onClick={() => navigateToOrder(order)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Package size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {order.customer_name} <span className="text-muted-foreground font-normal">#{order.id}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{order.product_name}</div>
                    </div>
                    <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {searchResults.users.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">
                  <Users size={11} /> Staff
                </div>
                {searchResults.users.map(u => (
                  <button key={u.id} onClick={() => navigateToUser(u)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                      <UserIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!isSearching && !searchResults.orders.length && !searchResults.users.length && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Command size={22} strokeWidth={1.5} />
                <p className="text-xs font-semibold">No results for "{searchQuery}"</p>
              </div>
            )}
            <div className="border-t border-border/50 px-4 py-2">
              <span className="text-[10px] text-muted-foreground">Press <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Realtime Live Visitor Counter & Presence Stack */}
      <div className="flex items-center gap-2">
        <LiveVisitorCounter compact />
        <div className={isOverviewPage ? 'block' : 'hidden md:block'}>
          <PresenceStack />
        </div>
      </div>

      {/* Floating toasts */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => handleNotifClick(toast)}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-xl animate-slide-up cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {getNotifIcon(toast.type)}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{toast.title}</p>
              <p className="text-[11px] text-muted-foreground">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Startup unread modal */}
      {isStartupUnreadModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeStartupUnreadModal}>
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-sm font-bold text-foreground">Unread Notifications</h3>
              <button onClick={closeStartupUnreadModal} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
              {startupUnreadNotifications.map(notif => (
                <button key={notif.id}
                  onClick={() => { markAsRead(notif.id); router.push('/admin/ordersboard'); closeStartupUnreadModal(); }}
                  className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-secondary transition-colors"
                >
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', toneClasses[getNotifTone(notif)])}>
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{notif.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatTime(notif.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3">
              <button onClick={() => { markAllAsRead(); closeStartupUnreadModal(); }}
                className="text-xs font-bold text-primary hover:underline">
                Mark all as read
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification bell */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isNotifOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-display text-sm font-bold text-foreground">Notifications</h3>
              <div className="flex items-center gap-1">
                {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                  <button onClick={e => { e.stopPropagation(); enablePushNotifications(); }}
                    className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground hover:opacity-90 transition-opacity">
                    Enable Alerts
                  </button>
                )}
                <button onClick={e => { e.stopPropagation(); clearAllNotifications(); }}
                  className="rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  Clear
                </button>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-border">
              {['Today', 'This Week', 'Earlier'].map(tab => (
                <button key={tab}
                  onClick={e => { e.stopPropagation(); setActiveTab(tab); }}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold transition-colors',
                    activeTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab}
                  {activeTab === tab && notifications.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-black text-primary">
                      {filterNotifs(notifications, tab).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
              {filteredNotifs.length > 0 ? filteredNotifs.map(notif => (
                <button key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors', !notif.is_read && 'bg-primary/4')}
                >
                  <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', toneClasses[getNotifTone(notif)])}>
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!notif.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        <p className="text-xs font-bold text-foreground truncate">{notif.title}</p>
                      </div>
                      <p className="shrink-0 text-[10px] text-muted-foreground">{formatTime(notif.created_at)}</p>
                    </div>
                    {getNotifBadgeLabel(notif) && (
                      <span className={cn('mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold', toneClasses[getNotifTone(notif)])}>
                        {getNotifBadgeLabel(notif)}
                      </span>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{notif.message}</p>
                    {notif.actor_name && <p className="text-[10px] text-muted-foreground/60">By {notif.actor_name}</p>}
                  </div>
                </button>
              )) : (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Bell size={22} strokeWidth={1.5} />
                  <p className="text-xs font-semibold">All caught up in {activeTab}!</p>
                </div>
              )}
            </div>
            <div className="border-t border-border px-4 py-2.5">
              <Link href="/admin/settings" onClick={() => setIsNotifOpen(false)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                System Audit Logs →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* User dropdown */}
      <div ref={dropdownRef} className="relative">
        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-secondary text-xs font-black text-foreground transition-all hover:border-primary hover:shadow-md">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            : (profile?.name?.substring(0, 2)?.toUpperCase() || 'U')
          }
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-slide-up">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{profile?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{primaryRole}</p>
            </div>
            <div className="py-1">
              {isOverviewPage && onMenuToggle && (
                <button onClick={() => { setIsDropdownOpen(false); onMenuToggle(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors md:hidden">
                  <Menu size={15} /> Open Menu
                </button>
              )}
              <button onClick={() => { router.push('/admin/profile'); setIsDropdownOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                <UserIcon size={15} /> Profile
              </button>
              <button onClick={() => { router.push('/admin/settings'); setIsDropdownOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                <Settings size={15} /> Settings
              </button>
              <button onClick={() => setIsDropdownOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                <Info size={15} /> Help Center
              </button>
            </div>
            <div className="border-t border-border py-1">
              <button onClick={() => signOut()}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

