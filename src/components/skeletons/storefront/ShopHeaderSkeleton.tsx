'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ShopHeaderSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6 mb-8">
      {/* Title & Banner Skeleton */}
      <div className="relative rounded-3xl bg-white p-6 sm:p-8 border border-[#E9E2D2] overflow-hidden">
        <div className="max-w-md space-y-3">
          <Skeleton className="h-4 w-28 bg-slate-200" />
          <Skeleton className="h-8 w-64 bg-slate-300" />
          <Skeleton className="h-4 w-80 bg-slate-200" />
        </div>
      </div>

      {/* Toolbar & Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#E9E2D2]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-xl bg-slate-200" />
          <Skeleton className="h-10 w-44 rounded-xl bg-slate-200" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl bg-slate-200 shrink-0" />
      </div>
    </div>
  );
}

export function InfoPageSkeleton() {
  return (
    <div aria-busy="true" className="min-h-screen pt-24 pb-16 bg-[#FDFBF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="space-y-4 mb-8 text-center">
          <Skeleton className="h-8 w-64 bg-slate-300 mx-auto" />
          <Skeleton className="h-4 w-96 bg-slate-200 mx-auto" />
        </div>
        <div className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E9E2D2]">
          <Skeleton className="h-6 w-1/3 bg-slate-300" />
          <Skeleton className="h-4 w-full bg-slate-200" />
          <Skeleton className="h-4 w-5/6 bg-slate-200" />
          <Skeleton className="h-4 w-4/6 bg-slate-200" />
          <div className="pt-4 space-y-3">
            <Skeleton className="h-6 w-1/4 bg-slate-300" />
            <Skeleton className="h-4 w-full bg-slate-200" />
            <Skeleton className="h-4 w-3/4 bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
