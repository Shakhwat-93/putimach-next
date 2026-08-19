'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductDetailSkeleton() {
  return (
    <div aria-busy="true" className="min-h-screen pt-24 pb-16 bg-[#FDFBF7] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-16 bg-slate-200" />
          <Skeleton className="h-3 w-3 bg-slate-200" />
          <Skeleton className="h-4 w-24 bg-slate-200" />
          <Skeleton className="h-3 w-3 bg-slate-200" />
          <Skeleton className="h-4 w-32 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Gallery Skeleton */}
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[3/4] w-full rounded-3xl bg-slate-200 overflow-hidden border border-[#E9E2D2]">
              <Skeleton className="w-full h-full bg-slate-200" />
            </div>
            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-20 rounded-xl bg-slate-200 shrink-0" />
              ))}
            </div>
          </div>

          {/* Right Column: Product Detail Form Skeleton */}
          <div className="lg:col-span-5 space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#E9E2D2] shadow-sm">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 bg-slate-200" />
              <Skeleton className="h-8 w-4/5 bg-slate-200" />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton className="h-7 w-28 bg-slate-200" />
                <Skeleton className="h-5 w-16 bg-slate-200" />
              </div>
            </div>

            <div className="h-px bg-[#E9E2D2]" />

            {/* Size Options Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 bg-slate-200" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-14 rounded-xl bg-slate-200" />
                ))}
              </div>
            </div>

            {/* Quantity Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 bg-slate-200" />
              <Skeleton className="h-11 w-32 rounded-xl bg-slate-200" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full rounded-xl bg-slate-300" />
              <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailSkeleton;
