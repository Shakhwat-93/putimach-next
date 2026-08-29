'use client';
// @ts-nocheck
import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, UploadCloud, Star, ChevronLeft, ChevronRight, 
  Loader2, Image as ImageIcon, X, Check, Sparkles, Palette, AlertCircle
} from 'lucide-react';
import { uploadImage } from '../../lib/uploadHelper';
import { cleanImageUrl } from '@/lib/productMedia';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';

interface ColorGalleryManagerProps {
  colors: string[];
  colorGalleries: Record<string, string[]>;
  onColorsChange: (colors: string[]) => void;
  onGalleriesChange: (galleries: Record<string, string[]>) => void;
}

const PRESET_COLORS = [
  'Black', 'Off White', 'Navy Blue', 'Maroon', 'Olive Green', 
  'Ash / Grey', 'Beige / Cream', 'Chocolate Brown', 'Pink', 'Sky Blue', 'Emerald Green'
];

export const ColorGalleryManager: React.FC<ColorGalleryManagerProps> = ({
  colors = [],
  colorGalleries = {},
  onColorsChange,
  onGalleriesChange,
}) => {
  const [newColorInput, setNewColorInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [uploadingState, setUploadingState] = useState<Record<string, number>>({}); // color -> count of uploading files
  const [dragOverColor, setDragOverColor] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Ensure unique colors
  const activeColors = Array.from(new Set(colors.map(c => c?.trim()).filter(Boolean)));

  const handleAddColor = (colorName: string) => {
    const trimmed = colorName?.trim();
    if (!trimmed) return;

    // Check if color already exists case-insensitively
    const exists = activeColors.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Color "${trimmed}" already exists.`,
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    const updatedColors = [...activeColors, trimmed];
    onColorsChange(updatedColors);

    // Initialize gallery if not present
    if (!colorGalleries[trimmed]) {
      onGalleriesChange({
        ...colorGalleries,
        [trimmed]: []
      });
    }

    setNewColorInput('');
    setIsAddingCustom(false);
  };

  const handleRemoveColor = (colorName: string) => {
    const updatedColors = activeColors.filter(c => c !== colorName);
    onColorsChange(updatedColors);

    const updatedGalleries = { ...colorGalleries };
    delete updatedGalleries[colorName];
    onGalleriesChange(updatedGalleries);
  };

  const handleFilesUpload = async (colorName: string, files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    setUploadingState(prev => ({
      ...prev,
      [colorName]: (prev[colorName] || 0) + fileList.length
    }));

    const uploadedUrls: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const url = await uploadImage(file);
        if (url) {
          const clean = cleanImageUrl(url);
          if (clean) uploadedUrls.push(clean);
        }
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: `Upload error for ${file.name}`,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        setUploadingState(prev => ({
          ...prev,
          [colorName]: Math.max(0, (prev[colorName] || 1) - 1)
        }));
      }
    }

    if (uploadedUrls.length > 0) {
      const currentList = Array.isArray(colorGalleries[colorName]) ? colorGalleries[colorName] : [];
      const updatedList = Array.from(new Set([...currentList, ...uploadedUrls]));
      onGalleriesChange({
        ...colorGalleries,
        [colorName]: updatedList
      });
    }
  };

  const handleDrop = (colorName: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColor(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(colorName, e.dataTransfer.files);
    }
  };

  const setAsPrimary = (colorName: string, url: string) => {
    const list = Array.isArray(colorGalleries[colorName]) ? [...colorGalleries[colorName]] : [];
    const reordered = [url, ...list.filter(item => item !== url)];
    onGalleriesChange({
      ...colorGalleries,
      [colorName]: reordered
    });
  };

  const removeImage = (colorName: string, urlToRemove: string) => {
    const list = Array.isArray(colorGalleries[colorName]) ? colorGalleries[colorName] : [];
    const updated = list.filter(u => u !== urlToRemove);
    onGalleriesChange({
      ...colorGalleries,
      [colorName]: updated
    });
  };

  const moveImage = (colorName: string, index: number, direction: number) => {
    const list = Array.isArray(colorGalleries[colorName]) ? [...colorGalleries[colorName]] : [];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    onGalleriesChange({
      ...colorGalleries,
      [colorName]: list
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
      {/* Header & Quick Add Color Bar */}
      <div className="bg-gradient-to-r from-amber-500/10 via-brand/5 to-transparent border border-amber-500/20 rounded-2xl p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 sm:gap-2">
              <Palette className="w-4 h-4 text-brand shrink-0" />
              <span>Multi-Color Product Galleries</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add colors and upload photos. On storefront, choosing a color displays its specific gallery.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isAddingCustom ? (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1C1613] text-white hover:bg-black transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus size={13} /> <span>Add Color</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="text"
                  value={newColorInput}
                  onChange={(e) => setNewColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddColor(newColorInput);
                    }
                  }}
                  placeholder="e.g. Royal Blue"
                  autoFocus
                  className="px-2.5 py-1 text-xs rounded-xl border border-border bg-background focus:ring-2 focus:ring-brand focus:outline-none w-32 sm:w-40"
                />
                <button
                  type="button"
                  onClick={() => handleAddColor(newColorInput)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand/90 cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingCustom(false); setNewColorInput(''); }}
                  className="p-1 rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preset Color Quick-Pick Chips */}
        <div className="mt-3 pt-2.5 border-t border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Quick Add Colors:
          </p>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {PRESET_COLORS.map((preset) => {
              const isAdded = activeColors.some(c => c.toLowerCase() === preset.toLowerCase());
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={isAdded}
                  onClick={() => handleAddColor(preset)}
                  className={cn(
                    "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                    isAdded 
                      ? "bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed"
                      : "bg-background/80 hover:bg-background border-border text-foreground hover:border-brand/60 active:scale-95"
                  )}
                >
                  {isAdded ? `✓ ${preset}` : `+ ${preset}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* No Colors Empty State */}
      {activeColors.length === 0 && (
        <div className="text-center py-8 px-3 border-2 border-dashed border-border rounded-2xl bg-card/40">
          <Palette className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-foreground">No colors added yet</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
            Click "+ Add Color" above to create colors and upload photos.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingCustom(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1C1613] text-white hover:bg-black transition-all cursor-pointer"
          >
            <Plus size={13} /> Add First Color
          </button>
        </div>
      )}

      {/* Color Cards List */}
      <div className="space-y-4">
        {activeColors.map((colorName) => {
          const gallery = Array.isArray(colorGalleries[colorName]) ? colorGalleries[colorName] : [];
          const isUploading = Boolean(uploadingState[colorName]);
          const isDragTarget = dragOverColor === colorName;

          return (
            <div
              key={colorName}
              onDragOver={(e) => { e.preventDefault(); setDragOverColor(colorName); }}
              onDragLeave={() => setDragOverColor(null)}
              onDrop={(e) => handleDrop(colorName, e)}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden bg-card shadow-xs",
                isDragTarget ? "border-brand ring-2 ring-brand/20 bg-brand/5" : "border-border hover:border-border/90"
              )}
            >
              {/* Color Header Bar */}
              <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3.5 h-3.5 rounded-full border border-border/80 shadow-xs shrink-0"
                    style={{
                      backgroundColor: colorName.toLowerCase().includes('black') ? '#1C1613' :
                        colorName.toLowerCase().includes('white') ? '#FFFFFF' :
                        colorName.toLowerCase().includes('red') ? '#DC2626' :
                        colorName.toLowerCase().includes('blue') ? '#2563EB' :
                        colorName.toLowerCase().includes('green') ? '#16A34A' :
                        colorName.toLowerCase().includes('pink') ? '#EC4899' :
                        colorName.toLowerCase().includes('grey') || colorName.toLowerCase().includes('ash') ? '#6B7280' :
                        colorName.toLowerCase().includes('brown') ? '#78350F' :
                        colorName.toLowerCase().includes('maroon') ? '#800000' :
                        colorName.toLowerCase().includes('beige') || colorName.toLowerCase().includes('cream') ? '#F5F5DC' :
                        '#D97706'
                    }}
                  />
                  <h4 className="font-bold text-xs sm:text-sm text-foreground truncate uppercase tracking-wider font-serif">
                    {colorName}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-background border border-border text-muted-foreground shrink-0">
                    {gallery.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Upload button for this color */}
                  <input
                    type="file"
                    ref={(el) => { fileInputRefs.current[colorName] = el; }}
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesUpload(colorName, e.target.files);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRefs.current[colorName]?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={12} />
                        <span className="hidden sm:inline">Upload Photos</span>
                        <span className="sm:hidden">Upload</span>
                      </>
                    )}
                  </button>

                  {/* Remove Color */}
                  <button
                    type="button"
                    onClick={() => {
                      Swal.fire({
                        title: `Delete "${colorName}"?`,
                        text: `This will remove the color and its ${gallery.length} photo(s).`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Delete',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#DC2626',
                        cancelButtonColor: '#6B7280',
                      }).then((res) => {
                        if (res.isConfirmed) {
                          handleRemoveColor(colorName);
                        }
                      });
                    }}
                    className="p-1 sm:p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title={`Delete ${colorName}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Photos Grid Container */}
              <div className="p-3 sm:p-5">
                {gallery.length === 0 ? (
                  <div 
                    onClick={() => fileInputRefs.current[colorName]?.click()}
                    className="py-6 px-3 text-center rounded-xl border-2 border-dashed border-border/80 hover:border-brand/60 bg-muted/20 hover:bg-brand/5 transition-all cursor-pointer group"
                  >
                    <ImageIcon className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-foreground">
                      No photos uploaded for {colorName}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                      Tap here to upload photos. Multiple images supported.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3.5">
                    {gallery.map((imgUrl, idx) => {
                      const isPrimary = idx === 0;

                      return (
                        <div
                          key={`${imgUrl}-${idx}`}
                          className={cn(
                            "group relative aspect-[3/4] rounded-xl overflow-hidden border bg-muted/30 transition-all select-none shadow-xs",
                            isPrimary ? "ring-2 ring-emerald-500 border-emerald-500" : "border-border hover:border-border/90"
                          )}
                        >
                          <img
                            src={imgUrl}
                            alt={`${colorName} photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />

                          {/* Primary Badge */}
                          {isPrimary ? (
                            <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-xs flex items-center gap-0.5">
                              <Star size={9} className="fill-white" />
                              <span className="hidden xs:inline">Primary</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAsPrimary(colorName, imgUrl)}
                              className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-black/75 hover:bg-emerald-600 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                            >
                              Set Primary
                            </button>
                          )}

                          {/* Reorder / Action Overlay Controls */}
                          <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(colorName, idx, -1)}
                                  className="p-1 rounded bg-white/25 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
                                  title="Move Left"
                                >
                                  <ChevronLeft size={11} />
                                </button>
                              )}
                              {idx < gallery.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(colorName, idx, 1)}
                                  className="p-1 rounded bg-white/25 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
                                  title="Move Right"
                                >
                                  <ChevronRight size={11} />
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeImage(colorName, imgUrl)}
                              className="p-1 rounded bg-red-500/85 hover:bg-red-600 text-white transition-colors cursor-pointer ml-auto"
                              title="Delete Photo"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add more photos tile */}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[colorName]?.click()}
                      className="aspect-[3/4] rounded-xl border-2 border-dashed border-border/80 hover:border-brand/60 bg-muted/20 hover:bg-brand/5 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 p-1"
                    >
                      <Plus size={16} />
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center">Add Photo</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ColorGalleryManager;
