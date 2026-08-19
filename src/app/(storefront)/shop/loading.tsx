import React from 'react';
import { ShopHeaderSkeleton } from '@/components/skeletons/storefront/ShopHeaderSkeleton';
import { ProductGridSkeleton } from '@/components/skeletons/storefront/ProductGridSkeleton';

export default function ShopLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ShopHeaderSkeleton />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}
