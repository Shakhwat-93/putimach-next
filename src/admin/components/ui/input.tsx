// @ts-nocheck
import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({
  className,
  type = "text",
  label,
  error,
  helperText,
  icon: Icon,
  fullWidth = false,
  isTextarea = false,
  rows = 3,
  ...props
}, ref) => {
  const Component = isTextarea ? "textarea" : "input"

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", className)}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}
      
      <div className="relative flex items-center w-full">
        {Icon && !isTextarea && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon size={16} />
          </div>
        )}

        <Component
          type={isTextarea ? undefined : type}
          rows={isTextarea ? rows : undefined}
          className={cn(
            "flex w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-900 dark:focus:ring-teal-400/20",
            Icon && !isTextarea && "pl-10",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500 dark:focus:border-rose-500",
            isTextarea ? "min-h-[90px] resize-y" : "h-10"
          )}
          ref={ref}
          {...props}
        />
      </div>

      {error && (
        <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {helperText}
        </span>
      )}
    </div>
  )
})

Input.displayName = "Input"

export { Input }
