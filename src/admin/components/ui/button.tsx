// @ts-nocheck
import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center font-semibold text-sm whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
        emerald:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500",
        indigo:
          "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500",
        purple:
          "bg-purple-600 text-white shadow-sm hover:bg-purple-500",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
        outline:
          "border border-border bg-background text-foreground hover:bg-secondary hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-secondary hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-xl gap-2",
        xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
        sm: "h-9 px-3 text-xs rounded-xl gap-1.5",
        md: "h-10 px-4 py-2 rounded-xl gap-2",
        lg: "h-12 px-6 text-base rounded-2xl gap-2.5",
        icon: "size-10 rounded-xl",
        "icon-xs": "size-7 rounded-lg",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
