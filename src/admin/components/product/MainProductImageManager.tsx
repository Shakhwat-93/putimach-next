'use client';
// @ts-nocheck
import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FolderOpen, Trash2, RefreshCw, CheckCircle2, 
  Sparkles, Image as ImageIcon, Loader2, Star, Eye
} from 'lucide-react';
import { uploadImage } from '../../lib/uploadHelper';
import { cleanImageUrl } from '@/lib/productMedia';
import { MediaPickerModal } from '../media/MediaPickerModal';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';

interface MainProductImageManagerProps {
  mainImage: string;
  onMainImageChange: (url: string) => void;
}

export const MainProductImageManager: React.FC<MainProductImageManagerProps> = ({
  mainImage,
  onMainImageChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cleanCurrentUrl = cleanImageUrl(mainImage) || '';

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        const clean = cleanImageUrl(url) || url;
        onMainImageChange(clean);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Main Product Image attached.',
          showConfirmButton: false,
          timer: 1800,
        });
      }
    } catch (err: any) {
      console.error('Failed to upload main product image:', err);
      Swal.fire({
        title: 'Upload Failed',
        text: err?.message || 'Could not upload image.',
        icon: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMediaPickerSelect = (selectedUrls: string[]) => {
    if (!selectedUrls || selectedUrls.length === 0) return;
    const clean = cleanImageUrl(selectedUrls[0]);
    if (clean) {
      onMainImageChange(clean);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Main Product Image selected from Media.',
        showConfirmButton: false,
        timer: 1800,
      });
    }
    setMediaPickerOpen(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    onMainImageChange('');
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Star size={15} className="fill-amber-500/30" />
            </span>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
              Main Product Image
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Primary / Default Cover
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
            This is the default primary cover image shown on catalog cards and as the <strong>#1 main photo</strong> in the gallery. It is <strong>independent of any color</strong>.
          </p>
        </div>

        {cleanCurrentUrl && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleRemove}
              className="text-[11px] font-bold text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Remove Main Image
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Main Image State Display */}
      {cleanCurrentUrl ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 sm:p-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-amber-500/[0.02] to-transparent">
          {/* Image Preview Box */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-border bg-white dark:bg-[#1C1613] shadow-sm shrink-0 group">
            <img
              src={cleanCurrentUrl}
              alt="Main Product Preview"
              className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute top-1.5 left-1.5 bg-[#1C1613]/80 text-[#C5A880] text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
              <Star size={10} className="fill-[#C5A880]" />
              <span>Cover</span>
            </div>
          </div>

          {/* Details & Action Buttons */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={15} />
              <span>Main Product Image Active</span>
            </div>

            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-lg bg-muted/40 p-1.5 rounded-lg border border-border/50">
              {cleanCurrentUrl}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 text-xs font-bold bg-background hover:bg-muted text-foreground border border-border rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} className="text-brand" />}
                <span>Replace with Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <FolderOpen size={13} />
                <span>Replace from Media Library</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Upload Dropzone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center gap-3",
            dragOver 
              ? "border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 scale-[0.99]" 
              : "border-border/80 bg-muted/10 hover:border-amber-500/50 hover:bg-muted/20"
          )}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            {isUploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Star size={22} className="fill-amber-500/30" />
            )}
          </div>

          <div className="space-y-1 max-w-sm">
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {isUploading ? 'Uploading Main Cover Photo...' : 'Add Main Product Image (Primary Cover)'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Drag & drop an image here, upload from your device, or choose from the existing Media Library.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold bg-[#1C1613] hover:bg-[#2A221E] text-white dark:bg-white dark:text-[#1C1613] rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <UploadCloud size={14} />
              <span>Upload New Image</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaPickerOpen(true)}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FolderOpen size={14} />
              <span>Select from Media Library</span>
            </button>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaPickerSelect}
        multiple={false}
      />
    </div>
  );
};
