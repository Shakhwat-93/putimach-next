'use client';

import React from 'react';
import { Skeleton } from '@/admin/components/ui/skeleton';

export function CallTeamSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="h-10 rounded-xl bg-secondary/30 border border-border/50 p-2 flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-16 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            </div>

            <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden space-y-3 p-3">
            <div className="aspect-square bg-muted rounded-xl relative overflow-hidden">
              <Skeleton className="w-full h-full" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
