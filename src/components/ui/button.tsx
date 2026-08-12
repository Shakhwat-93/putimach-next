// @ts-nocheck
import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand/80",
        outline:
          "border-base-300 bg-white hover:bg-base-100 hover:text-surface-primary aria-expanded:bg-base-100 aria-expanded:text-surface-primary",
        secondary:
          "bg-base-200 text-surface-primary hover:bg-base-300 aria-expanded:bg-base-200 aria-expanded:text-surface-primary",
        ghost:
          "hover:bg-base-100 hover:text-surface-primary aria-expanded:bg-base-100 aria-expanded:text-surface-primary",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 focus-visible:border-red-400 focus-visible:ring-red-200",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 rounded-lg",
        xs: "h-7 gap-1 px-2.5 text-xs rounded-md",
        sm: "h-8.5 gap-1 px-3 text-sm rounded-md",
        lg: "h-11.5 gap-1.5 px-5 rounded-lg text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-8.5 rounded-md",
        "icon-lg": "size-11.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
