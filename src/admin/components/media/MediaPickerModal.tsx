'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Search, X, Check, UploadCloud, RefreshCw, Image as ImageIcon,
  Loader2, Filter, ArrowUpDown, Plus, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { uploadImage } from '../../lib/uploadHelper';
import { cleanImageUrl } from '@/lib/productMedia';

export interface MediaAsset {
  key: string;
  url: string;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
  contentType: string;
  lastModified: string;
  extension: string;
}

export interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedUrls: string[]) => void;
  multiple?: boolean;
  initialSelectedUrls?: string[];
  title?: string;
}

// Module-level cache to prevent unnecessary R2 re-fetches
let cachedMediaAssets: MediaAsset[] | null = null;
let cacheFetchPromise: Promise<MediaAsset[]> | null = null;

async function fetchMediaAssets(forceRefresh = false): Promise<MediaAsset[]> {
  if (!forceRefresh && cachedMediaAssets && cachedMediaAssets.length > 0) {
    return cachedMediaAssets;
  }
  if (!forceRefresh && cacheFetchPromise) {
    return cacheFetchPromise;
  }

  cacheFetchPromise = (async () => {
    try {
      const res = await fetch('/admin-api/media?limit=1000', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawList = Array.isArray(data.items) ? data.items : (Array.isArray(data.assets) ? data.assets : []);
      if (data.success && Array.isArray(rawList)) {
        const normalized: MediaAsset[] = rawList.map((item: any) => {
          const isImg = item.type === 'image' || item.contentType?.startsWith('image/') || /\.(webp|jpg|jpeg|png|gif|svg|avif)$/i.test(item.name || item.key || item.url || '');
          return {
            key: item.key,
            url: item.url || `/api/media/${item.key}`,
            name: item.name || item.key?.split('/').pop() || '',
            size: item.size || 0,
            sizeFormatted: item.sizeFormatted || item.formattedSize || '',
            type: isImg ? 'image' : 'file',
            contentType: item.contentType || 'image/webp',
            lastModified: item.lastModified || new Date().toISOString(),
            extension: item.name?.split('.').pop()?.toLowerCase() || 'webp'
          };
        });
        cachedMediaAssets = normalized;
        return normalized;
      }
      return [];
    } catch (err) {
      console.error('Failed to load media assets:', err);
      return [];
    } finally {
      cacheFetchPromise = null;
    }
  })();

  return cacheFetchPromise;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  initialSelectedUrls = [],
  title = 'Select Media'
}) => {
  const [assets, setAssets] = useState<MediaAsset[]>(cachedMediaAssets || []);
  const [loading, setLoading] = useState(!cachedMediaAssets || cachedMediaAssets.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');

  // Selected URLs in order
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const quickUploadInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync initial selection when modal opens
  useEffect(() => {
    if (isOpen) {
      const cleaned = (initialSelectedUrls || [])
        .map(u => cleanImageUrl(u))
        .filter(Boolean) as string[];
      setSelectedUrls(cleaned);
      setError(null);
      setSearchQuery('');

      if (!cachedMediaAssets || cachedMediaAssets.length === 0) {
        setLoading(true);
      }
      fetchMediaAssets(true).then(data => {
        setAssets(data);
        setLoading(false);
      }).catch(err => {
        setError('Failed to connect to Cloudflare R2');
        setLoading(false);
      });
    }
  }, [isOpen, initialSelectedUrls]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scroll when open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await fetchMediaAssets(true);
      setAssets(fresh);
    } catch (err: any) {
      setError('Could not refresh media list');
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgressText(`Uploading ${files.length} file(s)...`);

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Uploading (${i + 1}/${files.length}): ${files[i].name}...`);
        const url = await uploadImage(files[i]);
        if (url) {
          const clean = cleanImageUrl(url);
          if (clean) newUrls.push(clean);
        }
      }

      // Refresh list to show newly uploaded files
      const fresh = await fetchMediaAssets(true);
      setAssets(fresh);

      if (newUrls.length > 0) {
        if (multiple) {
          setSelectedUrls(prev => Array.from(new Set([...prev, ...newUrls])));
        } else {
          setSelectedUrls([newUrls[newUrls.length - 1]]);
        }
      }
    } catch (err: any) {
      console.error('Quick upload error:', err);
      setError(`Upload failed: ${err.message || 'Error uploading file'}`);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (e.target) e.target.value = '';
    }
  };

  const toggleSelectUrl = (url: string) => {
    const clean = cleanImageUrl(url);
    if (!clean) return;

    if (multiple) {
      if (selectedUrls.includes(clean)) {
        setSelectedUrls(prev => prev.filter(u => u !== clean));
      } else {
        setSelectedUrls(prev => [...prev, clean]);
      }
    } else {
      // Single select: toggle or select
      if (selectedUrls.includes(clean)) {
        setSelectedUrls([]);
      } else {
        setSelectedUrls([clean]);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(selectedUrls);
    onClose();
  };

  // Instant client-side filtering & sorting
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Type filter
      if (typeFilter === 'image') {
        const isImg = asset.type === 'image' || asset.contentType?.startsWith('image/') || /\.(webp|jpg|jpeg|png|gif|svg|avif)$/i.test(asset.name || asset.key || asset.url || '');
        if (!isImg) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = asset.name?.toLowerCase().includes(q);
        const matchesKey = asset.key?.toLowerCase().includes(q);
        if (!matchesName && !matchesKey) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.lastModified || 0).getTime() - new Date(b.lastModified || 0).getTime();
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'size') {
        return (b.size || 0) - (a.size || 0);
      }
      return 0;
    });
  }, [assets, searchQuery, typeFilter, sortBy]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-card rounded-2xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ImageIcon size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                {title}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Select from Cloudflare R2 storage bucket ({assets.length} items)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Upload Button */}
            <input
              ref={quickUploadInputRef}
              type="file"
              accept="image/*"
              multiple={multiple}
              className="hidden"
              onChange={handleQuickUpload}
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => quickUploadInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span className="hidden sm:inline">Uploading...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Upload New</span>
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="w-8 h-8 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Refresh R2 media"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters, Sort */}
        <div className="px-4 sm:px-6 py-2.5 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-8 pr-7 rounded-xl bg-background border border-input text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Type & Sort Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl bg-background border border-input p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('image')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  typeFilter === 'image' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Images
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  typeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8.5 pl-2.5 pr-7 rounded-xl bg-background border border-input text-xs font-semibold text-foreground focus:outline-none cursor-pointer appearance-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">Largest Size</option>
              </select>
              <ArrowUpDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Upload Status Banner */}
        {isUploading && (
          <div className="px-4 sm:px-6 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2 text-xs font-bold text-primary animate-pulse shrink-0">
            <Loader2 size={13} className="animate-spin shrink-0" />
            <span>{uploadProgressText}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="px-4 sm:px-6 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between text-xs font-medium text-destructive shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="font-bold underline ml-2 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Media Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 bg-background/50">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-xs font-semibold">Connecting to Cloudflare R2 & Loading Assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <ImageIcon size={24} />
              </div>
              <p className="text-sm font-bold text-foreground">
                {searchQuery ? 'No media matched your search' : 'No media found in R2 Storage'}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchQuery ? 'Try another keyword or clear the search filter.' : 'Upload your first image to get started.'}
              </p>
              <button
                type="button"
                onClick={() => quickUploadInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Upload Image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {filteredAssets.map((asset) => {
                const cleanUrl = cleanImageUrl(asset.url);
                const isSelected = selectedUrls.includes(cleanUrl);
                const selectedIndex = selectedUrls.indexOf(cleanUrl);

                return (
                  <div
                    key={asset.key}
                    onClick={() => toggleSelectUrl(asset.url)}
                    onDoubleClick={() => {
                      if (!multiple) {
                        onSelect([cleanUrl]);
                        onClose();
                      }
                    }}
                    className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-150 bg-card select-none flex flex-col ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-md scale-[1.02] bg-primary/5'
                        : 'border-border hover:border-foreground/40 hover:shadow-xs'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-full aspect-square bg-[#F7F4EE] flex items-center justify-center overflow-hidden p-1">
                      {asset.type === 'image' || asset.contentType?.startsWith('image/') ? (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          className="w-full h-full object-contain drop-shadow-2xs rounded-lg transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <FileText size={28} />
                          <span className="text-[10px] uppercase mt-1 font-bold">{asset.extension}</span>
                        </div>
                      )}

                      {/* Selection Badge Indicator */}
                      <div className="absolute top-1.5 right-1.5 z-10">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shadow-md">
                            {multiple ? selectedIndex + 1 : <Check size={12} strokeWidth={3} />}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-black/40 border border-white/60 text-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File Info Bar */}
                    <div className="p-1.5 border-t border-border/60 bg-card/90 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate leading-tight" title={asset.name}>
                        {asset.name}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>{asset.sizeFormatted}</span>
                        <span className="uppercase">{asset.extension}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer: Selection summary & Confirm action */}
        <div className="px-4 sm:px-6 py-3 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-bold text-foreground">
              {selectedUrls.length} {selectedUrls.length === 1 ? 'item' : 'items'} selected
            </span>
            {selectedUrls.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUrls([])}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-semibold cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedUrls.length === 0}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Insert Selected ({selectedUrls.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via portal to prevent form clipping
  return typeof document !== 'undefined'
    ? ReactDOM.createPortal(modalContent, document.body)
    : null;
};
