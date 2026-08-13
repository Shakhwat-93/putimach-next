'use client';
// @ts-nocheck
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import TrackingInitializer from '@/components/TrackingInitializer';
import VisitorTracker from '@/components/VisitorTracker';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront-root flex flex-col min-h-screen">
      <TrackingInitializer />
      <VisitorTracker />
      <Navbar />
      <CartDrawer />
      <main className="flex-1 min-h-screen">
        {children}
      </main>
      <Footer />
    </div>
  );
}