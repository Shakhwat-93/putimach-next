'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'shimmer' | 'rounded' | 'circle';
}

export function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/60 select-none pointer-events-none',
        variant === 'circle' ? 'rounded-full' : variant === 'rounded' ? 'rounded-2xl' : 'rounded-xl',
        'animate-pulse duration-1000',
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
