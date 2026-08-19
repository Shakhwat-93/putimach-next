'use client';

import React from 'react';
import { Skeleton } from '@/admin/components/ui/skeleton';

export function OrdersSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      {/* Mobile View Card Skeletons */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-32" />
            </div>

            <div className="grid grid-cols-2 gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border/50">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Skeleton className="h-3 w-16" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View Skeleton */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              {['Order', 'Date', 'Customer', 'Product', 'Amount', 'Status', 'Timer', 'Actions'].map((h, idx) => (
                <th key={idx} className="p-3 text-xs font-bold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="p-3">
                <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                <td className="p-3"><Skeleton className="h-3.5 w-24" /></td>
                <td className="p-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </td>
                <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                <td className="p-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                <td className="p-3"><Skeleton className="h-8 w-20 rounded-xl" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrdersSkeleton;
