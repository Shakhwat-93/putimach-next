'use client';
// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import './InventoryPage.css';
import { useOrders } from '../context/OrderContext';
import { Modal } from '../components/Modal';
import CurrencyIcon from '../components/CurrencyIcon';
import {
  Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Edit2, Trash2, Tag, Bot, Loader2, CheckCircle2, CircleAlert, ChevronDown, Sparkles,
  TrendingUp, TrendingDown, DollarSign, BarChart2, UploadCloud, Image as ImageIcon,
  ExternalLink, X, Check, RefreshCw, FolderOpen
} from 'lucide-react';
import { PremiumSearch } from '../components/PremiumSearch';
import { usePersistentState } from '../utils/persistentState';
import { getSerialTrackedProducts } from '../utils/productCatalog';
import { supabase } from '../lib/supabase';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { uploadImage } from '../lib/uploadHelper';
import { cleanImageUrl } from '@/lib/productMedia';
import { MediaPickerModal } from '../components/media/MediaPickerModal';

// Tailwind / shadcn utils and components
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';

const DEFAULT_CATEGORIES = ['TOY BOX', 'ORGANIZER', 'Bags', 'Accessories', 'Religious', 'Other'];

export const InventoryPage = () => {
  const { confirmDialog, showError, showSuccess, showWarning, showInfo, ConfirmDialogComponent } = useConfirmDialog();
  const {
    inventory,
    toyBoxes,
    loading,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    updateToyBoxStock,
    addToyBoxStocks,
    previewInvoiceStockUpdate,
    applyInvoiceStockUpdate
  } = useOrders();
  const [searchTerm, setSearchTerm] = usePersistentState('panel:inventory:search', '');
  const [categoryFilter, setCategoryFilter] = usePersistentState('panel:inventory:category', 'All');

  const [dbCategories, setDbCategories] = useState([]);
  const [storefrontProducts, setStorefrontProducts] = useState([]);

  // Fetch storefront products to auto-resolve images
  const fetchStorefrontProducts = useCallback(async () => {
    try {
      const { data } = await supabase.from('products').select('id, data');
      if (data) setStorefrontProducts(data);
    } catch (err) {
      console.error('Error fetching products for inventory:', err);
    }
  }, []);

  useEffect(() => {
    fetchStorefrontProducts();
  }, [fetchStorefrontProducts]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('cb_categories')
          .select('id, data');
        if (!error && data) {
          const names = data.map(c => c.data?.name || c.id).filter(Boolean);
          setDbCategories(names);
        }
      } catch (err) {
        console.error('Error fetching categories for inventory page:', err);
      }
    };
    fetchCategories();
  }, []);

  const pageCategories = dbCategories.length > 0
    ? ['All', ...dbCategories]
    : ['All', ...DEFAULT_CATEGORIES];

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isToyBoxModalOpen, setIsToyBoxModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(1);
  const [adjustType, setAdjustType] = useState('add'); // 'add' or 'deduct'
  const [invoiceText, setInvoiceText] = useState('');
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceError, setInvoiceError] = useState('');
  const [isPreviewingInvoice, setIsPreviewingInvoice] = useState(false);
  const [isApplyingInvoice, setIsApplyingInvoice] = useState(false);
  const [confirmCommand] = useState('confirm');
  const [useManualBulkMode, setUseManualBulkMode] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [invoiceStockMode, setInvoiceStockMode] = useState('add'); // 'add' or 'deduct'
  const [toyBoxSerialInput, setToyBoxSerialInput] = useState('');
  const [toyBoxInitialStock, setToyBoxInitialStock] = useState(0);
  const [toyBoxProductName, setToyBoxProductName] = useState('');

  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [uploadingColorKey, setUploadingColorKey] = useState<string | null>(null);
  const [mainImageMediaModalOpen, setMainImageMediaModalOpen] = useState(false);
  const [colorMediaModalTarget, setColorMediaModalTarget] = useState<string | null>(null);
  const [galleryMediaModalOpen, setGalleryMediaModalOpen] = useState(false);
  const mainImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const colorFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeColorForUploadRef = useRef<string | null>(null);

  const [sizesInput, setSizesInput] = useState('S, M, L, XL');
  const [colorsInput, setColorsInput] = useState('Black, White, Grey');

  const [formData, setFormData] = useState({
    name: '', sku: '', category: 'Other', current_stock: 0, min_stock_level: 5,
    unit_price: 0, selling_price: 0, making_cost: 0, supports_serial_tracking: false,
    image: '', image_url: '', product_id: '',
    images: [], color_images: {}, variants: []
  });

  const handleVariantChange = (index, field, value) => {
    const updated = formData.variants.map((v, i) => {
      if (i === index) return { ...v, [field]: value };
      return v;
    });
    setFormData({ ...formData, variants: updated });
  };

  const removeVariantRow = (index) => {
    const updated = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: updated });
  };

  const addVariantRow = () => {
    const baseSku = (formData.sku || 'ITEM').toUpperCase();
    const newVariant = {
      size: '',
      color: '',
      sku: `${baseSku}-VAR-${formData.variants.length + 1}`,
      stock: 10
    };
    setFormData({ ...formData, variants: [...formData.variants, newVariant] });
  };

  const generateVariantCombinations = () => {
    const sizeList = sizesInput.split(',').map(s => s.trim()).filter(Boolean);
    const colorList = colorsInput.split(',').map(c => c.trim()).filter(Boolean);
    
    if (sizeList.length === 0 && colorList.length === 0) {
      showWarning('Please enter some Sizes or Colors to generate combinations.', 'Input Required');
      return;
    }

    const combinations = [];
    const baseSku = (formData.sku || formData.name.toLowerCase().replace(/\s+/g, '-')).toUpperCase();
    
    if (sizeList.length > 0 && colorList.length > 0) {
      sizeList.forEach(sz => {
        colorList.forEach(cl => {
          combinations.push({
            size: sz,
            color: cl,
            sku: `${baseSku}-${sz.toUpperCase()}-${cl.toUpperCase()}`,
            stock: 10
          });
        });
      });
    } else if (sizeList.length > 0) {
      sizeList.forEach(sz => {
        combinations.push({
          size: sz,
          color: '',
          sku: `${baseSku}-${sz.toUpperCase()}`,
          stock: 10
        });
      });
    } else {
      colorList.forEach(cl => {
        combinations.push({
          size: '',
          color: cl,
          sku: `${baseSku}-${cl.toUpperCase()}`,
          stock: 10
        });
      });
    }

    setFormData({ ...formData, variants: combinations });
  };

  const resolveInventoryImage = useCallback((item, prodsList = storefrontProducts) => {
    if (!item) return null;
    if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim()) {
      return cleanImageUrl(item.image_url.trim());
    }
    if (item.image && typeof item.image === 'string' && item.image.trim()) {
      return cleanImageUrl(item.image.trim());
    }

    // Look for matching storefront product
    const itemName = (item.name || '').trim().toLowerCase();
    const itemSku = (item.sku || '').trim().toLowerCase();
    const itemSlug = itemName.replace(/[\s\W-]+/g, '-');

    const matchedProduct = (prodsList || []).find(p => {
      const pData = p.data || p;
      const pId = String(p.id || pData.id || pData.slug || '').toLowerCase();
      const pName = String(pData.name || '').trim().toLowerCase();
      const pSku = String(pData.sku || '').trim().toLowerCase();
      const pInvId = String(pData.inventory_id || '');

      return (
        (item.product_id && (pId === String(item.product_id).toLowerCase() || p.id === item.product_id)) ||
        (pInvId && pInvId === String(item.id)) ||
        (pId && itemSlug && (pId === itemSlug || pId.includes(itemSlug) || itemSlug.includes(pId))) ||
        (pName && itemName && (pName === itemName || pName.includes(itemName) || itemName.includes(pName))) ||
        (pSku && itemSku && pSku === itemSku)
      );
    });

    if (matchedProduct) {
      const pData = matchedProduct.data || matchedProduct;
      if (pData.image && typeof pData.image === 'string' && pData.image.trim()) {
        return cleanImageUrl(pData.image.trim());
      }
      if (Array.isArray(pData.images) && pData.images.length > 0 && pData.images[0]) {
        return cleanImageUrl(pData.images[0]);
      }
      if (pData.color_images && typeof pData.color_images === 'object') {
        const firstVal = Object.values(pData.color_images)[0];
        if (typeof firstVal === 'string' && firstVal.trim()) return cleanImageUrl(firstVal.trim());
        if (Array.isArray(firstVal) && firstVal[0]) return cleanImageUrl(firstVal[0]);
      }
      if (pData.color_galleries && typeof pData.color_galleries === 'object') {
        const firstGal = Object.values(pData.color_galleries)[0];
        if (Array.isArray(firstGal) && firstGal[0]) return cleanImageUrl(firstGal[0]);
      }
    }
    return null;
  }, [storefrontProducts]);

  const handleMainImageUpload = async (file) => {
    if (!file) return;
    setIsUploadingMainImage(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        const cleaned = cleanImageUrl(url);
        setFormData(prev => ({
          ...prev,
          image: cleaned,
          image_url: cleaned,
          images: prev.images?.length > 0 ? [cleaned, ...prev.images.filter(img => img !== cleaned)] : [cleaned]
        }));
        showSuccess('Product image uploaded successfully!');
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      showError('Failed to upload image: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingMainImage(false);
    }
  };

  const handleColorImageUpload = async (file, color) => {
    if (!file || !color) return;
    setUploadingColorKey(color);
    try {
      const url = await uploadImage(file);
      if (url) {
        const cleaned = cleanImageUrl(url);
        setFormData(prev => {
          const updatedColorImages = { ...(prev.color_images || {}), [color]: cleaned };
          const updatedVariants = (prev.variants || []).map(v => {
            if (v.color?.toLowerCase() === color.toLowerCase()) {
              return { ...v, image_url: cleaned };
            }
            return v;
          });
          return {
            ...prev,
            color_images: updatedColorImages,
            variants: updatedVariants
          };
        });
        showSuccess(`Photo uploaded for ${color}!`);
      }
    } catch (err) {
      console.error(`Failed to upload photo for ${color}:`, err);
      showError(`Upload failed for ${color}: ` + err.message);
    } finally {
      setUploadingColorKey(null);
    }
  };

  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      const existingVariants = Array.isArray(product.variants) ? product.variants : [];
      const extractedColors = Array.from(new Set([
        ...(Array.isArray(product.colors) ? product.colors : []),
        ...existingVariants.map(v => v.color).filter(Boolean),
        ...Object.keys(product.color_images || {})
      ])).join(', ');

      const extractedSizes = Array.from(new Set([
        ...(Array.isArray(product.sizes) ? product.sizes : []),
        ...existingVariants.map(v => v.size).filter(Boolean)
      ])).join(', ');

      setSizesInput(extractedSizes || 'S, M, L, XL');
      setColorsInput(extractedColors || 'Black, Off White, Grey/Ash');

      const resolvedImg = product.image_url || product.image || resolveInventoryImage(product, storefrontProducts) || '';

      setFormData({
        name: product.name,
        sku: product.sku || '',
        category: product.category || 'Other',
        current_stock: product.current_stock,
        min_stock_level: product.min_stock_level,
        unit_price: product.unit_price,
        selling_price: Number(product.selling_price) || Number(product.unit_price) || 0,
        making_cost: Number(product.making_cost) || 0,
        supports_serial_tracking: Boolean(product.supports_serial_tracking ?? (product.category === 'TOY BOX')),
        image: resolvedImg,
        image_url: resolvedImg,
        product_id: product.product_id || '',
        images: Array.isArray(product.images) ? product.images : (resolvedImg ? [resolvedImg] : []),
        color_images: product.color_images || {},
        variants: existingVariants
      });
    } else {
      setSizesInput('S, M, L, XL');
      setColorsInput('Black, Off White, Grey/Ash');
      setEditingProduct(null);
      setFormData({
        name: '', sku: '', category: 'Other', current_stock: 0, min_stock_level: 5,
        unit_price: 0, selling_price: 0, making_cost: 0, supports_serial_tracking: false,
        image: '', image_url: '', product_id: '',
        images: [], color_images: {}, variants: []
      });
    }
    setIsProductModalOpen(true);
  };

  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showError('Product name is required');
      return;
    }
    setIsSavingProduct(true);
    try {
      const hasVariants = formData.variants && formData.variants.length > 0;
      const finalStock = hasVariants
        ? formData.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
        : Number(formData.current_stock) || 0;
        
      const finalImg = formData.image_url || formData.image || null;

      const payload = {
        ...formData,
        name: formData.name.trim(),
        current_stock: finalStock,
        image: finalImg,
        image_url: finalImg,
        product_id: formData.product_id || null,
        variants: formData.variants || []
      };

      if (editingProduct) {
        await updateInventoryItem(editingProduct.id, payload);
        showSuccess('Product updated successfully!');
      } else {
        await addInventoryItem(payload);
        showSuccess('Product created and added to inventory!');
      }
      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Save product error:', err);
      showError('Failed to save product: ' + (err.message || 'Please check input data and try again.'));
    } finally {
      setIsSavingProduct(false);
    }
  };

  const serialTrackedProducts = getSerialTrackedProducts(inventory);
  const toyBoxGroups = (toyBoxes || []).reduce((acc, item) => {
    const key = item.product_name || 'TOY BOX';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // --- Computed P&L stats across all inventory ---
  const totalInventoryValue = inventory.reduce((s, i) => s + ((Number(i.selling_price) || Number(i.unit_price) || 0) * (Number(i.current_stock) || 0)), 0);
  const totalCOGSValue      = inventory.reduce((s, i) => s + ((Number(i.making_cost) || 0) * (Number(i.current_stock) || 0)), 0);

  const lowStockItems = inventory.filter(item => item.current_stock <= item.min_stock_level && item.current_stock > 0);
  const outOfStockItems = inventory.filter(item => item.current_stock === 0);

  const handleOpenAdjustModal = (product) => {
    setAdjustingProduct(product);
    setAdjustAmount(1);
    setAdjustType('add');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = async () => {
    const amount = adjustType === 'add' ? adjustAmount : -adjustAmount;
    await adjustStock(adjustingProduct.id, amount);
    setIsAdjustModalOpen(false);
  };

  const handleDeleteProduct = (id) => {
    confirmDialog({
      title: 'Delete Product',
      description: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmLabel: 'Delete',
      isDanger: true,
      onConfirm: async () => { await deleteInventoryItem(id); },
    });
  };

  const handleAddToyBoxSerials = async (e) => {
    e.preventDefault();

    if (!toyBoxProductName) {
      showWarning('Select a product for these serials.', 'Validation Error');
      return;
    }

    const requested = toyBoxSerialInput
      .split(/[,\s]+/)
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value > 0);

    const uniqueRequested = [...new Set(requested)];
    const existing = new Set(
      (toyBoxes || [])
        .filter((box) => (box.product_name || 'TOY BOX') === toyBoxProductName)
        .map((box) => Number(box.toy_box_number))
    );
    const entries = uniqueRequested
      .filter((serial) => !existing.has(serial))
      .map((serial) => ({
        product_name: toyBoxProductName,
        toy_box_number: serial,
        stock_quantity: toyBoxInitialStock
      }));

    if (entries.length === 0) {
      showInfo('No new serial numbers found to add.', 'Nothing to Add');
      return;
    }

    try {
      await addToyBoxStocks(entries);
      setToyBoxSerialInput('');
      setToyBoxInitialStock(0);
      setToyBoxProductName('');
      setIsToyBoxModalOpen(false);
    } catch (error) {
      console.error('Failed to add toy box serials:', error);
      showError(error?.message || 'Failed to add serial numbers. Please try again.', 'Add Serials Failed');
    }
  };

  const handleOpenInvoiceModal = () => {
    setIsInvoiceModalOpen(true);
    setInvoiceError('');
    setInvoicePreview(null);
    setIsReviewModalOpen(false);
    setInvoiceStockMode('add');
  };

  const handlePreviewInvoice = async () => {
    if (!invoiceText.trim()) {
      setInvoiceError('Please paste invoice lines first.');
      return;
    }

    setIsPreviewingInvoice(true);
    setInvoiceError('');
    try {
      const preview = await previewInvoiceStockUpdate(invoiceText, { preferManualBulk: useManualBulkMode, stockMode: invoiceStockMode });
      setInvoicePreview(preview);
    } catch (error) {
      setInvoiceError(error?.message || 'Failed to analyze invoice.');
      setInvoicePreview(null);
    } finally {
      setIsPreviewingInvoice(false);
    }
  };

  const handleApplyInvoiceSync = async () => {
    if (!invoicePreview) {
      await handlePreviewInvoice();
      return;
    }
    setInvoiceError('');
    setIsReviewModalOpen(true);
  };

  const [reviewError, setReviewError] = useState('');
  const [invoiceSuccess, setInvoiceSuccess] = useState('');

  const handleFinalConfirmApply = async () => {
    if (!invoicePreview || !(invoicePreview?.matched?.length > 0)) return;

    setIsApplyingInvoice(true);
    setReviewError('');
    setInvoiceError('');
    try {
      const result = await applyInvoiceStockUpdate(invoiceText, {
        preferManualBulk: useManualBulkMode,
        confirmCommand,
        stockMode: invoiceStockMode
      });
      const appliedCount = result?.applied?.length || result?.matched?.length || 0;
      const totalChanged = result?.summary?.totalDeducted || result?.summary?.totalQty || 0;
      const modeLabel = invoiceStockMode === 'add' ? 'added' : 'deducted';

      // Close both modals
      setIsReviewModalOpen(false);
      setIsInvoiceModalOpen(false);

      // Reset all invoice state
      setInvoiceText('');
      setInvoicePreview(null);
      setInvoiceError('');
      setReviewError('');

      // Show success feedback
      setInvoiceSuccess(`✅ Stock updated successfully! ${appliedCount} item(s) affected, ${totalChanged} total units ${modeLabel}.`);
      setTimeout(() => setInvoiceSuccess(''), 6000);
    } catch (error) {
      console.error('Invoice apply error:', error);
      setReviewError(error?.message || 'Failed to apply inventory update from invoice.');
    } finally {
      setIsApplyingInvoice(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor stock levels, manage products, and track warehouse movements.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleOpenInvoiceModal} className="gap-2">
            <Bot size={16} /> <span>AI Invoice Sync</span>
          </Button>
          <Button onClick={() => handleOpenProductModal()} className="gap-2 bg-primary text-primary-foreground">
            <Plus size={16} /> <span>Add New Product</span>
          </Button>
        </div>
      </div>

      {invoiceSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 p-4 text-sm font-medium dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span>{invoiceSuccess}</span>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 p-4 mb-4 flex items-center gap-3 text-amber-800 dark:text-amber-200 animate-in slide-in-from-top-2">
          <AlertTriangle size={20} className="shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Low Stock Alert</p>
            <p className="text-xs opacity-90">{lowStockItems.length} products are running low on inventory.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
             <div className="text-muted-foreground text-xs font-medium flex items-center gap-2"><Package size={14} className="text-blue-500"/> Total Products</div>
             <div className="text-2xl font-bold text-foreground">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
             <div className="text-muted-foreground text-xs font-medium flex items-center gap-2"><AlertTriangle size={14} className="text-orange-500"/> Low Stock Items</div>
             <div className="text-2xl font-bold text-foreground">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
             <div className="text-muted-foreground text-xs font-medium flex items-center gap-2"><Package size={14} className="text-red-500"/> Out of Stock</div>
             <div className="text-2xl font-bold text-foreground">{outOfStockItems.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
             <div className="text-muted-foreground text-xs font-medium flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500"/> Stock Value</div>
             <div className="text-xl font-bold text-foreground">৳{totalInventoryValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hidden lg:block">
          <CardContent className="p-4 flex flex-col gap-1">
             <div className="text-muted-foreground text-xs font-medium flex items-center gap-2"><BarChart2 size={14} className="text-purple-500"/> Stock COGS</div>
             <div className="text-xl font-bold text-foreground">৳{totalCOGSValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-card border border-border p-2 rounded-xl shadow-sm">
          <div className="flex-1 w-full relative">
            <PremiumSearch
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name or SKU..."
              suggestions={
                searchTerm ? (inventory || []).filter(p => 
                  p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 5).map(p => ({
                  id: p.id,
                  label: p.name,
                  sub: `SKU: ${p.sku || 'N/A'} — Stock: ${p.current_stock}`,
                  type: 'product',
                  original: p
                })) : []
              }
              onSuggestionClick={(item) => {
                if (item.type === 'product') {
                  setSearchTerm(item.label);
                }
              }}
            />
          </div>
          <div className="hidden md:block w-px h-8 bg-border"></div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none md:pb-0 px-2 w-full md:w-auto">
              {pageCategories.map(cat => (
                <button
                  key={cat}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
          {filteredInventory.map(item => {
             const stockStatus = item.current_stock === 0 ? 'Out of Stock' :
               item.current_stock <= item.min_stock_level ? 'Low Stock' : 'In Stock';
             
             const sellingPrice = Number(item.selling_price) || Number(item.unit_price) || 0;
             const resolvedImage = resolveInventoryImage(item, storefrontProducts);

             return (
               <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-md transition-shadow group animate-slide-up flex flex-col">
                  {/* Card Product Image */}
                  <div className="aspect-square bg-muted/40 overflow-hidden relative group/img flex items-center justify-center border-b border-border/50">
                     {resolvedImage ? (
                       <img
                         src={resolvedImage}
                         alt={item.name}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                         loading="lazy"
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           const fallback = e.currentTarget.parentElement?.querySelector('.inventory-fallback-placeholder');
                           if (fallback) fallback.classList.remove('hidden');
                         }}
                       />
                     ) : null}
                     <div className={cn(
                       "inventory-fallback-placeholder flex-col items-center justify-center text-muted-foreground/40 p-4",
                       resolvedImage ? "hidden" : "flex"
                     )}>
                        <Package size={42} className="group-hover:scale-110 transition-transform duration-300 opacity-60" />
                        <span className="text-[10px] font-semibold text-muted-foreground/60 mt-1 uppercase tracking-wider">No Image</span>
                     </div>
                     <div className="absolute top-2.5 right-2.5 z-10">
                        <StatusBadge status={stockStatus} size="sm" />
                     </div>
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.sku || 'No SKU'}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px] uppercase font-semibold">{item.category}</Badge>
                      </div>

                      {Array.isArray(item.variants) && item.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.variants.slice(0, 3).map((v, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-secondary-foreground border border-border/50 font-mono">
                              {v.size || '—'}/{v.color || '—'}: <b className="text-foreground">{v.stock}</b>
                            </span>
                          ))}
                          {item.variants.length > 3 && (
                            <span className="text-[9px] px-1.5 py-0.5 text-muted-foreground">+{item.variants.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex items-end justify-between">
                         <div>
                            <div className="text-xs text-muted-foreground mb-1">Price</div>
                            <div className="font-bold text-lg text-foreground flex items-center">
                               <CurrencyIcon size={14} className="mr-1 text-muted-foreground" />
                               {sellingPrice.toLocaleString()}
                            </div>
                         </div>
                         <div className="text-right">
                             <div className="text-xs text-muted-foreground mb-1">Stock</div>
                             <div className="font-semibold text-foreground">{item.current_stock} <span className="text-xs font-normal text-muted-foreground">pcs</span></div>
                         </div>
                      </div>
                      
                      {/* actions */}
                      <div className="flex items-center justify-between gap-1 mt-4 pt-4 border-t border-border">
                         <Button variant="secondary" size="sm" className="flex-1 text-xs h-8" onClick={() => handleOpenAdjustModal(item)}>
                            <Plus size={14} className="mr-1" /> Stock
                         </Button>
                         <div className="flex items-center gap-0.5">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={() => handleOpenProductModal(item)}>
                                 <Edit2 size={14} />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(item.id)}>
                                 <Trash2 size={14} />
                             </Button>
                         </div>
                      </div>
                  </div>
               </div>
             );
          })}
          {!loading && filteredInventory.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
               <Search size={40} className="mb-4 opacity-50" />
               <h3 className="text-lg font-semibold text-foreground mb-2">No products found</h3>
               <p className="text-sm mb-4">Try adjusting your search or category filters.</p>
               <Button variant="outline" onClick={() => { setSearchTerm(''); setCategoryFilter('All'); }}>
                 Clear All Filters
               </Button>
            </div>
          )}
      </div>

      {/* Toy Box Special Inventory Section */}
      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Serial Stock Products</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage {toyBoxes.length} tracked serial units.</p>
            </div>
          </div>
          <div>
            <Button
              onClick={() => {
                setToyBoxProductName(serialTrackedProducts[0]?.name || '');
                setIsToyBoxModalOpen(true);
              }}
              className="gap-2 w-full md:w-auto"
            >
              <Plus size={16} /> Add Serials
            </Button>
          </div>
        </div>

        <div className="p-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(toyBoxGroups)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([productName, productBoxes]) => (
              <div key={productName} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-semibold text-sm text-foreground line-clamp-1" title={productName}>{productName}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{productBoxes.length} serials</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[...productBoxes]
                    .sort((a, b) => a.toy_box_number - b.toy_box_number)
                    .map((box) => (
                      <div key={box.id} className={cn(
                        "flex flex-col p-2 rounded-lg border",
                        box.stock_quantity === 0 ? "bg-destructive/5 border-destructive/20" : 
                        box.stock_quantity <= 5 ? "bg-amber-500/5 border-amber-500/20" : 
                        "bg-secondary/30 border-border"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-semibold text-foreground">#{box.toy_box_number}</span>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            box.stock_quantity === 0 ? "bg-destructive" :
                            box.stock_quantity <= 5 ? "bg-amber-500" :
                            "bg-emerald-500"
                          )} />
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            min="0"
                            defaultValue={box.stock_quantity}
                            onBlur={(e) => {
                              const newVal = parseInt(e.target.value, 10);
                              if (!isNaN(newVal) && newVal !== box.stock_quantity) {
                                updateToyBoxStock(box.id, newVal);
                              }
                            }}
                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-[10px] text-muted-foreground">pcs</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        size="3xl"
        className="max-w-5xl lg:max-w-6xl w-full"
        title={editingProduct ? 'Edit Product Details' : 'Register New Product'}
        subtitle={editingProduct ? 'Refine inventory details, stock thresholds, and price without breaking flow.' : 'Create a clean product record with pricing and stock logic.'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
          <div className="flex gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border text-xs">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 h-fit">
              <Package size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Catalog Setup</span>
              <h3 className="font-semibold text-foreground mt-0.5 text-sm">{editingProduct ? 'Polish this inventory record' : 'Add a new product with confidence'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Keep identity, stock alerts, and pricing structured so inventory stays clean, searchable, and premium.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-1.5 text-muted-foreground font-sans">Product Identity</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Product Name</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Enter full product name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">SKU / Identifier</label>
                  <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="SKU-XXX" />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <div className="relative">
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none" 
                      value={formData.category} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {pageCategories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-1.5 text-muted-foreground font-sans">Stock & Pricing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Initial Inventory</label>
                <Input
                  type="number"
                  value={formData.variants?.length > 0
                    ? formData.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
                    : formData.current_stock
                  }
                  onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                  required
                  disabled={formData.variants?.length > 0}
                />
                {formData.variants?.length > 0 && <p className="text-[11px] text-muted-foreground">Calculated from variants</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Min Alert Level</label>
                <Input type="number" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">Selling Price <CurrencyIcon size={12} /></label>
                <Input
                  type="number"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  required
                  placeholder="Customer price"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">Making Cost <CurrencyIcon size={12} /></label>
                <Input
                  type="number"
                  value={formData.making_cost}
                  onChange={(e) => setFormData({ ...formData, making_cost: parseFloat(e.target.value) || 0 })}
                  placeholder="Production cost"
                />
              </div>
            </div>
          </div>

          {/* Section: Product Media & Color-Wise Photos */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-1.5 text-muted-foreground font-sans flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon size={14} className="text-primary" /> Product Image & Gallery
              </span>
              <span className="text-[10px] normal-case text-muted-foreground font-normal">Primary cover photo + color specific images</span>
            </h4>

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={mainImageFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleMainImageUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <input
              type="file"
              ref={colorFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && activeColorForUploadRef.current) {
                  handleColorImageUpload(e.target.files[0], activeColorForUploadRef.current);
                  e.target.value = '';
                }
              }}
            />

            {/* Main Cover Image Uploader & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Primary / Cover Image</span>
                {(formData.image || formData.image_url) && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '', image_url: '' }))}
                    className="text-[11px] text-destructive hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </label>

              {(formData.image || formData.image_url) ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-border bg-muted/40 shrink-0">
                    <img
                      src={formData.image || formData.image_url}
                      alt="Primary product"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 size={14} />
                      <span>Primary Image Attached</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-sm font-mono">
                      {formData.image || formData.image_url}
                    </p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setMainImageMediaModalOpen(true)}
                        className="h-7 text-xs font-bold"
                      >
                        <FolderOpen size={12} className="mr-1 text-primary" />
                        From Media
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUploadingMainImage}
                        onClick={() => mainImageFileInputRef.current?.click()}
                        className="h-7 text-xs font-bold"
                      >
                        {isUploadingMainImage ? <Loader2 size={12} className="animate-spin mr-1" /> : <UploadCloud size={12} className="mr-1" />}
                        Upload New
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(formData.image || formData.image_url, '_blank')}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink size={12} className="mr-1" />
                        View Full
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 text-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center gap-2">
                  {isUploadingMainImage ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-xs font-bold text-foreground">Uploading Image to CDN...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-muted-foreground/60 mx-auto mb-0.5" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Add Primary Product Image
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                          Select from existing Media Library or upload a new image
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setMainImageMediaModalOpen(true)}
                          className="h-8 text-xs font-bold shadow-2xs"
                        >
                          <FolderOpen size={13} className="mr-1.5 text-primary" />
                          Select from Media
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => mainImageFileInputRef.current?.click()}
                          className="h-8 text-xs font-bold shadow-2xs"
                        >
                          <UploadCloud size={13} className="mr-1.5" />
                          Upload New File
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Direct URL input fallback */}
              <div className="pt-1">
                <Input
                  value={formData.image || formData.image_url || ''}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value, image_url: e.target.value })}
                  placeholder="Or paste direct image URL (https://...)"
                  className="h-8 text-xs font-mono text-muted-foreground focus:text-foreground"
                />
              </div>
            </div>

            {/* Additional Gallery Image URLs */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Additional Gallery Images</label>
                <button
                  type="button"
                  onClick={() => setGalleryMediaModalOpen(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen size={12} />
                  <span>Select from Media</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={Array.isArray(formData.images) ? formData.images.join('\n') : (formData.images || '')}
                onChange={(e) => {
                  const urls = e.target.value.split(/[\n,]/).map(u => u.trim()).filter(Boolean);
                  setFormData({ ...formData, images: urls });
                }}
                placeholder="https://... photo 1&#10;https://... photo 2"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            {/* Color-Specific Photos Mapping */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  🎨 Color-Wise Specific Photos
                </span>
                <span className="text-[10px] text-muted-foreground">Photos shown when a specific color is selected</span>
              </div>

              {/* Grid of detected colors */}
              {(() => {
                const uniqueColors = Array.from(new Set([
                  ...colorsInput.split(',').map(c => c.trim()).filter(Boolean),
                  ...((formData.variants || []).map(v => v.color).filter(Boolean)),
                  ...Object.keys(formData.color_images || {})
                ]));

                if (uniqueColors.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground italic py-1">
                      Enter colors in the Variations generator below to map color-wise photos.
                    </p>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {uniqueColors.map((color) => {
                      const currentUrl = formData.color_images?.[color] || '';
                      const isColorUploading = uploadingColorKey === color;
                      return (
                        <div key={color} className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wide px-2 py-0.5 rounded-md bg-secondary/60 border border-border">
                              {color}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setColorMediaModalTarget(color)}
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-primary/5 cursor-pointer"
                              >
                                <FolderOpen size={11} /> Media
                              </button>
                              <button
                                type="button"
                                disabled={isColorUploading}
                                onClick={() => {
                                  activeColorForUploadRef.current = color;
                                  colorFileInputRef.current?.click();
                                }}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary cursor-pointer disabled:opacity-50"
                              >
                                <UploadCloud size={11} /> Upload
                              </button>
                              {currentUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => {
                                      const updatedColorImages = { ...(prev.color_images || {}) };
                                      delete updatedColorImages[color];
                                      const updatedVariants = (prev.variants || []).filter(
                                        v => v.color?.toLowerCase() !== color.toLowerCase()
                                      );
                                      return {
                                        ...prev,
                                        color_images: updatedColorImages,
                                        variants: updatedVariants
                                      };
                                    });
                                  }}
                                  className="text-muted-foreground hover:text-destructive text-[11px] p-1 transition-colors cursor-pointer"
                                  title="Remove this color photo"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl border border-border overflow-hidden bg-secondary/30 shrink-0 flex items-center justify-center relative shadow-2xs">
                              {isColorUploading ? (
                                <Loader2 size={16} className="animate-spin text-primary" />
                              ) : currentUrl ? (
                                <img src={currentUrl} alt={color} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] font-bold text-muted-foreground text-center px-1">No Pic</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Input
                                className="h-8 text-xs px-2.5 font-mono w-full"
                                placeholder={`Photo URL for ${color}`}
                                value={currentUrl}
                                onChange={(e) => {
                                  const newUrl = e.target.value;
                                  const updatedColorImages = { ...(formData.color_images || {}), [color]: newUrl };
                                  const updatedVariants = (formData.variants || []).map(v => {
                                    if (v.color?.toLowerCase() === color.toLowerCase()) {
                                      return { ...v, image_url: newUrl };
                                    }
                                    return v;
                                  });
                                  setFormData({
                                    ...formData,
                                    color_images: updatedColorImages,
                                    variants: updatedVariants
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Media Picker Modals for Inventory Modal */}
            <MediaPickerModal
              isOpen={mainImageMediaModalOpen}
              onClose={() => setMainImageMediaModalOpen(false)}
              onSelect={(urls) => {
                if (urls && urls[0]) {
                  const clean = cleanImageUrl(urls[0]);
                  setFormData(prev => ({
                    ...prev,
                    image: clean || urls[0],
                    image_url: clean || urls[0],
                    images: prev.images?.length > 0 ? [clean || urls[0], ...prev.images.filter(img => img !== (clean || urls[0]))] : [clean || urls[0]]
                  }));
                }
              }}
              multiple={false}
              initialSelectedUrls={formData.image || formData.image_url ? [formData.image || formData.image_url] : []}
              title="Select Primary Product Image"
            />

            <MediaPickerModal
              isOpen={Boolean(colorMediaModalTarget)}
              onClose={() => setColorMediaModalTarget(null)}
              onSelect={(urls) => {
                if (colorMediaModalTarget && urls && urls[0]) {
                  const clean = cleanImageUrl(urls[0]);
                  const color = colorMediaModalTarget;
                  setFormData(prev => {
                    const updatedColorImages = { ...(prev.color_images || {}), [color]: clean || urls[0] };
                    const updatedVariants = (prev.variants || []).map(v => {
                      if (v.color?.toLowerCase() === color.toLowerCase()) {
                        return { ...v, image_url: clean || urls[0] };
                      }
                      return v;
                    });
                    return {
                      ...prev,
                      color_images: updatedColorImages,
                      variants: updatedVariants
                    };
                  });
                }
                setColorMediaModalTarget(null);
              }}
              multiple={false}
              initialSelectedUrls={colorMediaModalTarget && formData.color_images?.[colorMediaModalTarget] ? [formData.color_images[colorMediaModalTarget]] : []}
              title={`Select Photo for ${colorMediaModalTarget || 'Color'}`}
            />

            <MediaPickerModal
              isOpen={galleryMediaModalOpen}
              onClose={() => setGalleryMediaModalOpen(false)}
              onSelect={(urls) => {
                if (urls && urls.length > 0) {
                  const cleaned = urls.map(u => cleanImageUrl(u)).filter(Boolean) as string[];
                  const existing = Array.isArray(formData.images) ? formData.images : [];
                  setFormData(prev => ({
                    ...prev,
                    images: Array.from(new Set([...existing, ...cleaned]))
                  }));
                }
              }}
              multiple={true}
              initialSelectedUrls={Array.isArray(formData.images) ? formData.images : []}
              title="Select Additional Gallery Images"
            />
          </div>

          {/* Section: Product Variations */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-1.5 text-muted-foreground font-sans">Product Variations</h4>
            
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-3">Bulk Variation Generator</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Sizes (comma separated)</label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="S, M, L, XL"
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Colors (comma separated)</label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Black, White, Grey"
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={generateVariantCombinations} className="text-xs h-8">
                  Generate Combinations
                </Button>
              </div>
            </div>

            {(!formData.variants || formData.variants.length === 0) ? (
              <div className="py-8 text-center border border-dashed border-border rounded-2xl bg-background/50">
                <p className="text-xs text-muted-foreground">No variations added yet. Click Generate or Add Row to start.</p>
              </div>
            ) : (
              <>
                {/* 1. Desktop & Tablet Responsive Data Table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-bold w-24 min-w-[80px]">Size</th>
                        <th className="py-2.5 px-3 font-bold w-32 min-w-[110px]">Color</th>
                        <th className="py-2.5 px-3 font-bold min-w-[220px]">Color Image URL</th>
                        <th className="py-2.5 px-3 font-bold w-36 min-w-[130px]">SKU</th>
                        <th className="py-2.5 px-3 font-bold w-24 min-w-[85px] text-center">Stock</th>
                        <th className="py-2.5 px-3 font-bold w-20 min-w-[70px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {formData.variants.map((v, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2.5">
                            <Input className="h-8 text-xs px-2 font-bold" placeholder="S" value={v.size || ''} onChange={(e) => handleVariantChange(idx, 'size', e.target.value)} />
                          </td>
                          <td className="p-2.5">
                            <Input className="h-8 text-xs px-2 font-medium" placeholder="Black" value={v.color || ''} onChange={(e) => handleVariantChange(idx, 'color', e.target.value)} />
                          </td>
                          <td className="p-2.5">
                            <Input className="h-8 text-xs px-2 font-mono text-muted-foreground focus:text-foreground" placeholder="https://... photo URL" value={v.image_url || v.image || ''} onChange={(e) => handleVariantChange(idx, 'image_url', e.target.value)} />
                          </td>
                          <td className="p-2.5">
                            <Input className="h-8 text-xs px-2 font-mono" placeholder="SKU" value={v.sku || ''} onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)} />
                          </td>
                          <td className="p-2.5">
                            <Input type="number" className="h-8 text-xs px-2 font-mono font-bold text-center" placeholder="0" value={v.stock} onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value) || 0)} />
                          </td>
                          <td className="p-2.5 text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeVariantRow(idx)} className="h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg font-bold text-xs">
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Responsive Variation Cards (< 640px) */}
                <div className="sm:hidden space-y-3">
                  {formData.variants.map((v, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary uppercase font-mono px-2 py-0.5 rounded-md bg-primary/10">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {v.size || 'Size'} / {v.color || 'Color'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariantRow(idx)}
                          className="h-7 px-2 text-destructive hover:bg-destructive/10 text-xs font-bold"
                        >
                          <Trash2 size={12} className="mr-1" /> Delete
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Size</label>
                          <Input className="h-8 text-xs px-2 font-bold" placeholder="e.g. M" value={v.size || ''} onChange={(e) => handleVariantChange(idx, 'size', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Color</label>
                          <Input className="h-8 text-xs px-2" placeholder="e.g. Black" value={v.color || ''} onChange={(e) => handleVariantChange(idx, 'color', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">SKU</label>
                          <Input className="h-8 text-xs px-2 font-mono" placeholder="SKU" value={v.sku || ''} onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Stock (pcs)</label>
                          <Input type="number" className="h-8 text-xs px-2 font-mono font-bold" placeholder="0" value={v.stock} onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value) || 0)} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Photo URL</label>
                        <Input className="h-8 text-xs px-2 font-mono" placeholder="https://..." value={v.image_url || v.image || ''} onChange={(e) => handleVariantChange(idx, 'image_url', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div>
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow} className="text-xs h-8">
                <Plus size={14} className="mr-1" /> Add Row
              </Button>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors">
            <input
              type="checkbox"
              className="mt-1 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 h-4 w-4"
              checked={formData.supports_serial_tracking}
              onChange={(e) => setFormData({ ...formData, supports_serial_tracking: e.target.checked })}
            />
            <div>
              <strong className="block text-sm font-medium text-foreground">Enable serial-wise stock tracking</strong>
              <span className="text-xs text-muted-foreground">Use this for products that need per-unit inventory control like Toy Box variants.</span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSavingProduct} className="gap-2 bg-primary text-primary-foreground font-bold">
              {isSavingProduct && <Loader2 size={16} className="animate-spin" />}
              {isSavingProduct ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Quick Inventory Adjustment">
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-6">
            <Badge variant="secondary" className="mb-2">{adjustingProduct?.category}</Badge>
            <h3 className="text-xl font-bold text-foreground">{adjustingProduct?.name}</h3>
            <p className="text-sm text-muted-foreground">Current Stock: <span className="font-semibold text-foreground">{adjustingProduct?.current_stock}</span></p>
          </div>

          <div className="flex p-1 bg-secondary rounded-xl mb-6">
            <button 
              className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors", adjustType === 'add' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setAdjustType('add')}
            >
              <ArrowUpRight size={16} className="text-emerald-500" /> Restock
            </button>
            <button 
              className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors", adjustType === 'deduct' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setAdjustType('deduct')}
            >
              <ArrowDownRight size={16} className="text-destructive" /> Deduct
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Adjustment Quantity</label>
            <Input type="number" min="1" value={adjustAmount} onChange={(e) => setAdjustAmount(parseInt(e.target.value))} className="text-center text-lg h-12" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock} className={cn(adjustType === 'deduct' && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
              Confirm Transaction
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isToyBoxModalOpen} onClose={() => setIsToyBoxModalOpen(false)} title="Add Toy Box Serials">
        <form onSubmit={handleAddToyBoxSerials} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Product</label>
            <div className="relative">
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none" 
                value={toyBoxProductName} 
                onChange={(e) => setToyBoxProductName(e.target.value)} 
                required
              >
                <option value="">Select serial-tracked product</option>
                {serialTrackedProducts.map((product) => <option key={product.name} value={product.name}>{product.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Serial Numbers</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={toyBoxSerialInput}
              onChange={(e) => setToyBoxSerialInput(e.target.value)}
              placeholder="41,42,43,44,45"
              rows={4}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Initial Stock Per Serial</label>
            <Input
              type="number"
              min="0"
              value={toyBoxInitialStock}
              onChange={(e) => setToyBoxInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsToyBoxModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Serials</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} size="xl" title="AI Invoice → Inventory Stock Sync">
        <div className="space-y-6">
          <div className="flex gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg shrink-0 h-fit">
              <Bot size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Smart Stock Workflow</span>
              <h3 className="font-semibold text-foreground mt-1">Paste invoice lines and let the parser organize the update</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manual bulk format supported: <b className="text-foreground">toybox1 4 pis,, toybox2 10 pis</b>. Multiple commas, line breaks, and extra spaces are handled.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex p-1 bg-secondary rounded-lg">
              <button 
                className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors", invoiceStockMode === 'add' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setInvoiceStockMode('add')}
              >
                <ArrowUpRight size={16} className="text-emerald-500" /> Add Stock
              </button>
              <button 
                className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors", invoiceStockMode === 'deduct' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setInvoiceStockMode('deduct')}
              >
                <ArrowDownRight size={16} className="text-destructive" /> Deduct Stock
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 h-4 w-4"
                checked={useManualBulkMode}
                onChange={(e) => setUseManualBulkMode(e.target.checked)}
              />
              Use Manual Bulk Parser (recommended for toybox style input)
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Invoice Input</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={invoiceText}
              onChange={(e) => setInvoiceText(e.target.value)}
              placeholder={'2x Organizer\nToy Box - 3\nGift Bag x 1'}
              rows={8}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handlePreviewInvoice} disabled={isPreviewingInvoice || isApplyingInvoice} className="flex-1">
              {isPreviewingInvoice ? <Loader2 size={16} className="animate-spin mr-2" /> : <Search size={16} className="mr-2" />} Preview Detection
            </Button>
            <Button onClick={handleApplyInvoiceSync} disabled={isPreviewingInvoice || isApplyingInvoice} className="flex-1">
              <CheckCircle2 size={16} className="mr-2" /> Review & Continue
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground font-medium">Flow: Preview → Modal Review → Final Confirm</p>

          {invoiceError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
              <CircleAlert size={16} />
              <span>{invoiceError}</span>
            </div>
          )}

          {invoicePreview && (
            <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
              <div className="flex flex-wrap gap-4 text-sm bg-background p-3 rounded-lg border border-border">
                <span className="text-muted-foreground">Parsed: <b className="text-foreground">{invoicePreview.summary?.lines || 0}</b></span>
                <span className="text-muted-foreground">Matched: <b className="text-foreground">{invoicePreview.summary?.matchedLines || 0}</b></span>
                <span className="text-muted-foreground">Unmatched: <b className="text-foreground">{invoicePreview.summary?.unmatchedLines || 0}</b></span>
                <span className="text-muted-foreground">Total Qty: <b className="text-foreground">{invoicePreview.summary?.totalQty || 0}</b></span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Matched Products</h4>
                  {invoicePreview.matched?.length ? (
                    <div className="space-y-2">
                      {invoicePreview.matched.map((m) => (
                        <div key={m.inventory_id} className="p-3 rounded-lg bg-background border border-emerald-500/20 shadow-sm">
                          <strong className="block text-sm text-foreground">{m.inventory_name}</strong>
                          <p className="text-xs text-muted-foreground mt-1">
                            {invoiceStockMode === 'add' ? 'Add' : 'Deduct'}: {m.quantity} &bull; Stock: {m.current_stock} &rarr; {m.next_stock}
                            {m.shortfall > 0 ? ` • Shortfall: ${m.shortfall}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No matched products detected.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Unmatched Lines</h4>
                  {invoicePreview.unmatched?.length ? (
                    <div className="space-y-2">
                      {invoicePreview.unmatched.map((u, idx) => (
                        <div key={`${u.sourceLine}-${idx}`} className="p-3 rounded-lg bg-background border border-amber-500/20 shadow-sm">
                          <strong className="block text-sm text-foreground font-mono">{u.sourceLine}</strong>
                          {u.reason && <p className="text-xs text-amber-600/80 mt-1">{u.reason}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">All parsed lines matched inventory.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} size="xl" title="Review Pending Inventory Changes">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            This is a review-only step. Press final <b className="text-foreground">Confirm</b> to apply; cancel/close/ESC/outside click will apply nothing.
          </p>

          <div className="flex flex-wrap gap-4 text-sm bg-secondary/50 p-3 rounded-lg border border-border">
            <span className="text-muted-foreground">Affected Items: <b className="text-foreground">{invoicePreview?.matched?.length || 0}</b></span>
            <span className="text-muted-foreground">Skipped Items: <b className="text-foreground">{invoicePreview?.unmatched?.length || 0}</b></span>
            <span className="text-muted-foreground">Total Qty Change: <b className="text-foreground">{invoicePreview?.summary?.totalQty || 0}</b></span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground sticky top-0 bg-card py-1">Matched (Will Apply)</h4>
              {invoicePreview?.matched?.length ? (
                <div className="space-y-2">
                  {invoicePreview.matched.map((m) => (
                    <div key={`review-${m.inventory_id}`} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <strong className="block text-sm text-foreground">{m.inventory_name}</strong>
                      <p className="text-xs text-muted-foreground mt-1">{invoiceStockMode === 'add' ? 'Add' : 'Deduct'}: {m.quantity} &bull; Stock: {m.current_stock} &rarr; {m.next_stock}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No matched products. Nothing will be updated.</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground sticky top-0 bg-card py-1">Unmatched / Skipped</h4>
              {invoicePreview?.unmatched?.length ? (
                <div className="space-y-2">
                  {invoicePreview.unmatched.map((u, idx) => (
                    <div key={`review-unmatched-${idx}`} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <strong className="block text-sm text-foreground font-mono">{u.sourceLine}</strong>
                      {u.reason && <p className="text-xs text-muted-foreground mt-1">{u.reason}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No skipped lines.</p>
              )}
            </div>
          </div>

          {reviewError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
              <CircleAlert size={16} />
              <span>{reviewError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" type="button" onClick={() => { setIsReviewModalOpen(false); setReviewError(''); }} disabled={isApplyingInvoice}>Cancel</Button>
            <Button type="button" onClick={handleFinalConfirmApply} disabled={isApplyingInvoice || !(invoicePreview?.matched?.length > 0)} className="gap-2">
              {isApplyingInvoice ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {ConfirmDialogComponent}
    </div>
  );
};
