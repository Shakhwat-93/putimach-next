'use client';
import React, { useState, useRef } from 'react';
import { 
  Upload, Image as ImageIcon, Trash2, ExternalLink, Loader2, Plus, Sparkles 
} from 'lucide-react';
import { MediaPickerModal } from './MediaPickerModal';
import { uploadImage } from '../../lib/uploadHelper';
import { cleanImageUrl } from '@/lib/productMedia';
import { cn } from '../../lib/utils';

export interface MediaPickerInputProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  className?: string;
  showUrlInput?: boolean;
  aspectRatio?: 'square' | 'video' | 'banner' | 'auto';
  title?: string;
}

export const MediaPickerInput: React.FC<MediaPickerInputProps> = ({
  label,
  value = '',
  onChange,
  placeholder = 'https://media.putimach.com/...',
  required = false,
  helperText,
  className,
  showUrlInput = true,
  aspectRatio = 'square',
  title = 'Select Image from Media Library'
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanVal = cleanImageUrl(value);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      if (url) {
        const cleaned = cleanImageUrl(url);
        onChange(cleaned || url);
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleMediaModalSelect = (selectedUrls: string[]) => {
    if (selectedUrls.length > 0) {
      const clean = cleanImageUrl(selectedUrls[0]);
      onChange(clean || selectedUrls[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  };

  const aspectClass = 
    aspectRatio === 'video' ? 'aspect-video' :
    aspectRatio === 'banner' ? 'aspect-[21/9]' :
    aspectRatio === 'auto' ? 'h-auto max-h-48' : 'aspect-square';

  return (
    <div className={cn("space-y-2 w-full min-w-0", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs sm:text-sm font-bold text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </label>
          {cleanVal && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-semibold text-destructive hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      {/* Preview Card or Upload Action Container */}
      {cleanVal ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl border border-border bg-card/60 shadow-2xs">
          {/* Thumbnail */}
          <div className={cn("relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#F7F4EE] border border-border shrink-0 flex items-center justify-center p-1", aspectClass)}>
            <img
              src={cleanVal}
              alt="Selected Preview"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              className="w-full h-full object-contain rounded-lg drop-shadow-2xs"
            />
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
              <span className="font-bold text-foreground truncate">{cleanVal.split('/').pop() || cleanVal}</span>
            </div>

            {showUrlInput && (
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-8 px-2.5 rounded-lg bg-background border border-input text-xs font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            )}

            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
              >
                <ImageIcon size={13} />
                <span>Select from Media</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    <span>Upload New</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {showUrlInput && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="flex-1 h-9 px-3 rounded-xl bg-background border border-input text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border shadow-2xs transition-all cursor-pointer"
            >
              <ImageIcon size={14} className="text-primary" />
              <span>Select from Media</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-all cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Upload New</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-destructive font-medium">{uploadError}</p>
      )}

      {helperText && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleMediaModalSelect}
        multiple={false}
        initialSelectedUrls={cleanVal ? [cleanVal] : []}
        title={title}
      />
    </div>
  );
};
