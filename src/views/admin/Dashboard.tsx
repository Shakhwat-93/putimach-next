// @ts-nocheck
// src/pages/admin/Dashboard.jsx
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingBag, Users, Package,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { products } from '../../data/products';

const formatPrice = (p) => `৳${p.toLocaleString('en-BD')}`;

const stats = [
  { label: 'Revenue', value: '৳4.8L', change: '+23.5%', up: true, icon: TrendingUp, color: 'brand' },
  { label: 'Orders', value: '172', change: '+12.1%', up: true, icon: ShoppingBag, color: 'emerald' },
  { label: 'Customers', value: '5.2k', change: '+8.3%', up: true, icon: Users, color: 'blue' },
  { label: 'Avg. Rating', value: '4.8★', change: '-0.1', up: false, icon: Package, color: 'amber' },
];

const recentOrders = [
  { id: '#1091', customer: 'Arif Rahman', product: 'Rust Hoodie', amount: 2800, status: 'delivered' },
  { id: '#1090', customer: 'Nadia Islam', product: 'Void Cargo', amount: 3200, status: 'shipped' },
  { id: '#1089', customer: 'Sakib Hasan', product: 'Ember Jacket', amount: 5500, status: 'processing' },
  { id: '#1088', customer: 'Tania Momen', product: 'Graphic Tee', amount: 1400, status: 'delivered' },
  { id: '#1087', customer: 'Karim Sheikh', product: 'Night Hoodie', amount: 3100, status: 'cancelled' },
];

const statusConfig = {
  delivered: { cls: 'badge-success', label: 'Delivered' },
  shipped: { cls: 'badge-brand', label: 'Shipped' },
  processing: { cls: 'badge-warning', label: 'Processing' },
  cancelled: { cls: 'badge-danger', label: 'Cancelled' },
};

const colorMap = {
  brand: 'bg-brand/15 text-brand border-brand/20',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

function StatCard({ stat, index }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="card p-4 card-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[stat.color]}`}>
          <Icon size={16} />
        </div>
        <div className={`flex items-center gap-0.5 text-[10px] font-bold ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
          {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {stat.change}
        </div>
      </div>
      <p className="font-black text-xl text-surface-primary leading-none">{stat.value}</p>
      <p className="text-[10px] text-surface-muted mt-1">{stat.label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const topProducts = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
  const weekData = [42, 58, 38, 72, 55, 88, 65];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="font-black text-lg">Welcome back 👋</h2>
        <p className="text-surface-muted text-xs mt-0.5">Here's Rust Revive today at a glance.</p>
      </motion.div>

      {/* Stats Grid — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => <StatCard key={stat.label} stat={stat} index={i} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm">Weekly Revenue</h3>
              <p className="text-[10px] text-surface-muted">Last 7 days</p>
            </div>
            <span className="badge-success text-[10px] font-bold">+23.5%</span>
          </div>
          <div className="space-y-2.5">
            {days.map((day, i) => {
              const val = weekData[i];
              const max = Math.max(...weekData);
              const pct = (val / max) * 100;
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-7 text-[10px] text-surface-muted text-right flex-shrink-0">{day}</span>
                  <div className="flex-1 h-5 bg-base-500 rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.35 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                      className={`h-full rounded ${i === 6 ? 'bg-brand' : 'bg-base-300'}`}
                    />
                  </div>
                  <span className="w-10 text-[10px] text-surface-muted text-right flex-shrink-0">৳{val}K</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="card p-4"
        >
          <h3 className="font-bold text-sm mb-3">Top Products</h3>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <span className="w-4 text-[10px] font-black text-surface-muted text-center flex-shrink-0">{i + 1}</span>
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-base-500 flex-shrink-0">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-surface-primary line-clamp-1">{p.name}</p>
                  <p className="text-[10px] text-surface-muted">{p.reviews} reviews</p>
                </div>
                <span className="text-xs font-black text-brand flex-shrink-0">{formatPrice(p.price)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="card overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
          <h3 className="font-bold text-sm">Recent Orders</h3>
          <button className="text-[10px] text-brand hover:text-brand-400 transition-colors flex items-center gap-0.5 font-bold">
            View all <ArrowUpRight size={11} />
          </button>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-base-300/50">
          {recentOrders.map((order, i) => {
            const s = statusConfig[order.status];
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-brand font-bold">{order.id}</span>
                  <span className={`badge text-[10px] ${s.cls}`}>{s.label}</span>
                </div>
                <p className="text-xs font-bold text-surface-primary">{order.customer}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-surface-muted">{order.product}</p>
                  <p className="text-xs font-black text-surface-primary">{formatPrice(order.amount)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, i) => {
                const s = statusConfig[order.status];
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <td className="font-mono text-xs text-brand font-bold">{order.id}</td>
                    <td className="font-medium text-surface-primary">{order.customer}</td>
                    <td className="text-surface-secondary line-clamp-1">{order.product}</td>
                    <td className="font-black text-surface-primary">{formatPrice(order.amount)}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
