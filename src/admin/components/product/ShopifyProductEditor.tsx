'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Save, ArrowLeft, Plus, Trash2, Eye, Sparkles, Copy, Check,
  Layers, Package, Globe, Tag, ChevronDown, ChevronRight, Sliders,
  HelpCircle, AlertTriangle, Loader2, CheckCircle2, RotateCcw,
  Store, Truck, ShieldCheck, Video, ExternalLink, Palette, Ruler, Info,
  UploadCloud, Image as ImageIcon, FolderOpen
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { MainProductImageManager } from './MainProductImageManager';
import { ColorGalleryManager } from './ColorGalleryManager';
import { ProductMediaManager } from './ProductMediaManager';
import { ProductSeoPreview } from './ProductSeoPreview';
import { MediaPickerModal } from '../media/MediaPickerModal';
import { Button } from '../Button';
import { Card } from '../Card';
import { Switch } from '../ui/switch';
import { cleanImageUrl, extractProductImages } from '@/lib/productMedia';
import { uploadImage } from '../../lib/uploadHelper';
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

const COMMON_SIZES = ['Free Size', 'S', 'M', 'L', 'XL', '2XL', '3XL', '28', '30', '32', '34', '36'];

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

  // 1. Basic Product Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugAuto, setIsSlugAuto] = useState(true);
  const [category, setCategory] = useState('');
  const [badge, setBadge] = useState('');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');

  // 2. Pricing & Stock
  const [price, setPrice] = useState<string | number>('');
  const [compareAtPrice, setCompareAtPrice] = useState<string | number>('');
  const [costPerItem, setCostPerItem] = useState<string | number>('');
  const [stockQuantity, setStockQuantity] = useState<number | string>(50);
  const [sku, setSku] = useState('');

  // 3. Dedicated Main Product Image (Independent of color)
  const [mainProductImage, setMainProductImage] = useState('');

  // 4. Multi-Color Product Galleries
  const [colors, setColors] = useState<string[]>([]);
  const [colorGalleries, setColorGalleries] = useState<Record<string, string[]>>({});

  // 5. General Media & Fallback
  const [generalImages, setGeneralImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState('');

  // 5. Sizes
  const [sizes, setSizes] = useState<string[]>(['Free Size']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [sizeGuide, setSizeGuide] = useState(defaultSizeGuide);
  const [sizeChartImageUrl, setSizeChartImageUrl] = useState('');
  const [isUploadingSizeChart, setIsUploadingSizeChart] = useState(false);
  const [sizeChartMediaModalOpen, setSizeChartMediaModalOpen] = useState(false);
  const sizeChartFileInputRef = useRef<HTMLInputElement | null>(null);

  // 6. Description & Story
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [features, setFeatures] = useState('100% Handloom Weave, Organic Dyes, Tailored Comfort Fit');
  const [material, setMaterial] = useState('Cotton 100%');

  // 7. Advanced Collapsible
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [vendor, setVendor] = useState('PutiMach');
  const [productType, setProductType] = useState('Apparel');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [instagramVideoUrl, setInstagramVideoUrl] = useState('');

  // Quick Category Add
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

  // Ref to prevent async re-renders from overwriting user edits
  const initializedProductIdRef = useRef<string | null>(null);
  const currentInitialId = initialProduct ? (initialProduct.id || initialProduct.slug || 'editing-product') : null;

  // Populate data in Edit Mode
  useEffect(() => {
    if (initialProduct && currentInitialId) {
      if (initializedProductIdRef.current === currentInitialId) {
        return; // Already initialized for this product
      }
      initializedProductIdRef.current = currentInitialId;

      setTitle(initialProduct.name || initialProduct.title || '');
      setSlug(initialProduct.slug || initialProduct.id || '');
      setIsSlugAuto(false);
      setCategory(initialProduct.category || categories[0]?.slug || '');
      setBadge(initialProduct.badge || '');
      setStatus(initialProduct.status || (initialProduct.in_stock === false ? 'draft' : 'active'));

      setPrice(initialProduct.price !== undefined ? initialProduct.price : '');
      setCompareAtPrice(initialProduct.original_price || initialProduct.compare_at_price || '');
      setCostPerItem(initialProduct.cost_per_item || '');
      setStockQuantity(initialProduct.stock !== undefined ? initialProduct.stock : 50);
      setSku(initialProduct.sku || '');

      // Load Colors & Color Galleries
      const rawColorImages = initialProduct.color_images || initialProduct.colorImages || initialProduct.color_galleries || {};
      const galleries: Record<string, string[]> = {};
      const loadedColors: string[] = Array.isArray(initialProduct.colors) 
        ? initialProduct.colors.map(String).map(s => s.trim()).filter(Boolean) 
        : (typeof initialProduct.colors === 'string' ? initialProduct.colors.split(',').map(s => s.trim()).filter(Boolean) : []);

      if (typeof rawColorImages === 'object' && rawColorImages !== null) {
        Object.entries(rawColorImages).forEach(([cName, val]) => {
          const cleanName = cName.trim();
          if (Array.isArray(val)) {
            galleries[cleanName] = val.map(cleanImageUrl).filter(Boolean);
          } else if (typeof val === 'string') {
            const cleaned = cleanImageUrl(val);
            if (cleaned) galleries[cleanName] = [cleaned];
          }
          if (!loadedColors.includes(cleanName)) {
            loadedColors.push(cleanName);
          }
        });
      }

      setColors(loadedColors.length > 0 ? loadedColors : ['Black']);
      setColorGalleries(galleries);

      // Dedicated Main Product Image (Independent of color)
      const rawMainImg = initialProduct.main_image || initialProduct.mainImage || initialProduct.primary_image || initialProduct.primaryImage || initialProduct.image || '';
      const allExtracted = extractProductImages(initialProduct);
      const resolvedInitialMain = cleanImageUrl(rawMainImg) || (allExtracted[0] || '');
      setMainProductImage(resolvedInitialMain);

      // General Images
      setGeneralImages(Array.isArray(initialProduct.images) ? initialProduct.images : allExtracted);
      setPrimaryImage(resolvedInitialMain);

      // Sizes: Normalize and deduplicate
      let loadedSizes: string[] = [];
      if (Array.isArray(initialProduct.sizes) && initialProduct.sizes.length > 0) {
        loadedSizes = initialProduct.sizes.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof initialProduct.sizes === 'string' && initialProduct.sizes.trim()) {
        loadedSizes = initialProduct.sizes.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const normalizedInitialSizes: string[] = [];
      loadedSizes.forEach(s => {
        if (!normalizedInitialSizes.some(existing => existing.toLowerCase() === s.toLowerCase())) {
          normalizedInitialSizes.push(s);
        }
      });

      setSizes(normalizedInitialSizes.length > 0 ? normalizedInitialSizes : ['Free Size']);

      setSizeGuide(initialProduct.size_guide || defaultSizeGuide);
      setSizeChartImageUrl(initialProduct.size_guide?.image_url || initialProduct.size_chart_image || '');

      setDescription(initialProduct.description || '');
      setLongDescription(initialProduct.long_description || initialProduct.description || '');
      setFeatures(Array.isArray(initialProduct.features) ? initialProduct.features.join(', ') : (initialProduct.features || ''));
      setMaterial(initialProduct.material || 'Cotton 100%');

      setSeoTitle(initialProduct.seo_title || '');
      setSeoDescription(initialProduct.seo_description || '');
      setBarcode(initialProduct.barcode || '');
      setVendor(initialProduct.vendor || 'PutiMach');
      setProductType(initialProduct.product_type || 'Apparel');
      setTags(Array.isArray(initialProduct.tags) ? initialProduct.tags : []);
      setInstagramVideoUrl(initialProduct.instagram_video_url || '');
    } else if (!initialProduct) {
      // Default Add Mode
      initializedProductIdRef.current = null;
      setCategory(categories[0]?.slug || '');
      setMainProductImage('');
      setColors(['Black']);
      setColorGalleries({ 'Black': [] });
      setSizes(['Free Size', 'M', 'L', 'XL']);
    }
  }, [initialProduct, currentInitialId]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isSlugAuto || !slug) {
      setSlug(generateSlug(val));
    }
  };

  // Helper: check if a size is selected (case-insensitive & whitespace normalized)
  const isSizeSelected = (sizeName: string) => {
    if (!sizeName) return false;
    const clean = String(sizeName).trim().toLowerCase();
    return sizes.some(s => String(s).trim().toLowerCase() === clean);
  };

  // Toggle selection of a size (add if missing, remove if present)
  const handleToggleSize = (sizeName: string) => {
    const cleanName = String(sizeName).trim();
    if (!cleanName) return;

    const exists = sizes.some(s => String(s).trim().toLowerCase() === cleanName.toLowerCase());

    if (exists) {
      if (sizes.length > 1) {
        setSizes(prev => prev.filter(s => String(s).trim().toLowerCase() !== cleanName.toLowerCase()));
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'At least one size is required.',
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } else {
      setSizes(prev => [...prev, cleanName]);
    }
  };

  // Add custom size from text input
  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed) return;

    const exists = sizes.some(s => String(s).trim().toLowerCase() === trimmed.toLowerCase());

    if (!exists) {
      setSizes(prev => [...prev, trimmed]);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Size "${trimmed}" added and selected.`,
        showConfirmButton: false,
        timer: 1800,
      });
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Size "${trimmed}" is already selected.`,
        showConfirmButton: false,
        timer: 2000,
      });
    }
    setCustomSizeInput('');
  };

  // Combined list of all available size pills (common predefined sizes + all user-added sizes)
  const allAvailablePillSizes = useMemo(() => {
    const set = new Set<string>();
    COMMON_SIZES.forEach(s => set.add(s));
    sizes.forEach(s => {
      if (s && String(s).trim()) {
        const clean = String(s).trim();
        const match = Array.from(set).find(existing => existing.toLowerCase() === clean.toLowerCase());
        if (!match) {
          set.add(clean);
        }
      }
    });
    return Array.from(set);
  }, [sizes]);

  const handleSizeChartUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingSizeChart(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        const clean = cleanImageUrl(url);
        setSizeChartImageUrl(clean || url);
        setSizeGuide(prev => ({ ...(prev || defaultSizeGuide), image_url: clean || url }));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Size chart image uploaded!',
          showConfirmButton: false,
          timer: 1800,
        });
      }
    } catch (err) {
      console.error('Failed to upload size chart image:', err);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err?.message || 'Could not upload size chart image.'
      });
    } finally {
      setIsUploadingSizeChart(false);
    }
  };

  const handleQuickAddCatSubmit = async () => {
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

  // Build and submit complete product payload
  const handleSubmit = async (e?: React.FormEvent, overrideDraft = false) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      Swal.fire({
        title: 'Title Required',
        text: 'Please enter a product title.',
        icon: 'warning',
        confirmButtonColor: '#1C1613'
      });
      return;
    }

    if (price === '' || Number(price) < 0) {
      Swal.fire({
        title: 'Price Required',
        text: 'Please enter a valid selling price in BDT (৳).',
        icon: 'warning',
        confirmButtonColor: '#1C1613'
      });
      return;
    }

    const finalSlug = slug.trim() || generateSlug(title) || 'product-' + Date.now();
    const finalStatus = overrideDraft ? 'draft' : status;

    // Collect all image URLs across all colors in order
    const allColorImagesList: string[] = [];
    colors.forEach(col => {
      const g = colorGalleries[col];
      if (Array.isArray(g)) {
        g.forEach(url => {
          const cleaned = cleanImageUrl(url);
          if (cleaned && !allColorImagesList.includes(cleaned)) {
            allColorImagesList.push(cleaned);
          }
        });
      }
    });

    // Cleaned main product image
    const cleanedMainProductImage = cleanImageUrl(mainProductImage);
    const resolvedPrimaryImage = cleanedMainProductImage || allColorImagesList[0] || primaryImage || '';

    // Complete ordered image list: Main Image FIRST, followed by color groups
    const combinedImages = Array.from(new Set([
      resolvedPrimaryImage,
      ...allColorImagesList,
      ...(Array.isArray(generalImages) ? generalImages.map(cleanImageUrl).filter(Boolean) : []),
    ].filter(Boolean)));

    // Clean and normalize final sizes
    const normalizedFinalSizes = Array.from(new Set(sizes.map(s => String(s).trim()).filter(Boolean)));
    const finalSizes = normalizedFinalSizes.length > 0 ? normalizedFinalSizes : ['Free Size'];

    // Generate comprehensive variant matrix
    const generatedVariants = [];
    colors.forEach(col => {
      const colPrimaryImg = colorGalleries[col]?.[0] || resolvedPrimaryImage;
      finalSizes.forEach(sz => {
        generatedVariants.push({
          id: `${finalSlug}-${col}-${sz}`,
          color: col,
          size: sz,
          sku: `${finalSlug.toUpperCase()}-${col.slice(0, 3).toUpperCase()}-${sz}`,
          price: Number(price) || 0,
          original_price: compareAtPrice ? Number(compareAtPrice) : null,
          stock: Math.max(1, Math.floor((Number(stockQuantity) || 50) / Math.max(1, colors.length * finalSizes.length))),
          image_url: colPrimaryImg,
          in_stock: true
        });
      });
    });

    const payload = {
      name: title.trim(),
      slug: finalSlug,
      category: category || categories[0]?.slug || 'uncategorized',
      price: Number(price) || 0,
      original_price: compareAtPrice ? Number(compareAtPrice) : null,
      cost_per_item: costPerItem ? Number(costPerItem) : null,
      stock: stockQuantity !== '' && stockQuantity !== null && stockQuantity !== undefined ? Number(stockQuantity) : 0,
      sku: sku || `PM-${finalSlug.toUpperCase().slice(0, 8)}`,
      barcode: barcode || null,
      badge: badge || null,

      // Multi-Color & Gallery Core Fields
      main_image: resolvedPrimaryImage,
      mainImage: resolvedPrimaryImage,
      primary_image: resolvedPrimaryImage,
      image: resolvedPrimaryImage,
      images: combinedImages.length > 0 ? combinedImages : [resolvedPrimaryImage].filter(Boolean),
      color_images: colorGalleries,
      color_galleries: colorGalleries,
      colors: colors.length > 0 ? colors : ['Black'],
      sizes: finalSizes,
      variants: generatedVariants,

      // Details & Description
      description: description || title,
      long_description: longDescription || description || title,
      features: features ? features.split(',').map(f => f.trim()).filter(Boolean) : [],
      material: material || 'Cotton 100%',
      size_guide: {
        ...sizeGuide,
        image_url: sizeChartImageUrl || sizeGuide?.image_url || null
      },
      size_chart_image: sizeChartImageUrl || null,

      // Status & Settings
      in_stock: finalStatus === 'active' && (
        generatedVariants.length > 0
          ? generatedVariants.some(v => (Number(v.stock) || 0) > 0)
          : (stockQuantity !== '' && stockQuantity !== null && stockQuantity !== undefined ? Number(stockQuantity) > 0 : false)
      ),
      status: finalStatus,
      vendor: vendor || 'PutiMach',
      product_type: productType || 'Apparel',
      tags: tags,
      seo_title: seoTitle || title,
      seo_description: seoDescription || description,
      instagram_video_url: instagramVideoUrl || null,
    };

    await onSave(payload, overrideDraft);
  };

  // Discount % calculation
  const discountPercent = useMemo(() => {
    const p = Number(price) || 0;
    const orig = Number(compareAtPrice) || 0;
    if (p > 0 && orig > p) {
      return Math.round(((orig - p) / orig) * 100);
    }
    return null;
  }, [price, compareAtPrice]);

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border/80 pb-3.5 sm:pb-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 sm:p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold font-serif text-foreground truncate">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              Fill in product info, add colors with specific photos, select sizes, and save.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSaving}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold bg-[#1C1613] text-white hover:bg-black transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{isEditMode ? 'Update Product' : 'Publish Product'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* Left 2 Columns: Main Fast Workflow */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Card 1: Product Basics */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 sm:gap-2">
              <Package size={15} className="text-brand shrink-0" />
              <span>1. Product Information</span>
            </h2>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                Product Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Vintage Handloom Khadi Shirt"
                className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] sm:text-xs font-bold text-foreground">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickCatOpen(!quickCatOpen)}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                  >
                    + New Category
                  </button>
                </div>

                {quickCatOpen && (
                  <div className="flex items-center gap-1.5 mb-2 p-2 rounded-xl bg-muted/50 border border-border">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCatSubmit}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand text-white"
                    >
                      Save
                    </button>
                  </div>
                )}

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand focus:outline-none capitalize cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id || c.slug} value={c.slug || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                  Product Badge (Optional)
                </label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand focus:outline-none cursor-pointer"
                >
                  <option value="">No Badge</option>
                  <option value="NEW DROP">NEW DROP</option>
                  <option value="BESTSELLER">BESTSELLER</option>
                  <option value="SALE">SALE</option>
                  <option value="LIMITED">LIMITED</option>
                  <option value="HANDLOOM">HANDLOOM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Pricing & Stock */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 sm:gap-2">
              <Tag size={15} className="text-brand shrink-0" />
              <span>2. Pricing & Stock</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                  Selling Price (৳ BDT) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs sm:text-sm">৳</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2500"
                    className="w-full pl-7 sm:pl-8 pr-3 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-bold text-foreground focus:ring-2 focus:ring-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                  Original / Compare Price (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs sm:text-sm">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    placeholder="3200"
                    className="w-full pl-7 sm:pl-8 pr-3 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand focus:outline-none"
                  />
                </div>
                {discountPercent && (
                  <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 mt-1">
                    Customer saves {discountPercent}% off
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                  Total Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="50"
                  className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Dedicated Main Product Image (Independent of Color) */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
            <MainProductImageManager
              mainImage={mainProductImage}
              onMainImageChange={setMainProductImage}
            />
          </div>

          {/* Card 4: Colors & Color-Wise Image Galleries */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
            <ColorGalleryManager
              colors={colors}
              colorGalleries={colorGalleries}
              onColorsChange={setColors}
              onGalleriesChange={setColorGalleries}
            />
          </div>

          {/* Card 5: Sizes */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 sm:gap-2">
                <Ruler size={15} className="text-brand shrink-0" />
                <span>5. Available Sizes</span>
              </h2>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                {sizes.length} selected
              </span>
            </div>

            {/* Size Pills (Predefined + Custom Sizes) */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {allAvailablePillSizes.map((sz) => {
                const isSelected = isSizeSelected(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleToggleSize(sz)}
                    className={cn(
                      "px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all border cursor-pointer active:scale-95 select-none",
                      isSelected
                        ? "border-[#1C1613] bg-[#1C1613] text-white shadow-xs scale-105"
                        : "border-border bg-background text-foreground hover:border-[#1C1613]/50"
                    )}
                  >
                    {sz} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>

            {/* Custom Size Adder */}
            <div className="flex items-center gap-1.5 pt-1 w-full sm:w-auto">
              <input
                type="text"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSize();
                  }
                }}
                placeholder="Custom size (e.g. 42, XXL)"
                className="flex-1 sm:flex-initial px-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:ring-2 focus:ring-brand focus:outline-none w-full sm:w-56"
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground cursor-pointer active:scale-95"
              >
                + Add Size
              </button>
            </div>

            {/* Size Chart Image Upload Section */}
            <div className="pt-3.5 border-t border-border/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-brand shrink-0" />
                    <span>Size Chart / Measurement Guide Image</span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                    Upload a size guide chart or measurement diagram. Shown in the "Size Guide" popup on the storefront.
                  </p>
                </div>
                {sizeChartImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSizeChartImageUrl('');
                      setSizeGuide(prev => ({ ...(prev || defaultSizeGuide), image_url: null }));
                    }}
                    className="text-[11px] text-destructive hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={sizeChartFileInputRef}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSizeChartUpload(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              {sizeChartImageUrl ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10">
                  <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0">
                    <img
                      src={sizeChartImageUrl}
                      alt="Size chart preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 size={14} />
                      <span>Size Chart Image Attached</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-md font-mono">
                      {sizeChartImageUrl}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSizeChartMediaModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-background border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                      >
                        <FolderOpen size={12} className="text-primary" />
                        <span>Select from Media</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingSizeChart}
                        onClick={() => sizeChartFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingSizeChart ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                        <span>Upload New</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(sizeChartImageUrl, '_blank')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>View Full</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-5 px-3 text-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center gap-2">
                  {isUploadingSizeChart ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                      <Loader2 className="w-6 h-6 text-brand animate-spin" />
                      <p className="text-xs font-bold text-foreground">Uploading Size Chart...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-muted-foreground/60 mx-auto mb-0.5" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Add Size Chart / Measurement Guide Image
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                          Select existing image from Media Library or upload a new diagram
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={() => setSizeChartMediaModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border shadow-2xs transition-colors cursor-pointer"
                        >
                          <FolderOpen size={13} className="text-primary" />
                          <span>Select from Media</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => sizeChartFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors cursor-pointer"
                        >
                          <UploadCloud size={13} />
                          <span>Upload New</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Size Chart Media Picker Modal */}
              <MediaPickerModal
                isOpen={sizeChartMediaModalOpen}
                onClose={() => setSizeChartMediaModalOpen(false)}
                onSelect={(urls) => {
                  if (urls && urls[0]) {
                    const clean = cleanImageUrl(urls[0]);
                    setSizeChartImageUrl(clean || urls[0]);
                    setSizeGuide(prev => ({ ...(prev || defaultSizeGuide), image_url: clean || urls[0] }));
                  }
                }}
                multiple={false}
                initialSelectedUrls={sizeChartImageUrl ? [sizeChartImageUrl] : []}
                title="Select Size Chart Image"
              />
            </div>
          </div>

          {/* Card 5: Description & Story */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 sm:gap-2">
              <Info size={15} className="text-brand shrink-0" />
              <span>5. Description & Story</span>
            </h2>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the weave, style, heritage background, and fit..."
                className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-normal focus:ring-2 focus:ring-brand focus:outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                  Material Composition
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. 100% Handloom Cotton"
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                  Key Highlights (comma-separated)
                </label>
                <input
                  type="text"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Garment Washed, Oversized Fit, Breathable"
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Collapsible Advanced Settings */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders size={15} className="text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-foreground">Advanced Settings (SEO, URL Handle, SKU)</span>
              </div>
              <ChevronDown
                size={15}
                className={cn("text-muted-foreground transition-transform duration-200 shrink-0", showAdvanced && "rotate-180")}
              />
            </button>

            {showAdvanced && (
              <div className="p-4 sm:p-6 border-t border-border space-y-3.5 sm:space-y-4 bg-muted/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                      URL Handle / Slug
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value); setIsSlugAuto(false); }}
                      placeholder="vintage-handloom-shirt"
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                      SKU Prefix
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="PM-SHIRT-01"
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                    SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Page Title'}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-foreground mb-1">
                    SEO Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Short description for Google search results..."
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Status & Summary Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Publishing Status Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Product Status
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border border-border bg-background hover:bg-muted/40 cursor-pointer">
                <input
                  type="radio"
                  name="product_status"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-brand focus:ring-brand"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Active</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Visible and available for purchase</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border border-border bg-background hover:bg-muted/40 cursor-pointer">
                <input
                  type="radio"
                  name="product_status"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="text-brand focus:ring-brand"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Draft</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Hidden from customers, admin only</p>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5 sm:space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Summary
            </h3>

            <div className="text-xs space-y-1.5 text-muted-foreground">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Active Colors:</span>
                <span className="font-bold text-foreground">{colors.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Available Sizes:</span>
                <span className="font-bold text-foreground">{sizes.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Total Photos:</span>
                <span className="font-bold text-foreground">
                  {Object.values(colorGalleries).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Selling Price:</span>
                <span className="font-bold text-foreground">৳{price || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Docked Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 bg-card/95 backdrop-blur-md border-t border-border shadow-lg flex items-center justify-between mt-6 sm:mt-8 rounded-b-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSaving}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 sm:px-7 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#1C1613] text-white hover:bg-black transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>{isEditMode ? 'Update Product' : 'Save Product'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
export default ShopifyProductEditor;
