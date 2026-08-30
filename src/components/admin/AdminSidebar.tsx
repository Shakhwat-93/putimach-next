'use client';
// @ts-nocheck
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  FolderKanban, Settings, LogOut, ArrowLeft, Globe, X, Zap, Image as ImageIcon
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/media', icon: ImageIcon, label: 'Media' },
  { to: '/admin/categories', icon: FolderKanban, label: 'Categories' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
];

export default function AdminSidebar({ mobileOpen, onClose }) {
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
    router.push('/admin/login');
  };

  const NavContent = ({ isMobile }) => (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header / Logo */}
      <div className="p-6 border-b border-base-300/80 flex items-center justify-between bg-gradient-to-b from-brand/5 to-transparent">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-base-900 border border-brand/20 shadow-glow-sm group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
            <img src="/api/media/uploads/img_1786602897193_2103.webp" alt="PutiMach Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black tracking-widest uppercase bg-gradient-to-r from-brand to-yellow-500 bg-clip-text text-transparent">Elite Admin</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            </div>
            {user?.email ? (
              <p className="text-xs text-surface-primary font-medium truncate max-w-[130px]">{user.email}</p>
            ) : (
              <p className="text-xs text-surface-muted">Production Mode</p>
            )}
          </div>
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-base-800 border border-base-300 text-surface-secondary hover:text-white flex items-center justify-center transition-all duration-200 shadow-md"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-brand mb-3 flex items-center gap-1.5">
          <Zap size={12} />
          <span>Core Management</span>
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            href={to}
            onClick={onClose}
            className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-small font-bold text-surface-secondary hover:text-surface-primary hover:bg-base-800 transition-all duration-300 relative group"
          >
            <Icon size={18} className="text-surface-muted group-hover:text-brand transition-colors" />
            <span>{label}</span>
          </Link>
        ))}

        <div className="divider my-6" />

        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-surface-muted mb-3">Website & CMS</p>
        <Link
          href="/admin/website/pages"
          onClick={onClose}
          className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-small font-bold text-surface-secondary hover:text-surface-primary hover:bg-base-800 transition-all duration-300 relative group"
        >
          <Globe size={18} className="text-surface-muted group-hover:text-brand transition-colors" />
          <span>Live CMS Pages</span>
        </Link>

        <div className="divider my-6" />

        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-surface-muted mb-3">System</p>
        <button
          onClick={() => { alert('System Settings are optimized for production.'); if(onClose) onClose(); }}
          className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-small font-bold text-surface-secondary hover:text-surface-primary hover:bg-base-800 transition-all duration-200"
        >
          <Settings size={18} className="text-surface-muted" />
          <span>System Settings</span>
        </button>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-base-300/80 space-y-2 bg-base-950/50">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-brand hover:bg-brand/10 border border-brand/20 transition-all duration-200 shadow-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Live Website</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Logout Admin</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky, Premium Glass) */}
      <motion.aside
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="hidden lg:flex flex-col w-72 min-h-screen border-r border-base-300 bg-base-950 sticky top-0 flex-shrink-0 z-30 shadow-glass-lg"
      >
        <NavContent isMobile={false} />
      </motion.aside>

      {/* Mobile Sidebar Modal / Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-base-950/80 backdrop-blur-md z-50 lg:hidden"
            />
            {/* Slide-in Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 bg-base-950/95 backdrop-blur-3xl border-r border-base-300 z-50 flex flex-col shadow-2xl lg:hidden"
            >
              <NavContent isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
