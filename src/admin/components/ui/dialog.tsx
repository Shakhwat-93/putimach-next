'use client';
// @ts-nocheck
import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

const DialogContext = React.createContext({
  open: false,
  onOpenChange: () => {},
})

const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = ({ children, asChild = false, ...props }) => {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <div onClick={() => onOpenChange?.(true)} className="inline-block" {...props}>
      {children}
    </div>
  )
}

const DialogContent = ({ className, children, title, subtitle, onClose, size = 'default' }) => {
  const { open, onOpenChange } = React.useContext(DialogContext)

  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizeClass = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  }[size] || 'max-w-lg'

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          {/* Scroll & Center Container */}
          <div className="relative z-10 w-full flex items-center justify-center min-h-full p-3 sm:p-6 overflow-hidden">
            {/* Modal Box — Premium centered card, constrained max-h-[85vh] */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "relative z-10 w-full max-w-[calc(100vw-24px)] max-h-[85vh] max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl my-auto",
                sizeClass,
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-5 top-5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground hover:scale-105 shrink-0"
              >
                <X size={16} />
              </button>

              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )

  if (typeof document === "undefined") return content
  return createPortal(content, document.body)
}

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1 text-left mb-4 pr-10 shrink-0", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg sm:text-xl font-bold tracking-tight text-foreground font-sans m-0", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-xs font-semibold text-muted-foreground mt-0.5 font-sans", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t border-border mt-4 shrink-0", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
