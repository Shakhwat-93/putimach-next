// @ts-nocheck
import * as React from 'react';
import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }) {
  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-xl bg-muted/70 select-none pointer-events-none animate-pulse duration-1000',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
