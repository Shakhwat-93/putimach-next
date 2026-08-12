'use client';
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Clock, Eye, X, ArrowRight, CornerDownLeft } from 'lucide-react';

export const PremiumSearch = ({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  suggestions = [], 
  onSuggestionClick,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [recentViewed, setRecentViewed] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load history and viewed items from localStorage
    try {
      const savedHistory = JSON.parse((typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('premium_search_history') || '[]');
      const savedViewed = JSON.parse((typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem('premium_search_viewed') || '[]');
      setHistory(Array.isArray(savedHistory) ? savedHistory.slice(0, 5) : []);
      setRecentViewed(Array.isArray(savedViewed) ? savedViewed.slice(0, 5) : []);
    } catch (e) {
      console.warn('Failed to load search history', e);
    }

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleGlobalKeyDown = (e) => {
      // Focus on Cmd+/ or Ctrl+/
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleInputChange = (e) => {
    onChange(e);
    if (e.target.value.trim()) {
      setIsOpen(true);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    onChange({ target: { value: '' } });
    inputRef.current?.focus();
  };

  const saveToHistory = (term) => {
    if (!term || typeof term !== 'string' || !term.trim()) return;
    const cleanTerm = term.trim();
    const newHistory = [cleanTerm, ...history.filter(t => t !== cleanTerm)].slice(0, 5);
    setHistory(newHistory);
    try {
      (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem('premium_search_history', JSON.stringify(newHistory));
    } catch (e) {}
  };

  const clearHistory = (e) => {
    e.stopPropagation();
    setHistory([]);
    try {
      (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).removeItem('premium_search_history');
    } catch (e) {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveToHistory(value);
      setIsOpen(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    if (typeof item === 'string') {
      saveToHistory(item);
      onChange({ target: { value: item } });
    } else if (item && typeof item === 'object') {
      if (item.label) saveToHistory(item.label);
      if (onSuggestionClick) onSuggestionClick(item);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative flex-1 w-full ${className}`} ref={wrapperRef}>
      {/* Search Icon */}
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />

      {/* Main Input */}
      <input
        ref={inputRef}
        type="text"
        className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-input bg-background text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
        placeholder={placeholder}
        value={value || ''}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />

      {/* Right Controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono font-bold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/50 pointer-events-none select-none">
          <span>⌘</span>
          <span>/</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors"
          title="Search options"
        >
          <Sparkles size={16} />
        </button>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden py-2 divide-y divide-border/40 backdrop-blur-xl max-h-[380px] overflow-y-auto"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {value && value.trim() ? (
              /* Quick Results */
              <div className="py-1">
                <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Quick Results</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{suggestions.length} found</span>
                </div>
                {suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Search size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{item.label}</div>
                        {item.sub && <div className="text-xs text-muted-foreground truncate">{item.sub}</div>}
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No results match "{value}"
                  </div>
                )}
              </div>
            ) : (
              /* Empty input state: Recent & Last Searches */
              <>
                {recentViewed.length > 0 && (
                  <div className="py-1">
                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Recently Viewed
                    </div>
                    {recentViewed.map((item, idx) => (
                      <button
                        key={item.id || idx}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Eye size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{item.label}</div>
                          <div className="text-xs text-muted-foreground truncate">Viewed recently</div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="py-1">
                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Last Searches</span>
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="text-[10px] font-semibold text-rose-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    {history.map((term, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/60 transition-colors text-left group"
                        onClick={() => handleSelectSuggestion(term)}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground shrink-0">
                          <Clock size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{term}</div>
                        </div>
                        <CornerDownLeft size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {!recentViewed.length && !history.length && (
                  <div className="p-8 text-center space-y-2">
                    <div className="flex justify-center text-muted-foreground/60">
                      <Search size={28} strokeWidth={1.5} />
                    </div>
                    <div className="text-sm font-semibold text-foreground">Start typing to search...</div>
                    <div className="text-xs text-muted-foreground">Search by Order ID, Customer Name, or Phone Number</div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
