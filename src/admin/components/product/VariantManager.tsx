'use client';
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Trash2, Layers, Check, Edit2, Sparkles, Image as ImageIcon, 
  ChevronDown, X, RefreshCw, SlidersHorizontal, CheckSquare, Square
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface VariantOption {
  name: string; // e.g. 'Color' | 'Size'
  values: string[]; // e.g. ['Black', 'White'] | ['S', 'M', 'L', 'XL']
}

export interface ProductVariantRow {
  id?: string;
  size?: string;
  color?: string;
  sku?: string;
  price?: number | string;
  original_price?: number | string;
  stock?: number;
  image_url?: string;
  barcode?: string;
  [key: string]: any;
}

interface VariantManagerProps {
  options: VariantOption[];
  onOptionsChange: (options: VariantOption[]) => void;
  variants: ProductVariantRow[];
  onVariantsChange: (variants: ProductVariantRow[]) => void;
  basePrice?: number | string;
  productSlug?: string;
  uploadedImages?: string[];
  colorImages?: Record<string, string>;
  onColorImagesChange?: (colorImages: Record<string, string>) => void;
}

const COMMON_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const NUMERIC_SIZES = ['28', '30', '32', '34', '36', '38', '40'];
const COMMON_COLORS = ['Black', 'Off White', 'Navy Blue', 'Ash/Grey', 'Pink', 'Chocolate Brown', 'Olive Green'];

