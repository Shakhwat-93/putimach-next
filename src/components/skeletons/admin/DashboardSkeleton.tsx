'use client';

import React from 'react';
import { Skeleton } from '@/admin/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6 pb-8">
      {/* Welcome Hero Banner Skeleton */}
      <div className="rounded-3xl border border-border bg-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-12 w-48 rounded-xl" />
      </div>

      {/* Daily Snapshot Skeleton */}
      <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* KPI Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 h-[350px] flex flex-col justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 h-[350px] space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
