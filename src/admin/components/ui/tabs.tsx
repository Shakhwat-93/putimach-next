'use client';
// @ts-nocheck
import * as React from "react"
import { cn } from "../../lib/utils"

const TabsContext = React.createContext({
  value: "",
  onValueChange: () => {},
})

const Tabs = ({ value, onValueChange, defaultValue, children, className }) => {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue || "")

  const handleTabChange = (val) => {
    setSelectedTab(val)
    onValueChange?.(val)
  }

  const currentVal = value !== undefined ? value : selectedTab

  return (
    <TabsContext.Provider value={{ value: currentVal, onValueChange: handleTabChange }}>
      <div className={cn("flex flex-col gap-4 w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-11 items-center justify-start rounded-2xl bg-slate-100/80 p-1 text-slate-500 backdrop-blur-md dark:bg-slate-900/80 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50 overflow-x-auto scrollbar-none max-w-full",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value: tabValue, children, ...props }, ref) => {
  const { value, onValueChange } = React.useContext(TabsContext)
  const isSelected = value === tabValue

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onValueChange(tabValue)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-1.5 text-xs font-extrabold transition-all duration-200 shrink-0 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-white text-teal-700 shadow-sm dark:bg-slate-800 dark:text-teal-400"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value: tabValue, children, ...props }, ref) => {
  const { value } = React.useContext(TabsContext)
  if (value !== tabValue) return null

  return (
    <div
      ref={ref}
      className={cn("mt-2 focus-visible:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
