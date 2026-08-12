'use client';
// @ts-nocheck
// src/pages/admin/Customers.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const formatPrice = (p) => `৳${p.toLocaleString('en-BD')}`;

const customers = [
  { id: 1, name: 'Arif Rahman', email: 'arif@email.com', phone: '01711-123456', city: 'Dhaka', orders: 5, totalSpent: 14800, lastOrder: '16 May', status: 'vip' },
  { id: 2, name: 'Nadia Islam', email: 'nadia@email.com', phone: '01812-234567', city: 'Chittagong', orders: 3, totalSpent: 8700, lastOrder: '16 May', status: 'regular' },
  { id: 3, name: 'Sakib Hasan', email: 'sakib@email.com', phone: '01912-345678', city: 'Sylhet', orders: 2, totalSpent: 7300, lastOrder: '15 May', status: 'regular' },
  { id: 4, name: 'Tania Momen', email: 'tania@email.com', phone: '01611-456789', city: 'Dhaka', orders: 7, totalSpent: 21500, lastOrder: '15 May', status: 'vip' },
  { id: 5, name: 'Karim Sheikh', email: 'karim@email.com', phone: '01711-567890', city: 'Rajshahi', orders: 1, totalSpent: 3100, lastOrder: '14 May', status: 'new' },
  { id: 6, name: 'Rima Akter', email: 'rima@email.com', phone: '01812-678901', city: 'Dhaka', orders: 4, totalSpent: 11200, lastOrder: '14 May', status: 'regular' },
  { id: 7, name: 'Fahim Hassan', email: 'fahim@email.com', phone: '01912-789012', city: 'Khulna', orders: 2, totalSpent: 5600, lastOrder: '13 May', status: 'new' },
  { id: 8, name: 'Sumaiya Begum', email: 'sumaiya@email.com', phone: '01611-890123', city: 'Dhaka', orders: 6, totalSpent: 18400, lastOrder: '13 May', status: 'vip' },
];

const statusConfig = {
  vip: { cls: 'badge-brand', label: 'VIP' },
  regular: { cls: 'badge-success', label: 'Regular' },
  new: { cls: 'badge-warning', label: 'New' },
};

export default function AdminCustomers() {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const vipCount = customers.filter(c => c.status === 'vip').length;
  const avgOrders = (customers.reduce((s, c) => s + c.orders, 0) / customers.length).toFixed(1);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h2 className="font-black text-lg">Customers</h2>
        <p className="text-surface-muted text-xs mt-0.5">{customers.length} total · {vipCount} VIP</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: customers.length, color: 'text-surface-primary' },
          { label: 'VIP', value: vipCount, color: 'text-brand' },
          { label: 'Avg Orders', value: avgOrders, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3 text-center">
            <p className={`font-black text-xl ${color}`}>{value}</p>
            <p className="text-[10px] text-surface-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-8 text-xs h-9 w-full"
          id="customers-search"
        />
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="card py-12 flex items-center justify-center text-surface-muted text-sm">No customers found</div>
        ) : filtered.map((customer, i) => {
          const s = statusConfig[customer.status];
          const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2);
          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/20 flex items-center justify-center text-xs font-black text-brand flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-surface-primary">{customer.name}</p>
                    <p className="text-[10px] text-surface-muted">{customer.city}</p>
                  </div>
                </div>
                <span className={`badge text-[10px] ${s.cls}`}>{s.label}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-base-300/50">
                <p className="text-[10px] text-surface-muted">{customer.phone}</p>
                <div className="text-right">
                  <p className="text-xs font-black text-surface-primary">{formatPrice(customer.totalSpent)}</p>
                  <p className="text-[10px] text-surface-muted">{customer.orders} orders</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>City</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer, i) => {
                const s = statusConfig[customer.status];
                const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                return (
                  <motion.tr key={customer.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/20 flex items-center justify-center text-xs font-black text-brand flex-shrink-0">{initials}</div>
                        <p className="font-bold text-surface-primary text-xs">{customer.name}</p>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs text-surface-secondary">{customer.email}</p>
                      <p className="text-[10px] text-surface-muted">{customer.phone}</p>
                    </td>
                    <td className="text-xs text-surface-secondary">{customer.city}</td>
                    <td className="font-black text-center text-xs">{customer.orders}</td>
                    <td className="font-black text-xs text-surface-primary">{formatPrice(customer.totalSpent)}</td>
                    <td><span className={`badge text-[10px] ${s.cls}`}>{s.label}</span></td>
                    <td className="text-xs text-surface-muted whitespace-nowrap">{customer.lastOrder}</td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-surface-muted text-xs">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
