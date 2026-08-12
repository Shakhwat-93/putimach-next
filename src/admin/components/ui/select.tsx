'use client';
// @ts-nocheck
import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

const SelectContext = React.createContext({
  value: "",
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
})

const Select = ({ value, onValueChange, children, className }) => {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={containerRef} className={cn("relative inline-block w-full", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, placeholder = "Select option...", icon: Icon, ...props }, ref) => {
  const { open, setOpen } = React.useContext(SelectContext)

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:border-teal-400 dark:focus:ring-teal-400/20",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate">
        {Icon && <Icon size={16} className="text-slate-400 shrink-0" />}
        <span className="truncate">{children || placeholder}</span>
      </div>
      <ChevronDown
        size={16}
        className={cn(
          "text-slate-400 shrink-0 transition-transform duration-200",
          open && "rotate-180 text-teal-600 dark:text-teal-400"
        )}
      />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ className, children }) => {
  const { open } = React.useContext(SelectContext)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 4, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/95 dark:shadow-2xl scrollbar-none",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const SelectItem = ({ value: itemValue, children, className, onClick }) => {
  const { value, onValueChange, setOpen } = React.useContext(SelectContext)
  const isSelected = value === itemValue

  const handleSelect = (e) => {
    onValueChange?.(itemValue)
    onClick?.(e)
    setOpen(false)
  }

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        isSelected && "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
        className
      )}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check size={16} className="text-teal-600 dark:text-teal-400 shrink-0 ml-2" />}
    </div>
  )
}

const SelectValue = ({ placeholder = "Select..." }) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
