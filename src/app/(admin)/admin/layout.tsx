'use client';
// @ts-nocheck
import '@/admin/admin-styles.css';
import AdminProviders from '@/providers/AdminProviders';
import { DashboardLayout } from '@/admin/components/DashboardLayout';
import { usePathname } from 'next/navigation';
import ClientOnly from '@/admin/components/ClientOnly';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  
  return (
    <ClientOnly>
      <AdminProviders>
        {isLogin ? children : (
          <DashboardLayout>
            {children}
          </DashboardLayout>
        )}
      </AdminProviders>
    </ClientOnly>
  );
}