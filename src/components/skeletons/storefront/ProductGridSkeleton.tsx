'use client';

import React from 'react';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductGridSkeletonProps {
  count?: number;
  columns?: string;
}

export function ProductGridSkeleton({
  count = 6,
  columns = 'grid-cols-2 lg:grid-cols-3',
}: ProductGridSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading products"
      className={`grid gap-4 sm:gap-6 ${columns}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default ProductGridSkeleton;
