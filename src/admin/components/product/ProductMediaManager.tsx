'use client';
// @ts-nocheck
import React, { useState, useRef } from 'react';
import { 
  UploadCloud, Plus, Trash2, Star, ChevronLeft, ChevronRight, 
  Loader2, Image as ImageIcon, CheckCircle, ExternalLink, AlertCircle
} from 'lucide-react';
import { uploadImage } from '../../lib/uploadHelper';
import { cn } from '../../lib/utils';

interface ProductMediaManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  primaryImage?: string;
  onPrimaryChange?: (url: string) => void;
}

export const ProductMediaManager: React.FC<ProductMediaManagerProps> = ({
  images = [],
  onChange,
  primaryImage = '',
  onPrimaryChange
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: boolean }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine primary and extra images cleanly
  const allImages = Array.from(new Set([
    primaryImage,
    ...(Array.isArray(images) ? images : [])
  ].filter(Boolean)));

  const handleFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const fileList = Array.from(files);
    const newUploads = fileList.map((f, i) => ({
      id: `up-${Date.now()}-${i}`,
      name: f.name,
      progress: true
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const url = await uploadImage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      } catch (err: any) {
        console.error('Failed to upload file:', file.name, err);
        setErrorMsg(`Failed to upload ${file.name}: ${err?.message || 'Upload error'}`);
      } finally {
        setUploadingFiles(prev => prev.filter(u => u.name !== file.name));
      }
    }

    if (uploadedUrls.length > 0) {
      const updatedList = Array.from(new Set([...allImages, ...uploadedUrls]));
      onChange(updatedList);
      if ((!primaryImage || !allImages.includes(primaryImage)) && updatedList.length > 0) {
        onPrimaryChange?.(updatedList[0]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const setAsPrimary = (url: string) => {
    onPrimaryChange?.(url);
    const reordered = [url, ...allImages.filter(img => img !== url)];
    onChange(reordered);
  };

  const removeImage = (urlToRemove: string) => {
    const updated = allImages.filter(url => url !== urlToRemove);
    onChange(updated);
    if (primaryImage === urlToRemove) {
      onPrimaryChange?.(updated[0] || '');
    }
  };

  const moveImage = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allImages.length) return;
    const list = [...allImages];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    onChange(list);
    if (index === 0 || newIndex === 0) {
      onPrimaryChange?.(list[0]);
    }
  };

  return (
    <div className="space-y-4 min-w-0 w-full">
      {/* Header Info */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-2.5 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
            <span>Media</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
              {allImages.length} {allImages.length === 1 ? 'file' : 'files'}
            </span>
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Cloudflare R2 storage. First image is the primary cover image shown on product cards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus size={14} /> Add Media
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Dropzone & Media Grid */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed p-4 transition-all",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-card/50",
          allImages.length === 0 && uploadingFiles.length === 0 ? "py-10 text-center" : ""
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesUpload(e.target.files);
            e.target.value = '';
          }}
        />

        {allImages.length === 0 && uploadingFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Drag and drop images here, or browse</p>
              <p className="text-xs text-muted-foreground mt-0.5">Supports high-res JPG, PNG, WebP (auto-optimized)</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
            >
              Select Files
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Uploaded Images */}
            {allImages.map((url, idx) => {
              const isPrimary = idx === 0 || url === primaryImage;
              return (
                <div
                  key={`${url}-${idx}`}
                  className={cn(
                    "group relative aspect-square rounded-xl overflow-hidden border bg-muted/40 transition-all shadow-xs",
                    isPrimary ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
                  )}
                >
                  <img
                    src={url}
                    alt={`Product media ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Primary Badge */}
                  {isPrimary && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm text-white text-[10px] font-bold shadow-xs">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>PRIMARY</span>
                    </div>
                  )}

                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 z-20 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex items-center justify-between">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => setAsPrimary(url)}
                          title="Set as Primary Cover"
                          className="px-2 py-1 rounded bg-white/20 hover:bg-white/40 text-white text-[10px] font-bold backdrop-blur-sm transition-colors cursor-pointer"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        title="Delete Image"
                        className="ml-auto p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white backdrop-blur-sm transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Order buttons */}
                    <div className="flex items-center justify-between bg-black/40 rounded-lg p-1 text-white">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveImage(idx, -1)}
                        className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="text-[10px] font-mono font-bold">#{idx + 1}</span>
                      <button
                        type="button"
                        disabled={idx === allImages.length - 1}
                        onClick={() => moveImage(idx, 1)}
                        className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Currently uploading placeholders */}
            {uploadingFiles.map((item) => (
              <div
                key={item.id}
                className="aspect-square rounded-xl border border-border border-dashed bg-muted/60 flex flex-col items-center justify-center p-2 text-center"
              >
                <Loader2 size={20} className="animate-spin text-primary mb-1.5" />
                <span className="text-[10px] font-semibold text-muted-foreground truncate w-full px-1">
                  {item.name}
                </span>
                <span className="text-[9px] font-bold text-primary mt-0.5">Uploading...</span>
              </div>
            ))}

            {/* Add More Tile */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-border hover:border-primary bg-background/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Plus size={18} />
              <span className="text-[11px] font-bold">Add More</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
