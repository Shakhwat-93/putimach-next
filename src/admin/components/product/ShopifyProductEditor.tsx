'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Save, ArrowLeft, Plus, Trash2, Eye, Sparkles, Copy, Check,
  Layers, Package, Globe, Tag, ChevronDown, ChevronRight, Sliders,
  HelpCircle, AlertTriangle, Loader2, CheckCircle2, RotateCcw,
  Store, Truck, ShieldCheck, Video, ExternalLink
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { ProductMediaManager } from './ProductMediaManager';
import { VariantManager, VariantOption, ProductVariantRow } from './VariantManager';
import { ProductSeoPreview } from './ProductSeoPreview';
import { Button } from '../Button';
import { Card } from '../Card';
import { Switch } from '../ui/switch';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  current_stock: number;
}

interface ShopifyProductEditorProps {
  initialProduct?: any;
  categories: CategoryItem[];
  inventoryItems?: InventoryItem[];
  onSave: (productData: any, isDraft?: boolean) => Promise<void>;
  onCancel: () => void;
  onDuplicate?: (productData: any) => void;
  onQuickAddCategory?: (name: string) => Promise<CategoryItem | null>;
  isSaving?: boolean;
}

const defaultSizeGuide = {
  columns: ['Size', 'Waist', 'Hips', 'Length', 'Leg Opening', 'Rise'],
  rows: [
    { 'Size': '28', 'Waist': '28', 'Hips': '36', 'Length': '42', 'Leg Opening': '16', 'Rise': '10' },
    { 'Size': '30', 'Waist': '30', 'Hips': '38', 'Length': '42', 'Leg Opening': '16.5', 'Rise': '10.5' },
    { 'Size': '32', 'Waist': '32', 'Hips': '40', 'Length': '43', 'Leg Opening': '17', 'Rise': '11' },
    { 'Size': '34', 'Waist': '34', 'Hips': '42', 'Length': '43', 'Leg Opening': '17.5', 'Rise': '11.5' },
    { 'Size': '36', 'Waist': '36', 'Hips': '44', 'Length': '44', 'Leg Opening': '18', 'Rise': '12' },
  ],
  material: 'Cotton 100%'
};

