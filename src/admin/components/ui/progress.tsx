// @ts-nocheck
import * as React from 'react';
import { cn } from '../../lib/utils';

const Progress = React.forwardRef(({ className, value, max = 100, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={value}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    {...props}
  >
    <div
      className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
      style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
