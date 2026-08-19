'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="group flex flex-col h-full select-none pointer-events-none">
      {/* Top Image Area — aspect-[3/4] matching ProductCard */}
      <div className="relative aspect-[3/4] rounded-2xl bg-base-900 border border-base-400/20 overflow-hidden">
        <Skeleton className="w-full h-full rounded-2xl bg-base-800/60" />
        {/* Badge Skeleton */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full bg-base-700/80" />
        </div>
      </div>

      {/* Product Content Skeleton */}
      <div className="pt-3 pb-2 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-1/3 rounded-lg bg-base-700/50" />
          <Skeleton className="h-4.5 w-4/5 rounded-lg bg-base-700/80" />
        </div>

        {/* Price & Action Area */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-lg bg-base-700/80" />
            <Skeleton className="h-4 w-10 rounded-lg bg-base-700/40" />
          </div>
          <Skeleton className="h-9 w-9 rounded-xl bg-base-700/70" />
        </div>
      </div>
    </div>
  );
}

export default ProductCardSkeleton;
