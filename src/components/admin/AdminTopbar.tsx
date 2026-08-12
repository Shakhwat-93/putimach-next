// @ts-nocheck
import { motion } from 'framer-motion';
import { Bell, Zap, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';


const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/orders': 'Orders',
  '/admin/customers': 'Customers',
  '/admin/website/pages': 'CMS Pages',
};

export default function AdminTopbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'Admin';

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-950/80 backdrop-blur-xl sticky top-0 z-20"
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-base-800 border border-base-300 text-surface-secondary hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>
        <h1 className="font-black text-base text-surface-primary truncate">{title}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-base-800 border border-base-300 text-surface-secondary hover:text-white transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_6px_rgba(255,107,0,0.8)]" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center flex-shrink-0">
          <Zap size={14} className="text-brand" />
        </div>
      </div>
    </motion.header>
  );
}
