'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import CartRecoveryToast from '@/components/cart/CartRecoveryToast';
import FlyToCartAnimator from '@/components/cart/FlyToCartAnimator';
import TrackingInitializer from '@/components/TrackingInitializer';
import VisitorTracker from '@/components/VisitorTracker';
import FloatingSocialWidget from '@/components/layout/FloatingSocialWidget';
import { StorefrontCmsProvider } from '@/components/providers/StorefrontCmsProvider';
import { StorefrontCmsData } from '@/lib/serverCms';

export default function StorefrontClientLayout({
  children,
  cmsData,
}: {
  children: React.ReactNode;
  cmsData: StorefrontCmsData;
}) {
  return (
    <StorefrontCmsProvider initialData={cmsData}>
      <div className="storefront-root flex flex-col min-h-screen">
        <TrackingInitializer />
        <VisitorTracker />
        <Navbar
          initialBrand={cmsData.brandSettings}
          initialNavMenu={cmsData.navMenu}
          initialCategories={cmsData.categories}
        />
        <CartDrawer />
        <CartRecoveryToast />
        <FlyToCartAnimator />
        <main className="flex-1 min-h-screen">
          {children}
        </main>
        <Footer
          initialBrand={cmsData.brandSettings}
          initialContact={cmsData.contactInfo}
          initialCategories={cmsData.categories}
        />
        <FloatingSocialWidget />
      </div>
    </StorefrontCmsProvider>
  );
}
