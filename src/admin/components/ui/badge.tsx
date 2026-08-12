// @ts-nocheck
import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide transition-all duration-200 shadow-2xs shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-teal-500/20 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-950/60 dark:text-teal-300",
        primary:
          "border border-teal-500/20 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-950/60 dark:text-teal-300",
        secondary:
          "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300",
        outline:
          "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
        destructive:
          "border border-rose-500/20 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/60 dark:text-rose-300",
        danger:
          "border border-rose-500/20 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/60 dark:text-rose-300",
        success:
          "border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300",
        confirmed:
          "border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300",
        completed:
          "border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300",
        warning:
          "border border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300",
        pending:
          "border border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300",
        info:
          "border border-sky-500/20 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/60 dark:text-sky-300",
        courier:
          "border border-purple-500/20 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-950/60 dark:text-purple-300",
        factory:
          "border border-indigo-500/20 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300",
        new:
          "border border-blue-500/20 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  )
}

export { Badge, badgeVariants }
