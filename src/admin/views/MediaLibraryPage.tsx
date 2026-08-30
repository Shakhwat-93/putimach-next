'use client';
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Image as ImageIcon, UploadCloud, Trash2, Search, RefreshCw, Copy, Check,
  ExternalLink, Download, AlertTriangle, Info, Grid, List, Eye, X,
  CheckCircle2, CircleAlert, FileText, ArrowUpDown, Filter, Sparkles,
  HardDrive, Layers, ShieldAlert, Loader2, Maximize2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/Modal';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { cn } from '../lib/utils';
import { cleanImageUrl } from '@/lib/productMedia';

interface MediaItem {
  key: string;
  name: string;
  url: string;
  size: number;
  formattedSize: string;
  contentType: string;
  lastModified: string;
  etag?: string;
  originalName?: string;
}

interface UsageReference {
  type: string;
  id: string;
  name: string;
  field: string;
}

export const MediaLibraryPage = () => {
  const { showError, showSuccess } = useConfirmDialog();

  // State
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size_desc' | 'size_asc' | 'name_asc' | 'name_desc'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bucket statistics
  const [bucketStats, setBucketStats] = useState({
    totalCount: 0,
    totalSizeFormatted: '0 B',
    totalSizeBytes: 0,
    hasMore: false,
    nextCursor: null as string | null,
  });

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [itemUsage, setItemUsage] = useState<{ inUse: boolean; count: number; references: UsageReference[] } | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  // Safe Deletion state
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);
  const [deleteUsageWarning, setDeleteUsageWarning] = useState<{ inUse: boolean; references: UsageReference[] } | null>(null);
  const [forceDeleteConfirmed, setForceDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Uploading state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [filename: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch Media Items from Server
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchMedia = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        limit: '100',
        sort: sortBy,
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/admin-api/media?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setMediaItems(data.items);
        setBucketStats({
          totalCount: data.totalCount ?? data.items.length,
          totalSizeFormatted: data.formattedBucketTotalSize || '0 B',
          totalSizeBytes: data.bucketTotalSize || 0,
          hasMore: Boolean(data.hasMore),
          nextCursor: data.nextCursor || null,
        });
      } else {
        throw new Error(data.error || 'Failed to parse media data');
      }
    } catch (err: any) {
      console.error('Error fetching media:', err);
      showError('Failed to fetch media from Cloudflare R2: ' + (err.message || 'Please check server logs.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, searchTerm, showError]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Check Usage when Item is Selected
  // ─────────────────────────────────────────────────────────────────────────────
  const handleInspectItem = async (item: MediaItem) => {
    setSelectedItem(item);
    setItemUsage(null);
    setIsCheckingUsage(true);

    try {
      const res = await fetch('/admin-api/media/check-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: item.key, url: item.url }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setItemUsage({
            inUse: data.inUse,
            count: data.count || 0,
            references: data.references || [],
          });
        }
      }
    } catch (err) {
      console.warn('Failed to check media usage:', err);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Safe Delete Flow
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenDeleteDialog = async (item: MediaItem) => {
    setDeletingItem(item);
    setForceDeleteConfirmed(false);
    setDeleteUsageWarning(null);
    setIsDeleting(false);

    // Check usage before presenting dialog
    try {
      const res = await fetch('/admin-api/media/check-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: item.key, url: item.url }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.inUse) {
          setDeleteUsageWarning({
            inUse: true,
            references: data.references || [],
          });
        }
      }
    } catch (_) {}
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/admin-api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: deletingItem.key,
          url: deletingItem.url,
          force: Boolean(forceDeleteConfirmed || !deleteUsageWarning?.inUse),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.inUse && data.references) {
          setDeleteUsageWarning({
            inUse: true,
            references: data.references,
          });
          throw new Error('This image is currently in use. Check the warning above and confirm force deletion to proceed.');
        }
        throw new Error(data.error || 'Failed to delete file from storage.');
      }

      // Successfully deleted
      setMediaItems(prev => prev.filter(i => i.key !== deletingItem.key));
      setBucketStats(prev => ({
        ...prev,
        totalCount: Math.max(0, prev.totalCount - 1),
      }));

      if (selectedItem?.key === deletingItem.key) {
        setSelectedItem(null);
      }

      showSuccess(`"${deletingItem.name}" deleted from Cloudflare storage.`);
      setDeletingItem(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showError(err.message || 'Failed to delete media item.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Upload Flow (Multi-file & Drag and Drop)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFilesSelected = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.name.match(/\.(webp|jpg|jpeg|png|gif|svg|mp4|pdf)$/i)) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      setIsUploadModalOpen(true);
    }
  };

  const handleExecuteUpload = async () => {
    if (uploadFiles.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    uploadFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/admin-api/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed.');
      }

      const newUploadedItems = Array.isArray(data.items) ? data.items : (data.item ? [data.item] : []);

      // Prepend newly uploaded items to local state
      setMediaItems(prev => [...newUploadedItems, ...prev.filter(item => !newUploadedItems.some(u => u.key === item.key))]);
      setBucketStats(prev => ({
        ...prev,
        totalCount: prev.totalCount + newUploadedItems.length,
      }));

      showSuccess(`Successfully uploaded ${newUploadedItems.length} file(s) to Cloudflare R2!`);
      setUploadFiles([]);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      console.error('Upload failed:', err);
      showError('Upload error: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy to Clipboard Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const copyToClipboard = async (text: string, key: string, type = 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setCopiedType(type);
      setTimeout(() => {
        setCopiedKey(null);
        setCopiedType(null);
      }, 2000);
    } catch (_) {
      showError('Failed to copy to clipboard.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered & Sorted Media Items
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredMedia = useMemo(() => {
    return mediaItems.filter(item => {
      if (selectedType === 'All') return true;
      const ext = item.name.split('.').pop()?.toLowerCase() || '';
      if (selectedType === 'WebP') return ext === 'webp';
      if (selectedType === 'PNG') return ext === 'png';
      if (selectedType === 'JPG') return ext === 'jpg' || ext === 'jpeg';
      if (selectedType === 'Other') return !['webp', 'png', 'jpg', 'jpeg'].includes(ext);
      return true;
    });
  }, [mediaItems, selectedType]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* ── Top Header & Stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ImageIcon size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display tracking-tight">
                Media Library
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Centralized Cloudflare R2 Object Storage & CDN Asset Management
              </p>
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border text-xs">
            <HardDrive size={14} className="text-primary" />
            <span className="text-muted-foreground">Assets:</span>
            <b className="text-foreground">{bucketStats.totalCount}</b>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-muted-foreground">Size:</span>
            <b className="text-foreground">{bucketStats.totalSizeFormatted}</b>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMedia(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-9 gap-2 text-xs font-bold shadow-sm"
          >
            <UploadCloud size={15} />
            Upload Media
          </Button>
        </div>
      </div>

      {/* ── Search, Filters & View Toggle Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files by name, prefix, or extension..."
            className="pl-9 pr-8 h-9 text-xs bg-background/80"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', 'WebP', 'PNG', 'JPG', 'Other'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                selectedType === type
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Sort & View Mode */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size_desc">Largest Size</option>
              <option value="size_asc">Smallest Size</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>

          <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid View"
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Media Grid / List ── */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Connecting to Cloudflare R2 & Loading Assets...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground/60">
            <ImageIcon size={28} />
          </div>
          <h3 className="text-base font-bold text-foreground">No media assets found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchTerm ? `No files match your search "${searchTerm}".` : 'Upload product images, brand banners, or size charts to get started.'}
          </p>
          <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2 text-xs font-bold mt-2">
            <UploadCloud size={14} />
            Upload Your First Image
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredMedia.map((item) => {
            const ext = item.name.split('.').pop()?.toUpperCase() || 'FILE';
            const isSelected = selectedItem?.key === item.key;
            const isCopied = copiedKey === item.key;

            return (
              <div
                key={item.key}
                className={cn(
                  'group relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col',
                  isSelected && 'ring-2 ring-primary border-primary'
                )}
              >
                {/* Thumbnail Preview */}
                <div
                  onClick={() => handleInspectItem(item)}
                  className="aspect-square bg-muted/40 overflow-hidden relative cursor-pointer flex items-center justify-center group/img"
                >
                  <img
                    src={cleanImageUrl(item.url)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.img-fallback');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <div className="img-fallback hidden flex-col items-center justify-center text-muted-foreground/40 p-4">
                    <FileText size={32} />
                    <span className="text-[9px] font-bold mt-1">Preview Unavailable</span>
                  </div>

                  {/* Extension & Size Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white font-mono uppercase">
                      {ext}
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-medium text-white/90 font-mono">
                      {item.formattedSize}
                    </span>
                  </div>

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2 pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.url, item.key, 'url');
                      }}
                      className="p-2 rounded-xl bg-white/90 dark:bg-black/90 text-foreground hover:scale-110 active:scale-95 transition-all shadow-md pointer-events-auto"
                      title="Copy Public URL"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspectItem(item);
                      }}
                      className="p-2 rounded-xl bg-white/90 dark:bg-black/90 text-foreground hover:scale-110 active:scale-95 transition-all shadow-md pointer-events-auto"
                      title="View File Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteDialog(item);
                      }}
                      className="p-2 rounded-xl bg-destructive/90 text-destructive-foreground hover:scale-110 active:scale-95 transition-all shadow-md pointer-events-auto"
                      title="Delete File"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Card Info Footer */}
                <div className="p-2.5 space-y-1 bg-card/60 flex-1 flex flex-col justify-between">
                  <p
                    onClick={() => handleInspectItem(item)}
                    className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>{new Date(item.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.url, item.key, 'url')}
                      className="text-primary hover:underline font-bold"
                    >
                      {isCopied ? 'Copied ✓' : 'Copy URL'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 pl-4">Preview</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Uploaded Date</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredMedia.map((item) => {
                  const ext = item.name.split('.').pop()?.toUpperCase() || 'FILE';
                  const isCopied = copiedKey === item.key;

                  return (
                    <tr key={item.key} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-2.5 pl-4">
                        <div
                          onClick={() => handleInspectItem(item)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer shrink-0"
                        >
                          <img src={cleanImageUrl(item.url)} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-foreground truncate max-w-xs cursor-pointer" onClick={() => handleInspectItem(item)}>
                        {item.name}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono">{ext}</Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{item.formattedSize}</td>
                      <td className="p-3 text-muted-foreground">{new Date(item.lastModified).toLocaleString()}</td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(item.url, item.key, 'url')}
                            className="h-7 text-xs font-bold gap-1 text-primary"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            {isCopied ? 'Copied' : 'Copy'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleInspectItem(item)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Eye size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteDialog(item)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Multi-File Upload Modal ── */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => { if (!isUploading) setIsUploadModalOpen(false); }}
        title="Upload Media to Cloudflare R2"
        subtitle="Universal optimized image storage with global CDN caching"
      >
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Dropzone Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
            }}
            className="py-8 px-4 text-center rounded-2xl border-2 border-dashed border-border/80 hover:border-primary bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer group space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-bold text-foreground">
              Click to select files, or drag and drop images here
            </p>
            <p className="text-xs text-muted-foreground">
              Supports WebP, PNG, JPG, JPEG, GIF, SVG (Up to 10MB per file)
            </p>
          </div>

          {/* Staged Files Queue */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-1">
                <span>Selected Files ({uploadFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setUploadFiles([])}
                  className="text-destructive hover:underline"
                  disabled={isUploading}
                >
                  Clear All
                </button>
              </div>

              {uploadFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-secondary text-primary">
                      <ImageIcon size={14} />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate max-w-xs">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                    disabled={isUploading}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              disabled={isUploading}
              onClick={() => { setUploadFiles([]); setIsUploadModalOpen(false); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploadFiles.length === 0 || isUploading}
              onClick={handleExecuteUpload}
              className="gap-2 font-bold"
            >
              {isUploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Uploading to Cloudflare...
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  Upload {uploadFiles.length > 0 ? `(${uploadFiles.length} files)` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Media Inspector & Detail Modal ── */}
      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title="Asset Details"
          subtitle={selectedItem.name}
        >
          <div className="space-y-5">
            {/* Image Preview Box */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black/5 dark:bg-black/40 flex items-center justify-center relative group/view">
              <img
                src={cleanImageUrl(selectedItem.url)}
                alt={selectedItem.name}
                className="max-h-full max-w-full object-contain"
              />
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noreferrer"
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white backdrop-blur-xs hover:scale-105 transition-transform"
                title="Open in new tab"
              >
                <Maximize2 size={14} />
              </a>
            </div>

            {/* Active Usage Detection Banner */}
            <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" /> Store Usage Status
                </span>
                {isCheckingUsage ? (
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Loader2 size={11} className="animate-spin" /> Checking references...
                  </span>
                ) : itemUsage?.inUse ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                    ⚠️ Active in {itemUsage.count} entity(ies)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    ✓ Not actively referenced
                  </Badge>
                )}
              </div>

              {itemUsage?.inUse && itemUsage.references.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground">This media is referenced by:</p>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {itemUsage.references.map((ref, idx) => (
                      <div key={idx} className="text-[11px] p-1.5 rounded-lg bg-background border border-border flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate">{ref.name} ({ref.type})</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{ref.field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Table */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl border border-border bg-background space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">File Size</span>
                <p className="font-semibold text-foreground font-mono">{selectedItem.formattedSize}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-background space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">MIME Type</span>
                <p className="font-semibold text-foreground font-mono">{selectedItem.contentType}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-background space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Storage Key</span>
                <p className="font-semibold text-foreground font-mono truncate" title={selectedItem.key}>{selectedItem.key}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-background space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Upload Date</span>
                <p className="font-semibold text-foreground">{new Date(selectedItem.lastModified).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Quick Copy Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Quick Embed & Copy</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(selectedItem.url, selectedItem.key, 'url')}
                  className="flex-1 text-xs gap-1.5"
                >
                  {copiedKey === selectedItem.key && copiedType === 'url' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  Copy Public URL
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(`![${selectedItem.name}](${selectedItem.url})`, selectedItem.key, 'md')}
                  className="flex-1 text-xs gap-1.5"
                >
                  {copiedKey === selectedItem.key && copiedType === 'md' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  Copy Markdown
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(`<img src="${selectedItem.url}" alt="${selectedItem.name}" />`, selectedItem.key, 'html')}
                  className="flex-1 text-xs gap-1.5"
                >
                  {copiedKey === selectedItem.key && copiedType === 'html' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  Copy HTML Tag
                </Button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  const item = selectedItem;
                  setSelectedItem(null);
                  handleOpenDeleteDialog(item);
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <Trash2 size={13} />
                Delete File
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedItem.url, '_blank')}
                  className="gap-1 text-xs"
                >
                  <ExternalLink size={13} />
                  Open Original
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Safe Deletion Confirmation Dialog ── */}
      {deletingItem && (
        <Modal
          isOpen={Boolean(deletingItem)}
          onClose={() => { if (!isDeleting) setDeletingItem(null); }}
          title="Delete Media from Storage"
          subtitle={`Are you sure you want to permanently delete "${deletingItem.name}"?`}
        >
          <div className="space-y-4">
            {/* Warning if In Use */}
            {deleteUsageWarning?.inUse ? (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2.5">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                  <ShieldAlert size={16} />
                  <span>CRITICAL: Media File Is Actively Referenced</span>
                </div>
                <p className="text-xs text-foreground">
                  This image is currently used by <b>{deleteUsageWarning.references.length}</b> item(s) in your store (e.g. Products, Categories, or Banners). Deleting it will cause broken images on the live customer storefront.
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-background/60 p-2 rounded-xl border border-destructive/20">
                  {deleteUsageWarning.references.map((ref, idx) => (
                    <div key={idx} className="text-[11px] flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">• {ref.name}</span>
                      <span className="font-mono text-[10px]">{ref.field}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 pt-2 text-xs font-bold text-destructive cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={forceDeleteConfirmed}
                    onChange={(e) => setForceDeleteConfirmed(e.target.checked)}
                    className="rounded border-destructive text-destructive focus:ring-destructive"
                  />
                  I understand this image is in use and explicitly wish to force delete it.
                </label>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground flex items-center gap-2.5">
                <Info size={16} className="text-primary shrink-0" />
                <span>This asset will be permanently removed from Cloudflare R2 bucket <b>putimach-media</b>.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting || (deleteUsageWarning?.inUse && !forceDeleteConfirmed)}
                onClick={handleConfirmDelete}
                className="gap-1.5 font-bold"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting from R2...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    {deleteUsageWarning?.inUse ? 'Force Delete Asset' : 'Confirm Delete'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