export const ShopifyProductEditor: React.FC<ShopifyProductEditorProps> = ({
  initialProduct = null,
  categories = [],
  inventoryItems = [],
  onSave,
  onCancel,
  onDuplicate,
  onQuickAddCategory,
  isSaving = false
}) => {
  const isEditMode = Boolean(initialProduct && (initialProduct.id || initialProduct.slug));

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugAuto, setIsSlugAuto] = useState(true);
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<string | number>('');
  const [compareAtPrice, setCompareAtPrice] = useState<string | number>('');
  const [costPerItem, setCostPerItem] = useState<string | number>('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [trackInventory, setTrackInventory] = useState(true);
  const [continueSellingOutOfStock, setContinueSellingOutOfStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState<number | string>(10);
  const [inventoryId, setInventoryId] = useState('');

  // Media
  const [primaryImage, setPrimaryImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [colorImages, setColorImages] = useState<Record<string, string>>({});

  // Variants & Options
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variants, setVariants] = useState<ProductVariantRow[]>([]);

  // Shipping
  const [isPhysicalProduct, setIsPhysicalProduct] = useState(true);
  const [shippingWeight, setShippingWeight] = useState<string | number>('');
  const [shippingWeightUnit, setShippingWeightUnit] = useState('kg');
  const [countryOfOrigin, setCountryOfOrigin] = useState('Bangladesh');
  const [hsCode, setHsCode] = useState('');

  // Organization & Meta
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [badge, setBadge] = useState('');
  const [productType, setProductType] = useState('Apparel');
  const [vendor, setVendor] = useState('Rust & Revive');
  const [collections, setCollections] = useState<string[]>(['All Products']);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [features, setFeatures] = useState('100% Premium Cotton, Oversized Fit, Garment Washed');
  const [material, setMaterial] = useState('Cotton 100%');
  const [sizeGuide, setSizeGuide] = useState(defaultSizeGuide);

  // SEO & Metafields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoHandle, setSeoHandle] = useState('');
  const [instagramVideoUrl, setInstagramVideoUrl] = useState('');
  const [themeTemplate, setThemeTemplate] = useState('Default product');

  // Change Tracker & UI States
  const [isDirty, setIsDirty] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Helper Slug Generator
  const generateSlug = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Populate initial data on Mount / Edit Mode
  useEffect(() => {
    if (initialProduct) {
      setTitle(initialProduct.name || initialProduct.title || '');
      setSlug(initialProduct.slug || initialProduct.id || '');
      setIsSlugAuto(false);
      setDescription(initialProduct.description || '');
      setLongDescription(initialProduct.long_description || initialProduct.description || '');
      setCategory(initialProduct.category || (categories[0]?.slug || ''));
      setPrice(initialProduct.price !== undefined ? initialProduct.price : '');
      setCompareAtPrice(initialProduct.original_price || initialProduct.compare_at_price || '');
      setCostPerItem(initialProduct.cost_per_item || '');
      setSku(initialProduct.sku || '');
      setBarcode(initialProduct.barcode || '');
      setTrackInventory(initialProduct.track_inventory !== false);
      setContinueSellingOutOfStock(Boolean(initialProduct.continue_selling_out_of_stock));
      setStockQuantity(initialProduct.stock !== undefined ? initialProduct.stock : 10);
      setInventoryId(initialProduct.inventory_id || '');

      setPrimaryImage(initialProduct.image || (Array.isArray(initialProduct.images) ? initialProduct.images[0] : ''));
      setImages(Array.isArray(initialProduct.images) ? initialProduct.images : (initialProduct.image ? [initialProduct.image] : []));
      setColorImages(initialProduct.color_images || {});

      // Parse existing variants and options
      const existingVariants: ProductVariantRow[] = Array.isArray(initialProduct.variants) ? initialProduct.variants : [];
      setVariants(existingVariants);

      if (existingVariants.length > 0) {
        const detectedSizes = Array.from(new Set(existingVariants.map(v => v.size).filter(Boolean)));
        const detectedColors = Array.from(new Set(existingVariants.map(v => v.color).filter(Boolean)));
        const opts: VariantOption[] = [];
        if (detectedColors.length > 0) opts.push({ name: 'Color', values: detectedColors });
        if (detectedSizes.length > 0) opts.push({ name: 'Size', values: detectedSizes });
        setVariantOptions(opts);
      } else if (initialProduct.sizes || initialProduct.colors) {
        const rawSizes = Array.isArray(initialProduct.sizes) ? initialProduct.sizes : (typeof initialProduct.sizes === 'string' ? initialProduct.sizes.split(',').map(s => s.trim()).filter(Boolean) : []);
        const rawColors = Array.isArray(initialProduct.colors) ? initialProduct.colors : (typeof initialProduct.colors === 'string' ? initialProduct.colors.split(',').map(c => c.trim()).filter(Boolean) : []);
        const opts: VariantOption[] = [];
        if (rawColors.length > 0) opts.push({ name: 'Color', values: rawColors });
        if (rawSizes.length > 0) opts.push({ name: 'Size', values: rawSizes });
        setVariantOptions(opts);
      }

      setIsPhysicalProduct(initialProduct.is_physical !== false);
      setShippingWeight(initialProduct.shipping_weight || '');
      setShippingWeightUnit(initialProduct.shipping_weight_unit || 'kg');
      setCountryOfOrigin(initialProduct.country_of_origin || 'Bangladesh');
      setHsCode(initialProduct.hs_code || '');

      setStatus(initialProduct.status || (initialProduct.in_stock === false ? 'draft' : 'active'));
      setBadge(initialProduct.badge || '');
      setProductType(initialProduct.product_type || 'Apparel');
      setVendor(initialProduct.vendor || 'Rust & Revive');
      setCollections(Array.isArray(initialProduct.collections) ? initialProduct.collections : ['All Products']);
      setTags(Array.isArray(initialProduct.tags) ? initialProduct.tags : []);
      setFeatures(Array.isArray(initialProduct.features) ? initialProduct.features.join(', ') : (initialProduct.features || ''));
      setMaterial(initialProduct.material || 'Cotton 100%');
      setSizeGuide(initialProduct.size_guide && typeof initialProduct.size_guide === 'object' ? initialProduct.size_guide : defaultSizeGuide);

      setSeoTitle(initialProduct.seo_title || '');
      setSeoDescription(initialProduct.seo_description || '');
      setSeoHandle(initialProduct.seo_handle || '');
      setInstagramVideoUrl(initialProduct.instagram_video_url || initialProduct.metafields?.instagram_video || '');
      setThemeTemplate(initialProduct.template || 'Default product');
    } else {
      // Default Add Mode
      setCategory(categories[0]?.slug || '');
      setVariantOptions([
        { name: 'Color', values: ['Black', 'Off White'] },
        { name: 'Size', values: ['S', 'M', 'L', 'XL'] }
      ]);
    }
  }, [initialProduct, categories]);

  // Title change with auto-slug
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setIsDirty(true);
    if (isSlugAuto || !slug) {
      setSlug(generateSlug(val));
    }
  };

  // Profit / Margin Calculation Preview
  const profitMetrics = useMemo(() => {
    const p = Number(price) || 0;
    const c = Number(costPerItem) || 0;
    if (p <= 0 || c <= 0) return null;
    const profit = p - c;
    const margin = Math.round((profit / p) * 100);
    return { profit, margin };
  }, [price, costPerItem]);

  // Tag Management
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setIsDirty(true);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
    setIsDirty(true);
  };

  // Quick Add Category
  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed || !onQuickAddCategory) return;
    try {
      const created = await onQuickAddCategory(trimmed);
      if (created) {
        setCategory(created.slug);
        setNewCatName('');
        setQuickCatOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Validation & Execution
  const handleSubmit = async (e?: React.FormEvent, overrideDraft = false) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      Swal.fire({
        title: 'Title Required',
        text: 'Please enter a product title.',
        icon: 'warning',
        confirmButtonColor: '#0F172A'
      });
      return;
    }

    if (price === '' || Number(price) < 0) {
      Swal.fire({
        title: 'Price Required',
        text: 'Please enter a valid selling price.',
        icon: 'warning',
        confirmButtonColor: '#0F172A'
      });
      return;
    }

    const finalSlug = slug.trim() || generateSlug(title) || 'product-' + Date.now();
    const finalStatus = overrideDraft ? 'draft' : status;

    // Build unique sizes and colors array
    const extractedColors = Array.from(new Set([
      ...variantOptions.find(o => o.name.toLowerCase() === 'color')?.values || [],
      ...variants.map(v => v.color).filter(Boolean)
    ]));

    const extractedSizes = Array.from(new Set([
      ...variantOptions.find(o => o.name.toLowerCase() === 'size')?.values || [],
      ...variants.map(v => v.size).filter(Boolean)
    ]));

    // Synchronize variant images with color_images map
    const finalColorImages = { ...colorImages };
    variants.forEach(v => {
      if (v.color && v.image_url && !finalColorImages[v.color]) {
        finalColorImages[v.color] = v.image_url;
      }
    });

    const totalStock = variants.length > 0
      ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
      : Number(stockQuantity) || 0;

    const payload = {
      name: title.trim(),
      slug: finalSlug,
      category: category || categories[0]?.slug || 'uncategorized',
      price: Number(price) || 0,
      original_price: compareAtPrice ? Number(compareAtPrice) : null,
      cost_per_item: costPerItem ? Number(costPerItem) : null,
      sku: sku || (variants.length > 0 ? variants[0]?.sku : `RR-${finalSlug.toUpperCase().slice(0, 8)}`),
      barcode: barcode || null,
      badge: badge || null,
      image: primaryImage || (images.length > 0 ? images[0] : ''),
      images: Array.from(new Set([primaryImage, ...images].filter(Boolean))),
      color_images: finalColorImages,
      size_guide: sizeGuide,
      features: features ? features.split(',').map(f => f.trim()).filter(Boolean) : [],
      material: material || 'Cotton 100%',
      variants: variants.map(v => ({
        ...v,
        price: v.price !== undefined ? Number(v.price) : Number(price),
        stock: v.stock !== undefined ? Number(v.stock) : 0,
        sku: v.sku || `${finalSlug.toUpperCase()}-${v.color || 'STD'}-${v.size || 'STD'}`
      })),
      description: description || title,
      long_description: longDescription || description || title,
      in_stock: finalStatus === 'active' ? totalStock > 0 : false,
      status: finalStatus,
      sizes: extractedSizes,
      colors: extractedColors,
      inventory_id: inventoryId || null,
      is_physical: isPhysicalProduct,
      shipping_weight: shippingWeight ? Number(shippingWeight) : null,
      shipping_weight_unit: shippingWeightUnit,
      country_of_origin: countryOfOrigin,
      hs_code: hsCode || null,
      product_type: productType,
      vendor: vendor,
      collections: collections,
      tags: tags,
      seo_title: seoTitle || title,
      seo_description: seoDescription || description,
      seo_handle: seoHandle || finalSlug,
      instagram_video_url: instagramVideoUrl || null,
      metafields: {
        instagram_video: instagramVideoUrl || null
      },
      template: themeTemplate,
      track_inventory: trackInventory,
      continue_selling_out_of_stock: continueSellingOutOfStock,
      updated_at: new Date().toISOString()
    };

    try {
      await onSave(payload, overrideDraft);
      setIsDirty(false);
    } catch (err: any) {
      console.error('Failed to save product:', err);
    }
  };

  const handleCancelWithCheck = () => {
    if (isDirty) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved product changes. Are you sure you want to discard them?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Discard Changes',
        cancelButtonText: 'Stay & Continue',
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#0F172A'
      }).then((result) => {
        if (result.isConfirmed) {
          onCancel();
        }
      });
    } else {
      onCancel();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-12 sm:pb-16 px-1 sm:px-2 md:px-4 min-w-0">
      {/* ── Top Header Navigation & Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border/80 pb-4 min-w-0">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleCancelWithCheck}
            className="w-9 h-9 shrink-0 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs mt-0.5 sm:mt-0"
            title="Back to products list"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground font-display truncate">
                {isEditMode ? (title || 'Edit Product') : 'Add Product'}
              </h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold capitalize shrink-0",
                status === 'active' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                status === 'draft' ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" :
                "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              )}>
                {status}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
              {isEditMode ? `Editing product ID: #${initialProduct?.id || initialProduct?.slug}` : 'Create a fast, high-converting product listing with live variant synchronization.'}
            </p>
          </div>
        </div>

        {/* Top Quick Actions (Responsive) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto">
          {isEditMode && onDuplicate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(initialProduct)}
              className="rounded-xl text-xs font-bold gap-1 px-2.5 sm:px-3 h-8 sm:h-9"
            >
              <Copy size={12} />
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelWithCheck}
            className="rounded-xl text-xs font-semibold px-2.5 sm:px-3 h-8 sm:h-9"
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSubmit(undefined, false)}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm px-3 sm:px-4 h-8 sm:h-9"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* ── Two-Column Main Responsive Grid (Stacks cleanly below 1280px) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start w-full min-w-0">
        
        {/* ── LEFT MAIN COLUMN (~67% on XL, 100% on Mobile/Tablet) ── */}
        <div className="col-span-1 xl:col-span-8 space-y-5 sm:space-y-6 min-w-0 w-full">

          {/* 1. PRODUCT INFORMATION */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs min-w-0 w-full">
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Heavyweight Boxy Hoodie, Vintage Washed Cargo"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full h-10 sm:h-11 px-3.5 rounded-xl border border-input bg-background text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>

            {/* URL Slug & Handle */}
            <div className="space-y-1.5 pt-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <label className="font-bold text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Globe size={13} />
                  <span>URL Handle / Slug</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSlug(generateSlug(title));
                      setIsSlugAuto(true);
                      setIsDirty(true);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Auto Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://putimach.com/product/${slug}`);
                      setCopiedSlug(true);
                      setTimeout(() => setCopiedSlug(false), 2000);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSlug ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedSlug ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center rounded-xl border border-input bg-muted/30 px-3 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 min-w-0">
                <span className="text-xs font-mono text-muted-foreground shrink-0 select-none">/product/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value));
                    setIsSlugAuto(false);
                    setIsDirty(true);
                  }}
                  placeholder="heavyweight-boxy-hoodie"
                  className="w-full h-9 px-1 bg-transparent text-xs font-mono text-foreground outline-none min-w-0"
                />
              </div>
            </div>
          </div>

          {/* 2. DESCRIPTION (Rich Text) */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs min-w-0 w-full">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Product Description & Highlights
              </label>
              <span className="text-[11px] text-muted-foreground">WYSIWYG Rich Text</span>
            </div>
            <RichTextEditor
              value={longDescription}
              onChange={(val) => {
                setLongDescription(val);
                setDescription(val.replace(/<[^>]*>?/gm, '').slice(0, 180));
                setIsDirty(true);
              }}
              minHeight="160px"
            />
          </div>

          {/* 3. MEDIA (Cloudflare R2) */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs min-w-0 w-full">
            <ProductMediaManager
              primaryImage={primaryImage}
              onPrimaryChange={(url) => {
                setPrimaryImage(url);
                setIsDirty(true);
              }}
              images={images}
              onChange={(imgs) => {
                setImages(imgs);
                if (!primaryImage && imgs.length > 0) setPrimaryImage(imgs[0]);
                setIsDirty(true);
              }}
            />
          </div>

          {/* 4. PRICING & COST */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs min-w-0 w-full">
            <div>
              <h3 className="text-sm font-bold text-foreground">Pricing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Configure selling price, compare-at strike price, and cost analysis.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Selling Price */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-foreground">
                  Price (BDT) <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-muted-foreground select-none">৳</span>
                  <input
                    type="number"
                    placeholder="1,500"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); setIsDirty(true); }}
                    className="w-full h-10 pl-7 pr-3 rounded-xl border border-input bg-background text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              {/* Compare-at Price */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Compare-at Price</label>
                  {compareAtPrice && Number(compareAtPrice) > Number(price) && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Save {Math.round(((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100)}%
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-muted-foreground select-none">৳</span>
                  <input
                    type="number"
                    placeholder="1,900"
                    value={compareAtPrice}
                    onChange={(e) => { setCompareAtPrice(e.target.value); setIsDirty(true); }}
                    className="w-full h-10 pl-7 pr-3 rounded-xl border border-input bg-background text-sm font-mono text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 line-through"
                  />
                </div>
              </div>

              {/* Cost per item */}
              <div className="space-y-1.5 min-w-0 sm:col-span-2 md:col-span-1">
                <label className="text-xs font-bold text-foreground">Cost per item (Optional)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-muted-foreground select-none">৳</span>
                  <input
                    type="number"
                    placeholder="750"
                    value={costPerItem}
                    onChange={(e) => { setCostPerItem(e.target.value); setIsDirty(true); }}
                    className="w-full h-10 pl-7 pr-3 rounded-xl border border-input bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* Profit & Margin Bar */}
            {profitMetrics && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">Profit Analysis:</span>
                <div className="flex items-center gap-3 sm:gap-4 font-mono font-bold">
                  <span>Margin: {profitMetrics.margin}%</span>
                  <span>Profit: ৳{profitMetrics.profit.toLocaleString()} / item</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. INVENTORY & STOCK */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs min-w-0 w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Inventory & Tracking</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Control SKU codes, barcode identifiers, and stock management rules.</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={trackInventory}
                  onCheckedChange={(c) => { setTrackInventory(c); setIsDirty(true); }}
                />
                <span className="text-xs font-semibold text-foreground">Track inventory</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-foreground">Base SKU</label>
                <input
                  type="text"
                  placeholder="e.g. RR-HOOD-001"
                  value={sku}
                  onChange={(e) => { setSku(e.target.value); setIsDirty(true); }}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-foreground">Barcode (ISBN, UPC, GTIN)</label>
                <input
                  type="text"
                  placeholder="e.g. 0123456789"
                  value={barcode}
                  onChange={(e) => { setBarcode(e.target.value); setIsDirty(true); }}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {variants.length === 0 && (
                <div className="space-y-1.5 min-w-0 sm:col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-foreground">Available Quantity</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => { setStockQuantity(Number(e.target.value) || 0); setIsDirty(true); }}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
            </div>

            {/* Link to Inventory Item */}
            <div className="pt-2 border-t border-border space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package size={13} className="text-primary shrink-0" />
                <span>Link to Central Warehouse Inventory (Stock Sync)</span>
              </label>
              <select
                value={inventoryId}
                onChange={(e) => { setInventoryId(e.target.value); setIsDirty(true); }}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 truncate"
              >
                <option value="">-- No Direct Link (Manage stock directly here) --</option>
                {inventoryItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku || 'No SKU'}) — Current Stock: {item.current_stock}
                  </option>
                ))}
              </select>
            </div>

            {/* Continue selling out of stock */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="continueSelling"
                checked={continueSellingOutOfStock}
                onChange={(e) => { setContinueSellingOutOfStock(e.target.checked); setIsDirty(true); }}
                className="rounded border-input text-primary h-4 w-4 cursor-pointer"
              />
              <label htmlFor="continueSelling" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                Continue selling when out of stock (Pre-order mode)
              </label>
            </div>
          </div>

          {/* 6. VARIANTS (Shopify Matrix Engine) */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs min-w-0 w-full">
            <VariantManager
              options={variantOptions}
              onOptionsChange={(opts) => {
                setVariantOptions(opts);
                setIsDirty(true);
              }}
              variants={variants}
              onVariantsChange={(vars) => {
                setVariants(vars);
                setIsDirty(true);
              }}
              basePrice={price}
              productSlug={slug || generateSlug(title)}
              uploadedImages={Array.from(new Set([primaryImage, ...images].filter(Boolean)))}
              colorImages={colorImages}
              onColorImagesChange={(map) => {
                setColorImages(map);
                setIsDirty(true);
              }}
            />
          </div>

          {/* 7. SHIPPING */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs min-w-0 w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Truck size={15} className="text-primary shrink-0" />
                  <span>Shipping & Fulfillment</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Physical package dimensions and courier weight calibration.</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={isPhysicalProduct}
                  onCheckedChange={(c) => { setIsPhysicalProduct(c); setIsDirty(true); }}
                />
                <span className="text-xs font-semibold text-foreground">Physical product</span>
              </div>
            </div>

            {isPhysicalProduct && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 pt-1 animate-in fade-in duration-200">
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-bold text-foreground">Package Weight</label>
                  <div className="flex items-center rounded-xl border border-input bg-background overflow-hidden">
                    <input
                      type="number"
                      placeholder="0.45"
                      value={shippingWeight}
                      onChange={(e) => { setShippingWeight(e.target.value); setIsDirty(true); }}
                      className="w-full h-10 px-3 text-xs font-mono font-bold bg-transparent outline-none min-w-0"
                    />
                    <select
                      value={shippingWeightUnit}
                      onChange={(e) => setShippingWeightUnit(e.target.value)}
                      className="h-10 px-2.5 bg-muted text-xs font-bold border-l border-input outline-none cursor-pointer shrink-0"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="lb">lb</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-bold text-foreground">Country of Origin</label>
                  <input
                    type="text"
                    value={countryOfOrigin}
                    onChange={(e) => { setCountryOfOrigin(e.target.value); setIsDirty(true); }}
                    placeholder="Bangladesh"
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5 min-w-0 sm:col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-foreground">HS (Customs) Code</label>
                  <input
                    type="text"
                    value={hsCode}
                    onChange={(e) => { setHsCode(e.target.value); setIsDirty(true); }}
                    placeholder="6109.10"
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8. MATERIAL, FEATURES & ATTRIBUTES */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs min-w-0 w-full">
            <div>
              <h3 className="text-sm font-bold text-foreground">Attributes & Specifications</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Garment specifications, fabric compositions, and product highlights.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-foreground">Material / Fabric</label>
                <input
                  type="text"
                  placeholder="e.g. 100% Combed Cotton, Heavy Terry 380GSM"
                  value={material}
                  onChange={(e) => { setMaterial(e.target.value); setIsDirty(true); }}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-foreground">Key Features (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Pre-shrunk, Ribbed Collar, Relaxed Drop Shoulder"
                  value={features}
                  onChange={(e) => { setFeatures(e.target.value); setIsDirty(true); }}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT SECONDARY SIDEBAR (~33% on XL, 100% on Mobile/Tablet) ── */}
        <div className="col-span-1 xl:col-span-4 space-y-5 sm:space-y-6 min-w-0 w-full">

          {/* 9. STATUS */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs min-w-0 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Product Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setIsDirty(true); }}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="active">Active (Visible in Storefront)</option>
              <option value="draft">Draft (Hidden from Customers)</option>
              <option value="archived">Archived</option>
            </select>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {status === 'active' ? 'This product is published and can be purchased online.' : 'Draft products are only visible inside Admin ERP.'}
            </p>
          </div>

          {/* 10. PUBLISHING CHANNELS */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs min-w-0 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>Publishing</span>
              <Store size={14} className="text-primary shrink-0" />
            </label>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border gap-2">
                <span className="font-semibold text-foreground truncate">Online Storefront</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  Published
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border gap-2">
                <span className="font-semibold text-foreground truncate">Mobile Catalog / Live ERP</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  Synced
                </span>
              </div>
            </div>
          </div>

          {/* 11. PRODUCT ORGANIZATION */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs min-w-0 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Product Organization
            </label>

            {/* Category */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <label className="text-xs font-bold text-foreground">Category</label>
                <button
                  type="button"
                  onClick={() => setQuickCatOpen(!quickCatOpen)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={11} /> New
                </button>
              </div>

              {quickCatOpen ? (
                <div className="flex gap-1.5 p-2 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in duration-200">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : null}

              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setIsDirty(true); }}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer truncate"
              >
                {categories.map(c => (
                  <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Product Type & Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1 min-w-0">
                <label className="text-[11px] font-semibold text-foreground">Product Type</label>
                <input
                  type="text"
                  value={productType}
                  onChange={(e) => { setProductType(e.target.value); setIsDirty(true); }}
                  placeholder="Apparel"
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium outline-none"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <label className="text-[11px] font-semibold text-foreground">Vendor / Brand</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => { setVendor(e.target.value); setIsDirty(true); }}
                  placeholder="Rust & Revive"
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium outline-none"
                />
              </div>
            </div>

            {/* Ribbon / Badge */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-foreground">Product Badge / Ribbon</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => { setBadge(e.target.value); setIsDirty(true); }}
                placeholder="e.g. Bestseller, New Drop, Limited"
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium outline-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2 pt-2 border-t border-border min-w-0">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag size={13} className="text-primary shrink-0" />
                <span>Tags</span>
              </label>

              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary text-foreground border border-border"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  placeholder="+ Add tag (Enter)"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="h-7 min-w-[100px] flex-1 px-2 rounded-md border border-dashed border-input bg-background text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* 12. SEO PREVIEW */}
          <div className="min-w-0 w-full">
            <ProductSeoPreview
              title={title}
              description={longDescription || description}
              slug={slug}
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              seoHandle={seoHandle}
              onChange={(seo) => {
                if (seo.seo_title !== undefined) setSeoTitle(seo.seo_title);
                if (seo.seo_description !== undefined) setSeoDescription(seo.seo_description);
                if (seo.seo_handle !== undefined) setSeoHandle(seo.seo_handle);
                setIsDirty(true);
              }}
            />
          </div>

          {/* 13. THEME TEMPLATE & METAFIELDS */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3.5 shadow-xs min-w-0 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Theme Template & Metafields
            </label>

            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-foreground">Theme Template</label>
              <select
                value={themeTemplate}
                onChange={(e) => { setThemeTemplate(e.target.value); setIsDirty(true); }}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium outline-none cursor-pointer"
              >
                <option value="Default product">Default product</option>
                <option value="Pre-order template">Pre-order template</option>
                <option value="Hero showcase">Hero showcase</option>
              </select>
            </div>

            <div className="space-y-1 pt-2 border-t border-border min-w-0">
              <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                <Video size={12} className="text-primary shrink-0" />
                <span>Instagram Video / Reel URL</span>
              </label>
              <input
                type="text"
                value={instagramVideoUrl}
                onChange={(e) => { setInstagramVideoUrl(e.target.value); setIsDirty(true); }}
                placeholder="https://www.instagram.com/reel/..."
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono outline-none"
              />
            </div>
          </div>

        </div>

      </div>

      {/* ── BOTTOM ACTION BAR (In-flow footer card at the end of the form) ── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs min-w-0 w-full">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-start sm:self-auto shrink-0">
          {isDirty ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Unsaved changes</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>All changes saved</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancelWithCheck}
            className="rounded-xl text-xs font-semibold px-4 h-9 cursor-pointer flex-1 sm:flex-initial"
          >
            Discard
          </Button>

          {status !== 'draft' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSaving}
              onClick={() => handleSubmit(undefined, true)}
              className="rounded-xl text-xs font-bold px-4 h-9 cursor-pointer hidden sm:inline-flex"
            >
              Save Draft
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSubmit(undefined, false)}
            className="rounded-xl text-xs font-bold px-6 h-9 gap-2 shadow-sm cursor-pointer flex-1 sm:flex-initial"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? 'Saving...' : 'Save Product'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