export const VariantManager: React.FC<VariantManagerProps> = ({
  options = [],
  onOptionsChange,
  variants = [],
  onVariantsChange,
  basePrice = '',
  productSlug = 'PRODUCT',
  uploadedImages = [],
  colorImages = {},
  onColorImagesChange,
}) => {
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const [activeMediaPickerIndex, setActiveMediaPickerIndex] = useState<number | null>(null);
  const [newOptionInput, setNewOptionInput] = useState<{ name: string; value: string }>({ name: '', value: '' });

  // Bulk Edit Inputs
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkSkuPrefix, setBulkSkuPrefix] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const hasVariants = options.length > 0 && options.some(opt => opt.values.length > 0);

  // Generate Matrix Permutations from Options
  const regenerateMatrix = (currentOptions: VariantOption[], existingRows: ProductVariantRow[]) => {
    const validOptions = currentOptions.filter(o => o.values.length > 0);
    if (validOptions.length === 0) {
      onVariantsChange([]);
      return;
    }

    // Cartesian product of option values
    const combinations = validOptions.reduce<Record<string, string>[]>((acc, opt) => {
      if (acc.length === 0) {
        return opt.values.map(val => ({ [opt.name]: val }));
      }
      const newAcc: Record<string, string>[] = [];
      acc.forEach(existing => {
        opt.values.forEach(val => {
          newAcc.push({ ...existing, [opt.name]: val });
        });
      });
      return newAcc;
    }, []);

    const baseSkuClean = (productSlug || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '-');

    const newRows: ProductVariantRow[] = combinations.map(combo => {
      const colorVal = combo['Color'] || combo['color'] || '';
      const sizeVal = combo['Size'] || combo['size'] || '';
      
      // Look for existing row with same options to preserve stock / sku / image
      const matched = existingRows.find(r => 
        (r.color || '') === colorVal && (r.size || '') === sizeVal
      );

      const autoSkuParts = [baseSkuClean, colorVal ? colorVal.slice(0, 3).toUpperCase() : '', sizeVal].filter(Boolean);
      const autoSku = autoSkuParts.join('-');

      return {
        size: sizeVal,
        color: colorVal,
        sku: matched?.sku || autoSku,
        price: matched?.price !== undefined ? matched.price : basePrice,
        stock: matched?.stock !== undefined ? matched.stock : 10,
        image_url: matched?.image_url || colorImages[colorVal] || '',
        barcode: matched?.barcode || '',
        ...combo
      };
    });

    onVariantsChange(newRows);
  };

  const handleAddOptionCategory = (optionName: string) => {
    if (options.some(o => o.name.toLowerCase() === optionName.toLowerCase())) return;
    const updated = [...options, { name: optionName, values: [] }];
    onOptionsChange(updated);
  };

  const handleAddValueToOption = (optionIndex: number, rawVal: string) => {
    const trimmed = rawVal.trim();
    if (!trimmed) return;
    const opt = options[optionIndex];
    if (opt.values.map(v => v.toLowerCase()).includes(trimmed.toLowerCase())) return;

    const updatedOptions = [...options];
    updatedOptions[optionIndex] = {
      ...opt,
      values: [...opt.values, trimmed]
    };
    onOptionsChange(updatedOptions);
    regenerateMatrix(updatedOptions, variants);
  };

  const handleRemoveValueFromOption = (optionIndex: number, valueToRemove: string) => {
    const opt = options[optionIndex];
    const updatedValues = opt.values.filter(v => v !== valueToRemove);
    const updatedOptions = [...options];
    
    if (updatedValues.length === 0 && options.length > 1) {
      updatedOptions.splice(optionIndex, 1);
    } else {
      updatedOptions[optionIndex] = { ...opt, values: updatedValues };
    }

    onOptionsChange(updatedOptions);
    regenerateMatrix(updatedOptions, variants);

    // If color was removed, also update color_images map
    if (opt.name.toLowerCase() === 'color' && colorImages[valueToRemove]) {
      const updatedColorImages = { ...colorImages };
      delete updatedColorImages[valueToRemove];
      onColorImagesChange?.(updatedColorImages);
    }
  };

  const handleRemoveOption = (optionIndex: number) => {
    const updatedOptions = options.filter((_, i) => i !== optionIndex);
    onOptionsChange(updatedOptions);
    regenerateMatrix(updatedOptions, variants);
  };

  const handleRowChange = (index: number, field: keyof ProductVariantRow, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onVariantsChange(updated);

    // If image changed on a color variant, update colorImages map
    if (field === 'image_url' && updated[index].color && onColorImagesChange) {
      onColorImagesChange({
        ...colorImages,
        [updated[index].color]: value
      });
    }
  };

  const handleDeleteVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    onVariantsChange(updated);
  };

  // Bulk Edit Actions
  const handleSelectAll = () => {
    if (selectedVariantIds.length === variants.length) {
      setSelectedVariantIds([]);
    } else {
      setSelectedVariantIds(variants.map((_, i) => i));
    }
  };

  const handleApplyBulk = () => {
    if (selectedVariantIds.length === 0) return;
    const updated = [...variants];

    selectedVariantIds.forEach(idx => {
      if (bulkPrice !== '') updated[idx].price = Number(bulkPrice);
      if (bulkStock !== '') updated[idx].stock = Number(bulkStock);
      if (bulkSkuPrefix !== '') {
        const color = updated[idx].color || '';
        const size = updated[idx].size || '';
        updated[idx].sku = `${bulkSkuPrefix}-${color ? color.slice(0, 3).toUpperCase() : ''}-${size}`;
      }
    });

    onVariantsChange(updated);
    setSelectedVariantIds([]);
    setIsBulkOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Variants & Matrix</span>
            {variants.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                {variants.length} combinations
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add size, color, or material options to automatically generate variant matrices with individual stock and SKU.
          </p>
        </div>

        {options.length === 0 && (
          <button
            type="button"
            onClick={() => handleAddOptionCategory('Size')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Options (Size, Color)
          </button>
        )}
      </div>

      {/* Options Builder Cards */}
      {options.length > 0 && (
        <div className="space-y-3">
          {options.map((opt, optIdx) => (
            <div key={opt.name} className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Option {optIdx + 1}: {opt.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(optIdx)}
                  className="text-xs text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                  title="Remove this option"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {opt.values.map(val => (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-secondary text-foreground border border-border/80 shadow-2xs"
                  >
                    {opt.name.toLowerCase() === 'color' && (
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: val.toLowerCase().replace(/\s+/g, '') }}
                      />
                    )}
                    <span>{val}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveValueFromOption(optIdx, val)}
                      className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {/* Inline Value Input */}
                <input
                  type="text"
                  placeholder={`+ Add ${opt.name} (press Enter)`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddValueToOption(optIdx, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="h-8 min-w-[140px] px-2.5 rounded-lg border border-dashed border-input bg-background text-xs font-medium focus:border-primary outline-none"
                />
              </div>

              {/* Quick Presets */}
              {opt.name.toLowerCase() === 'size' && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground flex-wrap">
                  <span className="font-semibold">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() => COMMON_SIZES.forEach(s => handleAddValueToOption(optIdx, s))}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-secondary text-foreground font-bold transition-colors cursor-pointer"
                  >
                    Clothing (S - 3XL)
                  </button>
                  <button
                    type="button"
                    onClick={() => NUMERIC_SIZES.forEach(s => handleAddValueToOption(optIdx, s))}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-secondary text-foreground font-bold transition-colors cursor-pointer"
                  >
                    Waist (28 - 40)
                  </button>
                </div>
              )}

              {opt.name.toLowerCase() === 'color' && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground flex-wrap">
                  <span className="font-semibold">Quick colors:</span>
                  {COMMON_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleAddValueToOption(optIdx, c)}
                      className="px-2 py-0.5 rounded bg-muted hover:bg-secondary text-foreground font-medium transition-colors cursor-pointer"
                    >
                      +{c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Add Another Option Button */}
          {options.length < 3 && (
            <div className="flex items-center gap-2 pt-1">
              {!options.some(o => o.name.toLowerCase() === 'color') && (
                <button
                  type="button"
                  onClick={() => handleAddOptionCategory('Color')}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-border hover:border-primary bg-background text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  + Add Color Option
                </button>
              )}
              {!options.some(o => o.name.toLowerCase() === 'size') && (
                <button
                  type="button"
                  onClick={() => handleAddOptionCategory('Size')}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-border hover:border-primary bg-background text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  + Add Size Option
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const name = prompt('Enter custom option name (e.g. Material, Fit, Style):');
                  if (name) handleAddOptionCategory(name);
                }}
                className="px-3 py-1.5 rounded-xl border border-dashed border-border hover:border-primary bg-background text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                + Custom Option
              </button>
            </div>
          )}
        </div>
      )}

      {/* Variant Matrix Table & Bulk Actions */}
      {variants.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-0">
          {/* Bulk Actions Bar */}
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary cursor-pointer"
              >
                {selectedVariantIds.length === variants.length ? (
                  <CheckSquare size={15} className="text-primary" />
                ) : (
                  <Square size={15} className="text-muted-foreground" />
                )}
                <span>Select All ({variants.length})</span>
              </button>

              {selectedVariantIds.length > 0 && (
                <span className="text-muted-foreground font-semibold">
                  • {selectedVariantIds.length} selected
                </span>
              )}
            </div>

            {selectedVariantIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(!isBulkOpen)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-2xs cursor-pointer"
                >
                  <SlidersHorizontal size={12} />
                  <span>Bulk Edit</span>
                </button>
              </div>
            )}
          </div>

          {/* Bulk Edit Drawer */}
          {isBulkOpen && selectedVariantIds.length > 0 && (
            <div className="p-3 bg-primary/5 border-b border-primary/20 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">Set Price:</span>
                <input
                  type="number"
                  placeholder="৳"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  className="h-8 w-24 px-2 rounded-lg border border-input bg-background text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">Set Stock:</span>
                <input
                  type="number"
                  placeholder="Qty"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  className="h-8 w-20 px-2 rounded-lg border border-input bg-background text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">SKU Prefix:</span>
                <input
                  type="text"
                  placeholder="e.g. RR-HOOD"
                  value={bulkSkuPrefix}
                  onChange={(e) => setBulkSkuPrefix(e.target.value)}
                  className="h-8 w-28 px-2 rounded-lg border border-input bg-background text-xs font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyBulk}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-2xs cursor-pointer ml-auto"
              >
                Apply to {selectedVariantIds.length} Variants
              </button>
            </div>
          )}

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="px-3 py-2.5 w-8">#</th>
                  <th className="px-3 py-2.5 w-12">Photo</th>
                  <th className="px-3 py-2.5">Variant</th>
                  <th className="px-3 py-2.5">Price (৳)</th>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5 w-24">Stock</th>
                  <th className="px-3 py-2.5 text-right w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {variants.map((v, idx) => {
                  const isSelected = selectedVariantIds.includes(idx);
                  return (
                    <tr key={idx} className={cn("hover:bg-muted/20 transition-colors", isSelected ? "bg-primary/5" : "")}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedVariantIds(prev => 
                              prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                            );
                          }}
                          className="rounded border-input text-primary h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Photo Picker */}
                      <td className="px-3 py-2">
                        <div
                          onClick={() => setActiveMediaPickerIndex(idx)}
                          className="w-8 h-8 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative group"
                          title="Assign image"
                        >
                          {v.image_url ? (
                            <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={14} className="text-muted-foreground group-hover:text-primary" />
                          )}
                        </div>
                      </td>

                      {/* Variant Name */}
                      <td className="px-3 py-2 font-bold text-foreground">
                        <span>{[v.color, v.size].filter(Boolean).join(' / ') || `Variant #${idx + 1}`}</span>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={v.price !== undefined ? v.price : basePrice}
                          onChange={(e) => handleRowChange(idx, 'price', Number(e.target.value) || 0)}
                          placeholder="Price"
                          className="h-7 w-24 px-2 rounded-md border border-input bg-background text-xs font-mono font-bold"
                        />
                      </td>

                      {/* SKU */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={v.sku || ''}
                          onChange={(e) => handleRowChange(idx, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="h-7 w-36 px-2 rounded-md border border-input bg-background text-xs font-mono"
                        />
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={v.stock !== undefined ? v.stock : 0}
                          onChange={(e) => handleRowChange(idx, 'stock', Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-7 w-20 px-2 rounded-md border border-input bg-background text-xs font-mono font-bold"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(idx)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                          title="Remove variant"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Picker Modal for Variant */}
      {activeMediaPickerIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Select Variant Photo</h4>
              <button
                type="button"
                onClick={() => setActiveMediaPickerIndex(null)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {uploadedImages.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No product images uploaded yet. Upload images in the Media section first.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto p-1">
                {uploadedImages.map((imgUrl, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      handleRowChange(activeMediaPickerIndex, 'image_url', imgUrl);
                      setActiveMediaPickerIndex(null);
                    }}
                    className={cn(
                      "aspect-square rounded-xl border overflow-hidden cursor-pointer hover:border-primary hover:scale-105 transition-all",
                      variants[activeMediaPickerIndex]?.image_url === imgUrl 
                        ? "border-primary ring-2 ring-primary/40" 
                        : "border-border"
                    )}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  handleRowChange(activeMediaPickerIndex, 'image_url', '');
                  setActiveMediaPickerIndex(null);
                }}
                className="text-xs font-semibold text-destructive hover:underline cursor-pointer"
              >
                Clear Photo
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaPickerIndex(null)}
                className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
