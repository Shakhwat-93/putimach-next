'use client';
// @ts-nocheck
// admin/src/pages/StorefrontManagement.jsx
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './StorefrontManagement.css';
import { supabase } from '../lib/supabase';
import { convertToWebP } from '../utils/image';
import {
  Package, 
  Layers, 
  Sliders, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Check, 
  CheckCircle,
  X, 
  Search, 
  Loader2, 
  Eye, 
  Sparkles,
  Upload,
  Menu
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Modal } from '../components/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';

// Reusable Image Upload Input Component connected to Supabase Storage
import { uploadImage } from '../lib/uploadHelper';

const ImageUploadInput = ({ label, value, onChange, placeholder, required = false, local = false }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file, local);
      if (url) {
        onChange(url);
      } else {
        throw new Error('Could not process image URL');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 md:col-span-2 w-full">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center w-full">
        <input
          type="text"
          className="flex h-10 w-full min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <label 
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer shrink-0 shadow-sm transition-all"
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Upload File</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>
      {value && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
          <span className="font-bold text-primary shrink-0">Preview:</span>
          <a href={value} target="_blank" rel="noreferrer" className="underline truncate text-xs hover:text-foreground">{value}</a>
        </div>
      )}
    </div>
  );
};

// Reusable Multiple Image Upload Input Component connected to Supabase Storage
const MultipleImageUploadInput = ({ label, value = [], onChange }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        if (url) uploadedUrls.push(url);
      }

      onChange([...value, ...uploadedUrls]);
    } catch (err) {
      console.error('Multiple upload error:', err);
      alert('Failed to upload image(s): ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove) => {
    const updated = value.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const moveImage = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= value.length) return;
    const updated = [...value];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2 md:col-span-2" style={{ gridColumn: '1 / -1' }}>
      <label className="text-sm font-medium text-foreground" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{value.length} images uploaded</span>
      </label>
      
      {/* Upload area */}
      <div style={{ marginBottom: '16px' }}>
        <label 
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            padding: '10px 20px',
            borderRadius: '100px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Uploading Multiple...</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Upload Images</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Preview Grid */}
      {value.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
          gap: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          {value.map((url, idx) => (
            <div 
              key={idx} 
              style={{ 
                position: 'relative', 
                aspectRatio: '1', 
                borderRadius: '6px', 
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
              className="mult-img-thumb"
            >
              <img 
                src={url} 
                alt={`Product image ${idx + 1}`} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              {/* Overlays for delete and move */}
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'rgba(0,0,0,0.6)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  padding: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                className="mult-img-overlay"
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.9)', 
                      border: 'none', 
                      color: 'white', 
                      borderRadius: '4px', 
                      padding: '4px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                  <button 
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveImage(idx, -1)}
                    style={{ 
                      background: 'rgba(255,255,255,0.2)', 
                      border: 'none', 
                      color: 'white', 
                      borderRadius: '4px', 
                      padding: '2px 6px', 
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '10px', color: 'white', alignSelf: 'center', fontWeight: 'bold' }}>#{idx + 1}</span>
                  <button 
                    type="button"
                    disabled={idx === value.length - 1}
                    onClick={() => moveImage(idx, 1)}
                    style={{ 
                      background: 'rgba(255,255,255,0.2)', 
                      border: 'none', 
                      color: 'white', 
                      borderRadius: '4px', 
                      padding: '2px 6px', 
                      cursor: idx === value.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Reusable Color-Wise Image Manager Component with Direct Image Uploading and Color Tagging
const ColorImagesEditor = ({ colors = '', colorImages = {}, onChange, onColorsChange, onRemoveColor }) => {
  const [uploadingColor, setUploadingColor] = useState(null);

  const parsedColors = typeof colors === 'string'
    ? colors.split(',').map(c => c.trim()).filter(Boolean)
    : (Array.isArray(colors) ? colors : []);

  // Extract all active unique colors from either the comma text or colorImages map
  const colorList = Array.from(new Set([
    ...parsedColors,
    ...Object.keys(colorImages || {})
  ]));

  const [newColorInput, setNewColorInput] = useState('');

  const handleAddColor = () => {
    const trimmed = newColorInput.trim();
    if (!trimmed) return;
    if (!colorList.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      const updatedColors = [...colorList, trimmed].join(', ');
      const updatedMap = { ...(colorImages || {}), [trimmed]: '' };
      if (onRemoveColor) {
        onRemoveColor(null, updatedMap, updatedColors);
      } else {
        onChange(updatedMap);
        onColorsChange(updatedColors);
      }
    }
    setNewColorInput('');
  };

  const handleRemoveColor = (colorToRemove) => {
    const updatedMap = { ...(colorImages || {}) };
    delete updatedMap[colorToRemove];

    const updatedColorList = colorList.filter(c => c.toLowerCase() !== colorToRemove.toLowerCase());
    const updatedColors = updatedColorList.join(', ');

    if (onRemoveColor) {
      onRemoveColor(colorToRemove, updatedMap, updatedColors);
    } else {
      onChange(updatedMap);
      onColorsChange(updatedColors);
    }
  };

  const handleImageUrlChange = (color, url) => {
    const updatedMap = { ...(colorImages || {}), [color]: url };
    onChange(updatedMap);
  };

  const handleUploadFile = async (color, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingColor(color);
    try {
      const url = await uploadImage(file);
      if (url) {
        const updatedMap = { ...(colorImages || {}), [color]: url };
        onChange(updatedMap);
      }
    } catch (err) {
      console.error('Color image upload error:', err);
      alert('Upload failed: ' + (err.message || 'Error'));
    } finally {
      setUploadingColor(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:col-span-2 p-4 rounded-2xl bg-primary/5 border border-primary/20" style={{ gridColumn: '1 / -1' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>🎨 Color-Wise Photos (Color Image Upload)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Add colors (e.g. Black, Orange). Upload a specific photo for each color so clicking that color pill on the storefront loads its exact image!
          </p>
        </div>
      </div>

      {/* Quick Add Color Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type color name (e.g. Black, Orange, Navy Blue)..."
          value={newColorInput}
          onChange={(e) => setNewColorInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddColor(); } }}
          className="flex h-9 w-full max-w-sm rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold"
        />
        <button
          type="button"
          onClick={handleAddColor}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} /> Add Color
        </button>
      </div>

      {/* Color Cards List */}
      {colorList.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-border rounded-xl bg-background/50">
          <p className="text-xs text-muted-foreground">No colors added yet. Type a color name above to upload color-wise photos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {colorList.map((color) => {
            const currentImg = colorImages?.[color] || '';
            const isUploading = uploadingColor === color;
            return (
              <div key={color} className="p-3 rounded-xl border border-border bg-background shadow-sm flex items-center gap-3">
                {/* Thumbnail Preview */}
                <div className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-secondary/30 shrink-0 flex items-center justify-center relative">
                  {currentImg ? (
                    <img src={currentImg} alt={color} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold text-muted-foreground text-center px-1">No Pic</span>
                  )}
                </div>

                {/* Color Details & Upload */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{color}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(color)}
                      className="text-muted-foreground hover:text-destructive text-[11px] p-0.5 transition-colors cursor-pointer"
                      title="Remove this color"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={`Photo URL for ${color}`}
                      value={currentImg}
                      onChange={(e) => handleImageUrlChange(color, e.target.value)}
                      className="flex h-7 w-full min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[11px] font-mono"
                    />
                    <label className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 cursor-pointer shrink-0 shadow-sm transition-all">
                      {isUploading ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={11} />
                          <span>Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleUploadFile(color, e)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Interactive Size Guide (Size Chart) Editor Table Component
const SizeGuideTableEditor = ({ value, onChange }) => {
  const columns = value?.columns || [];
  const rows = value?.rows || [];
  const material = value?.material || 'Cotton 100%';
  const image_url = value?.image_url || value?.chart_image || '';

  const handleMaterialChange = (val) => {
    onChange({ columns, rows, material: val, image_url });
  };

  const handleImageChange = (url) => {
    onChange({ columns, rows, material, image_url: url });
  };

  return (
    <div className="flex flex-col gap-3 md:col-span-2 mt-4 pt-4 border-t border-border font-sans">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Size Chart & Image Guide</label>
        <span className="text-[10px] text-muted-foreground">Upload Size Chart Diagram</span>
      </div>

      {/* Material & Size Chart Image Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Material / Fabric Composition</label>
          <input 
            type="text" 
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" 
            value={material} 
            onChange={(e) => handleMaterialChange(e.target.value)}
            placeholder="e.g. Cotton 100%, Heavyweight Fleece"
          />
        </div>

        <ImageUploadInput
          label="Size Chart Image (Upload or Image URL)"
          value={image_url}
          onChange={handleImageChange}
          placeholder="e.g. /uploads/img_size_chart.webp"
        />
      </div>
    </div>
  );
};

const defaultNavMenu = [
  { label: 'Home',         url: '/',                          type: 'link',     subs: [] },
  { label: 'Shop All',     url: '/shop',                      type: 'link',     subs: [] },
  { label: 'Men',          url: '/shop?category=men',         type: 'category', subs: [
    { label: 'Vintage Shirts',    url: '/shop?category=men&subcategory=Vintage+Shirts' },
    { label: 'Heritage Panjabis', url: '/shop?category=men&subcategory=Heritage+Panjabis' },
    { label: 'Kurtas',            url: '/shop?category=men&subcategory=Kurtas' },
    { label: 'Trousers',          url: '/shop?category=men&subcategory=Trousers' },
  ]},
  { label: 'Women',        url: '/shop?category=women',       type: 'category', subs: [
    { label: 'Vintage Sarees', url: '/shop?category=women&subcategory=Vintage+Sarees' },
    { label: 'Kurtis',         url: '/shop?category=women&subcategory=Kurtis' },
    { label: 'Salwar Kameez',  url: '/shop?category=women&subcategory=Salwar+Kameez' },
    { label: 'Retro Jackets',  url: '/shop?category=women&subcategory=Retro+Jackets' },
  ]},
  { label: 'Accessories',  url: '/shop?category=accessories', type: 'category', subs: [
    { label: 'Handcrafted Bags', url: '/shop?category=accessories&subcategory=Handcrafted+Bags' },
    { label: 'Antique Jewelry',  url: '/shop?category=accessories&subcategory=Antique+Jewelry' },
    { label: 'Heritage Shawls',  url: '/shop?category=accessories&subcategory=Heritage+Shawls' },
  ]},
  { label: 'Contact',      url: '/contact',                   type: 'link',     subs: [] },
];

const defaultHome = {
  heroBgImage: "/images/hero-banner.webp",
  heroBadge: "",
  heroSubBadge: "",
  heroHeading: "",
  heroSubtext: "",
  heroButtonText: "",

  collectionsLabel: "",
  collectionsTitle: "",

  latestLabel: "",
  latestTitle: "",

  catalogLabel: "",
  catalogTitle: "",
  catalogSubtext: "",

  brandStoryLabel: "",
  brandStoryImage: "",
  brandStoryImage2: "",
  brandStoryButtonText: "",
  brandStoryTitle: "",
  brandStoryText1: "",
  brandStoryText2: "",
  
  instagramLabel: "",
  instagramTitle: "",
  instagramSubtext: "",
  instagramUrl: "",
  instagramProfileImage: "",
  instagramImage1: "",
  instagramImage2: "",
  instagramImage3: "",
  instagramImage4: "",
  instagramImage5: "",

  shippingInsideDhaka: 80,
  shippingOutsideDhaka: 150,
  shippingSubDhaka: 100,
  freeDeliveryThreshold: 2500,
  discountEnabled: "true",
  discountThreshold: 3200,
  discountAmount: 250,
  welcome_popup_enabled: "true",
  welcome_image: "",
  welcome_title: "",
  welcome_text: "",
  welcome_button_text: "",
  welcome_link: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  trustBadge1: "",
  trustBadge2: "",
  trustBadge3: "",
  trustBadge4: "",
};

export const StorefrontManagement = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [homeSettings, setHomeSettings] = useState(defaultHome);
  const [navMenu, setNavMenu] = useState(defaultNavMenu);
  const [navSaving, setNavSaving] = useState(false);
  const [navSaved, setNavSaved] = useState(false);
  const [shopSlider, setShopSlider] = useState([]);
  const [sliderSaving, setSliderSaving] = useState(false);
  const [quickCreatingInventory, setQuickCreatingInventory] = useState(false);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null
  });

  const triggerConfirm = async (title, description, onConfirm) => {
    const res = await Swal.fire({
      title,
      text: description,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Yes, Proceed!',
      cancelButtonText: 'Cancel',
      background: '#18181b',
      color: '#f4f4f5'
    });
    if (res.isConfirmed && onConfirm) {
      onConfirm();
    }
  };

  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  });

  const triggerAlert = (description, title = 'Notification', type = 'info') => {
    Swal.fire({
      title,
      text: description,
      icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
      background: '#18181b',
      color: '#f4f4f5',
      confirmButtonColor: type === 'error' ? '#ef4444' : '#10b981',
      timer: type === 'success' ? 2200 : undefined,
      timerProgressBar: type === 'success'
    });
  };

  const showSuccess = (message, title = 'Success ✅') => triggerAlert(message, title, 'success');
  const showError = (message, title = 'Error ❌') => triggerAlert(message, title, 'error');
  const showInfo = (message, title = 'Notice ℹ️') => triggerAlert(message, title, 'info');

  // Site Brand & Logo Identity Settings
  const [brandSettings, setBrandSettings] = useState({
    logoUrl: '/logo.webp',
    brandName: 'PutiMach',
    tagline: 'Vintage Weaves',
    copyright: '© 2026 PutiMach. All rights reserved.'
  });

  // Contact Info
  const [contactInfo, setContactInfo] = useState({
    phone: '01827-406756', whatsapp: '01827406756',
    email: 'putimach324@gmail.com',
    address: 'House 42, Road 11, Banani, Dhaka, Bangladesh',
    facebook_url: 'https://www.facebook.com/share/1HitDwyphD',
    instagram_url: 'https://www.instagram.com/putimachhh?igsh=dnYxeXhhdHhodzdn',
    google_maps_url: 'https://maps.google.com/?q=House+42,+Road+11,+Banani,+Dhaka',
    flagship_name: 'PUTIMACH BANANI FLAGSHIP',
    flagship_address: 'House 42, Road 11, Banani, Dhaka',
  });
  const [contactSaving, setContactSaving] = useState(false);

  // FAQ
  const [faqItems, setFaqItems] = useState([]);
  const [faqSaving, setFaqSaving] = useState(false);

  // Return Policy
  const [returnPolicySections, setReturnPolicySections] = useState([]);
  const [returnSaving, setReturnSaving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Banners tab sections
  const [bannerSection, setBannerSection] = useState('hero');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states for Product
  const [prodForm, setProdForm] = useState({
    name: '', slug: '', category: '', price: '', original_price: '',
    badge: '', image: '', description: '', long_description: '',
    in_stock: true, sizes: '', colors: '', inventory_id: ''
  });

  // Form states for Category
  const [catForm, setCatForm] = useState({
    name: '', slug: '', description: '', image_url: ''
  });

  const [fetchError, setFetchError] = useState(null);

  // Instant-on cache initialization
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sf_cached_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.products?.length) setProducts(parsed.products);
        if (parsed.categories?.length) setCategories(parsed.categories);
        if (parsed.inventoryItems?.length) setInventoryItems(parsed.inventoryItems);
        if (parsed.homeSettings) setHomeSettings(prev => ({ ...prev, ...parsed.homeSettings }));
        if (parsed.navMenu) setNavMenu(parsed.navMenu);
        if (parsed.shopSlider) setShopSlider(parsed.shopSlider);
        if (parsed.contactInfo) setContactInfo(prev => ({ ...prev, ...parsed.contactInfo }));
        if (parsed.faqItems) setFaqItems(parsed.faqItems);
        if (parsed.returnPolicySections) setReturnPolicySections(parsed.returnPolicySections);
        if (parsed.brandSettings) setBrandSettings(prev => ({ ...prev, ...parsed.brandSettings }));
        setLoading(false);
      }
    } catch (e) {}

    fetchStorefrontData();
  }, []);

  const fetchStorefrontData = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    
    try {
      // Parallelize all network requests for 4x faster load speed
      const [prodResult, catResult, invResult, setResult] = await Promise.allSettled([
        supabase.from('cb_products').select('id, data, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('cb_categories').select('id, data, created_at').order('created_at', { ascending: true }).limit(100),
        supabase.from('inventory').select('id, current_stock'),
        supabase.from('cb_settings').select('id, data')
      ]);

      // 1. Process Products
      let mappedProducts = [];
      let productsLoaded = false;
      if (prodResult.status === 'fulfilled' && !prodResult.value.error) {
        mappedProducts = (prodResult.value.data || []).map(row => ({ id: row.id, created_at: row.created_at, ...(row.data || {}) }));
        setProducts(mappedProducts);
        productsLoaded = true;
      }

      // 2. Process Categories
      let mappedCategories = [];
      let categoriesLoaded = false;
      if (catResult.status === 'fulfilled' && !catResult.value.error) {
        mappedCategories = (catResult.value.data || []).map(row => ({ id: row.id, created_at: row.created_at, ...(row.data || {}) }));
        setCategories(mappedCategories);
        categoriesLoaded = true;
      }

      // 3. Process Inventory
      let mappedInventory = [];
      if (invResult.status === 'fulfilled' && invResult.value.data) {
        mappedInventory = invResult.value.data;
      }
      setInventoryItems(mappedInventory);

      // 4. Process Site Settings
      let allSettings = null;
      if (setResult.status === 'fulfilled' && setResult.value.data) {
        allSettings = setResult.value.data;
      } else {
        const fallbackRes = await supabase.from('site_settings').select('id, data');
        allSettings = fallbackRes.data;
      }

      let freshHome = null;
      let freshNav = null;
      let freshSlider = null;
      let freshContact = null;
      let freshFaq = null;
      let freshReturn = null;
      let freshBrand = null;

      if (Array.isArray(allSettings)) {
        freshHome = allSettings.find(s => s.id === 'home_page')?.data;
        freshNav = allSettings.find(s => s.id === 'nav_menu')?.data;
        freshSlider = allSettings.find(s => s.id === 'shop_slider')?.data;
        freshContact = allSettings.find(s => s.id === 'contact_info')?.data;
        freshFaq = allSettings.find(s => s.id === 'faq_page')?.data;
        freshReturn = allSettings.find(s => s.id === 'return_policy')?.data;
        freshBrand = allSettings.find(s => s.id === 'brand_settings')?.data;

        if (freshHome) setHomeSettings(prev => ({ ...defaultHome, ...freshHome }));
        if (freshNav && Array.isArray(freshNav)) setNavMenu(freshNav);
        if (freshSlider && Array.isArray(freshSlider)) setShopSlider(freshSlider);
        if (freshContact && typeof freshContact === 'object') setContactInfo(prev => ({ ...prev, ...freshContact }));
        if (freshFaq && Array.isArray(freshFaq)) setFaqItems(freshFaq);
        if (freshReturn && Array.isArray(freshReturn)) setReturnPolicySections(freshReturn);
        if (freshBrand && typeof freshBrand === 'object') setBrandSettings(prev => ({ ...prev, ...freshBrand }));
      }

      // Persist snapshot to local cache only if we got real data
      try {
        const cachePayload: Record<string, any> = {};
        if (productsLoaded) cachePayload.products = mappedProducts;
        if (categoriesLoaded) cachePayload.categories = mappedCategories;
        if (mappedInventory.length > 0) cachePayload.inventoryItems = mappedInventory;
        if (freshHome) cachePayload.homeSettings = freshHome;
        if (freshNav) cachePayload.navMenu = freshNav;
        if (freshSlider) cachePayload.shopSlider = freshSlider;
        if (freshContact) cachePayload.contactInfo = freshContact;
        if (freshFaq) cachePayload.faqItems = freshFaq;
        if (freshReturn) cachePayload.returnPolicySections = freshReturn;
        if (freshBrand) cachePayload.brandSettings = freshBrand;

        // Merge with existing cache to avoid losing data on partial fetch
        try {
          const existing = JSON.parse(localStorage.getItem('sf_cached_data') || '{}');
          localStorage.setItem('sf_cached_data', JSON.stringify({ ...existing, ...cachePayload }));
        } catch {
          localStorage.setItem('sf_cached_data', JSON.stringify(cachePayload));
        }
      } catch (e) {}
    } catch (err: any) {
      console.error('Error fetching storefront data:', err);
      setFetchError(err?.message || 'Failed to load storefront data from database.');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Helper to generate slugs dynamically
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleProdNameChange = (e) => {
    const val = e.target.value;
    setProdForm(prev => ({
      ...prev,
      name: val,
      slug: prev.slug === generateSlug(prev.name) || prev.slug === '' ? generateSlug(val) : prev.slug
    }));
  };

  const handleCatNameChange = (e) => {
    const val = e.target.value;
    setCatForm(prev => ({
      ...prev,
      name: val,
      slug: prev.slug === generateSlug(prev.name) || prev.slug === '' ? generateSlug(val) : prev.slug
    }));
  };

  // Open Modal for Product Add/Edit
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      const defaultSizeGuide = {
        columns: ['Size', 'Waist', 'Hips', 'Length', 'Leg Opening', 'Rise'],
        rows: [],
        material: 'Cotton 100%'
      };
      const existingColorImages = product.color_images || {};
      const existingVariants = Array.isArray(product.variants) ? product.variants : [];
      existingVariants.forEach(v => {
        if (v.color && v.image_url && !existingColorImages[v.color]) {
          existingColorImages[v.color] = v.image_url;
        }
      });

      setProdForm({
        name: product.name || '',
        slug: product.slug || '',
        category: product.category || '',
        price: product.price || '',
        original_price: product.original_price || '',
        badge: product.badge || '',
        image: product.image || '',
        images: Array.isArray(product.images) ? product.images : [],
        color_images: existingColorImages,
        size_guide: product.size_guide && typeof product.size_guide === 'object' && Array.isArray(product.size_guide.columns) ? product.size_guide : defaultSizeGuide,
        features: Array.isArray(product.features) ? product.features.join(', ') : '',
        material: product.material || '',
        variants: existingVariants,
        description: product.description || '',
        long_description: product.long_description || '',
        in_stock: product.in_stock !== false,
        sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
        colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
        inventory_id: product.inventory_id || ''
      });
    } else {
      const defaultSizeGuide = {
        columns: ['Size', 'Waist', 'Hips', 'Length', 'Leg Opening', 'Rise'],
        rows: [],
        material: 'Cotton 100%'
      };
      setEditingProduct(null);
      setProdForm({
        name: '', slug: '', category: categories[0]?.slug || '', price: '', original_price: '',
        badge: '', image: '', images: [], color_images: {}, size_guide: defaultSizeGuide, 
        features: '100% Premium Material, Custom Oversized Fit, Garment Washed', material: 'Cotton 100%',
        variants: [],
        description: '', long_description: '',
        in_stock: true, sizes: 'S, M, L, XL', colors: '', inventory_id: ''
      });
    }
    setIsProductModalOpen(true);
  };

  // Open Modal for Category Add/Edit
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCatForm({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        image_url: category.image_url || ''
      });
    } else {
      setEditingCategory(null);
      setCatForm({
        name: '', slug: '', description: '', image_url: ''
      });
    }
    setIsCategoryModalOpen(true);
  };

  // Variant Helper Functions
  const generateVariantCombinations = () => {
    const sizeList = prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const colorList = prodForm.colors.split(',').map(c => c.trim()).filter(Boolean);
    
    if (sizeList.length === 0 && colorList.length === 0) {
      showInfo('Please enter some Available Sizes or Colors first.', 'Input Needed');
      return;
    }

    const combinations = [];
    const baseSku = (prodForm.slug || prodForm.name.toLowerCase().replace(/\s+/g, '-')).toUpperCase();
    
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

    setProdForm({ ...prodForm, variants: combinations });
  };

  const handleVariantChange = (index, field, value) => {
    const updated = [...prodForm.variants];
    updated[index] = { ...updated[index], [field]: value };
    setProdForm({ ...prodForm, variants: updated });
  };

  const removeVariantRow = (index) => {
    const updated = prodForm.variants.filter((_, i) => i !== index);
    setProdForm({ ...prodForm, variants: updated });
  };

  const handleQuickCreateInventory = async () => {
    if (!prodForm.name) {
      alert('❌ Please enter the Product Name first to generate a matching inventory item.');
      return;
    }
    setQuickCreatingInventory(true);
    try {
      // Auto-generate SKU
      const sku = 'SKU-' + prodForm.name.slice(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

      // Explicitly generate a unique id since VPS database schema has no default generator for 'id' column
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'inv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

      const payload = {
        id: generatedId,
        name: prodForm.name,
        sku: sku,
        category: prodForm.category || 'general',
        current_stock: 50, // default placeholder stock
        min_stock_level: 5,
        selling_price: Number(prodForm.price) || 0,
        unit_price: Number(prodForm.price) || 0,
        making_cost: (Number(prodForm.price) || 0) * 0.4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('inventory')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      
      alert(`✅ Inventory Item Created & Connected!\nName: ${data.name}\nSKU: ${data.sku}\nInitial Stock: ${data.current_stock}`);
      
      // Update local state inventory items list
      setInventoryItems(prev => [...prev, data]);
      // Link the newly created item to the product form
      setProdForm(prev => ({ ...prev, inventory_id: data.id }));
    } catch (err) {
      console.error('Error quick creating inventory:', err);
      alert('❌ Failed to create inventory: ' + err.message);
    } finally {
      setQuickCreatingInventory(false);
    }
  };

  const syncVariantsFromInventory = (invId) => {
    if (!invId) return;
    const invItem = inventoryItems.find(i => i.id === invId);
    if (!invItem) return;
    
    const invVariants = Array.isArray(invItem.variants) ? invItem.variants : [];
    if (invVariants.length === 0) {
      showInfo('The selected inventory item does not have any variants defined.');
      return;
    }

    // Extract unique sizes and colors
    const uniqueSizes = [...new Set(invVariants.map(v => v.size).filter(Boolean))].join(', ');
    const uniqueColors = [...new Set(invVariants.map(v => v.color).filter(Boolean))].join(', ');

    setProdForm(prev => ({
      ...prev,
      inventory_id: invId,
      variants: invVariants.map(v => ({
        size: v.size || '',
        color: v.color || '',
        sku: v.sku || '',
        stock: Number(v.stock) || 0
      })),
      sizes: uniqueSizes,
      colors: uniqueColors
    }));
  };

  const addVariantRow = () => {
    const baseSku = (prodForm.slug || 'PROD').toUpperCase();
    const newVariant = {
      size: '',
      color: '',
      sku: `${baseSku}-VAR-${prodForm.variants.length + 1}`,
      stock: 10
    };
    setProdForm({ ...prodForm, variants: [...prodForm.variants, newVariant] });
  };

  // Save Product
  const saveProductSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    // Format tags arrays
    const formattedSizes = prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const colorFromInput = prodForm.colors.split(',').map(c => c.trim()).filter(Boolean);
    const colorFromMap = Object.keys(prodForm.color_images || {});
    const formattedColors = Array.from(new Set([...colorFromInput, ...colorFromMap]));
    const formattedFeatures = prodForm.features ? prodForm.features.split(',').map(f => f.trim()).filter(Boolean) : [];

    // Sync color_images to variants if variant is missing image_url
    const syncedVariants = (prodForm.variants || []).map(v => {
      if (v.color && !v.image_url && prodForm.color_images?.[v.color]) {
        return { ...v, image_url: prodForm.color_images[v.color] };
      }
      return v;
    });

    // Calculate total variants stock and override in_stock
    const hasVariants = Array.isArray(syncedVariants) && syncedVariants.length > 0;
    const totalVariantsStock = hasVariants 
      ? syncedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
      : 0;
    
    const isProductInStock = hasVariants ? (totalVariantsStock > 0) : prodForm.in_stock;

    // Validate & sanitize images to ensure primary image and gallery are never blank
    const allCandidateImages = [
      prodForm.image,
      ...(Array.isArray(prodForm.images) ? prodForm.images : []),
      ...Object.values(prodForm.color_images || {})
    ].map(u => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);

    const primaryImg = allCandidateImages.length > 0 ? allCandidateImages[0] : (prodForm.image || '');
    const cleanImages = Array.from(new Set(allCandidateImages.length > 0 ? allCandidateImages : [primaryImg].filter(Boolean)));

    const payload = {
      name: prodForm.name,
      slug: prodForm.slug,
      category: prodForm.category,
      price: Number(prodForm.price) || 0,
      original_price: prodForm.original_price ? Number(prodForm.original_price) : null,
      badge: prodForm.badge || null,
      image: primaryImg,
      images: cleanImages,
      color_images: prodForm.color_images || {},
      size_guide: prodForm.size_guide,
      features: formattedFeatures,
      material: prodForm.material || null,
      variants: syncedVariants,
      description: prodForm.description,
      long_description: prodForm.long_description,
      in_stock: isProductInStock,
      sizes: formattedSizes,
      colors: formattedColors,
      inventory_id: prodForm.inventory_id || null,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({ data: payload })
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        if (!payload.slug) {
          payload.slug = generateSlug(payload.name) || 'product-' + Date.now();
        }
        let targetId = payload.slug;
        
        // Check if ID or slug already exists in current loaded products
        const existsLocally = products.some(p => p.id === targetId || p.slug === targetId);
        if (existsLocally) {
          const uniqueSuffix = Date.now().toString(36).slice(-4);
          targetId = `${payload.slug}-${uniqueSuffix}`;
          payload.slug = targetId;
        }

        const { error } = await supabase
          .from('products')
          .insert([{
            id: targetId,
            data: payload,
            created_at: new Date().toISOString()
          }]);
        if (error) throw error;
      }

      // Sync with inventory table if connected
      if (prodForm.inventory_id && hasVariants) {
        await supabase
          .from('inventory')
          .update({ current_stock: totalVariantsStock })
          .eq('id', prodForm.inventory_id);
      }

      setIsProductModalOpen(false);
      fetchStorefrontData();
    } catch (err) {
      console.error('Error saving product:', err);
      showError('Error saving product: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Save Category
  const saveCategorySubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    const payload = {
      name: catForm.name,
      slug: catForm.slug,
      description: catForm.description,
      image_url: catForm.image_url || null
    };

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('cb_categories')
          .update({ data: payload })
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        if (!payload.slug) {
          payload.slug = generateSlug(payload.name) || 'cat-' + Date.now();
        }
        let targetId = payload.slug;

        // Always guarantee unique ID by appending timestamp suffix
        const uniqueSuffix = Date.now().toString(36).slice(-5);
        targetId = `${payload.slug}-${uniqueSuffix}`;
        payload.slug = targetId;

        const { error } = await supabase
          .from('cb_categories')
          .insert([{
            id: targetId,
            data: payload,
            created_at: new Date().toISOString()
          }]);
        if (error) throw error;
      }
      setIsCategoryModalOpen(false);
      fetchStorefrontData();
    } catch (err) {
      console.error('Error saving category:', err);
      showError('Error saving category: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    triggerConfirm(
      "Delete Product",
      "Are you absolutely sure you want to delete this product? This action cannot be undone.",
      async () => {
        try {
          // Show progress loading spinner
          Swal.fire({
            title: 'Deleting Product...',
            text: 'Please wait while the product is removed.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
            background: '#18181b',
            color: '#f4f4f5'
          });

          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) throw error;

          // Optimistically update UI instantly (0ms delay)
          setProducts(prev => prev.filter(p => p.id !== id));

          // Clear storefront settings cache too if it matches
          localStorage.removeItem('rr_home_settings');

          // Refresh storefront list in background
          await fetchStorefrontData();

          showSuccess('Product has been deleted successfully! 🗑️', 'Deleted Successfully');
        } catch (err) {
          console.error('Error deleting product:', err);
          showError('Failed to delete product: ' + err.message);
        }
      }
    );
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    triggerConfirm(
      "Delete Category",
      "Are you sure you want to delete this category? This will not delete its products, but they will be uncategorized.",
      async () => {
        try {
          Swal.fire({
            title: 'Deleting Category...',
            text: 'Please wait while the category is removed.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
            background: '#18181b',
            color: '#f4f4f5'
          });

          const { error } = await supabase.from('categories').delete().eq('id', id);
          if (error) throw error;

          // Optimistically update UI instantly (0ms delay)
          setCategories(prev => prev.filter(c => c.id !== id));

          // Sync nav_menu in site_settings to remove deleted category entry
          const { data: catRows } = await supabase.from('categories').select('*');
          const remainingCatSlugs = new Set((catRows || []).map(c => c.slug || c.data?.slug || c.id));
          const { data: navData } = await supabase.from('cb_settings').select('data').eq('id', 'nav_menu').maybeSingle();
          if (navData && Array.isArray(navData.data)) {
            const updatedNav = navData.data.filter(item => {
              if (item.type === 'category') {
                return remainingCatSlugs.has(item.slug);
              }
              return true;
            });
            await supabase.from('cb_settings').update({ data: updatedNav }).eq('id', 'nav_menu');
          }

          localStorage.removeItem('rr_home_settings');

          await fetchStorefrontData();

          showSuccess('Category has been deleted successfully! 🗑️', 'Deleted Successfully');
        } catch (err) {
          console.error('Error deleting category:', err);
          showError('Failed to delete category: ' + err.message);
        }
      }
    );
  };

  // Save Nav Menu
  const handleSaveNavMenu = async () => {
    setNavSaving(true);
    try {
      const { error } = await supabase
        .from('cb_settings')
        .upsert({ id: 'nav_menu', data: navMenu, created_at: new Date().toISOString() });
      if (error) throw error;

      await fetch('/admin-api/site-settings/nav_menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: navMenu }),
      }).catch(() => null);

      try {
        const raw = localStorage.getItem('sf_cached_data');
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.navMenu = navMenu;
        localStorage.setItem('sf_cached_data', JSON.stringify(parsed));
      } catch (e) {}

      setNavSaved(true);
      setTimeout(() => setNavSaved(false), 3000);
    } catch (err) {
      showError('Failed to save nav menu: ' + err.message);
    } finally {
      setNavSaving(false);
    }
  };

  // Nav Menu helpers
  const addNavItem = () => {
    setNavMenu([...navMenu, { label: 'New Item', url: '/', type: 'link', subs: [] }]);
  };

  const updateNavItem = (idx, field, value) => {
    const updated = [...navMenu];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'type' && value === 'link') updated[idx].subs = [];
    setNavMenu(updated);
  };

  const removeNavItem = (idx) => {
    setNavMenu(navMenu.filter((_, i) => i !== idx));
  };

  const moveNavItem = (idx, dir) => {
    const updated = [...navMenu];
    const target = idx + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setNavMenu(updated);
  };

  const addSubItem = (parentIdx) => {
    const updated = [...navMenu];
    updated[parentIdx].subs = [...(updated[parentIdx].subs || []), { label: 'Sub Item', url: '/' }];
    setNavMenu(updated);
  };

  const updateSubItem = (parentIdx, subIdx, field, value) => {
    const updated = [...navMenu];
    updated[parentIdx].subs[subIdx] = { ...updated[parentIdx].subs[subIdx], [field]: value };
    setNavMenu(updated);
  };

  const removeSubItem = (parentIdx, subIdx) => {
    const updated = [...navMenu];
    updated[parentIdx].subs = updated[parentIdx].subs.filter((_, i) => i !== subIdx);
    setNavMenu(updated);
  };

  // Save Home Banner settings
  const handleSaveHomeSettings = async (e) => {
    if (e) e.preventDefault();
    setSaveLoading(true);
    try {
      const isSlider = bannerSection === 'shop_slider';
      const isBrand = bannerSection === 'brand';
      const settingId = isSlider ? 'shop_slider' : (isBrand ? 'brand_settings' : 'home_page');
      const settingData = isSlider ? shopSlider : (isBrand ? brandSettings : homeSettings);

      const { error } = await supabase
        .from('cb_settings')
        .upsert({ id: settingId, data: settingData, created_at: new Date().toISOString() });
      if (error) throw error;

      await fetch(`/admin-api/site-settings/${settingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: settingData }),
      }).catch(() => null);

      // Instantly sync local cache so page reload uses updated data
      try {
        const raw = localStorage.getItem('sf_cached_data');
        const parsed = raw ? JSON.parse(raw) : {};
        if (isSlider) parsed.shopSlider = shopSlider;
        else if (isBrand) parsed.brandSettings = brandSettings;
        else parsed.homeSettings = homeSettings;
        localStorage.setItem('sf_cached_data', JSON.stringify(parsed));
        localStorage.removeItem('rr_home_settings'); // only clear settings cache, products cache stays
      } catch (e) {}

      showSuccess(
        isSlider 
          ? 'Shop page slider saved successfully! ✅' 
          : (isBrand ? 'Site brand settings saved successfully! ✅' : 'Homepage settings saved successfully! ✅'),
        'Settings Saved 💾'
      );
    } catch (err) {
      console.error('Error saving site settings:', err);
      showError('Failed to save: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'All' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-3.5 sm:p-6 w-full max-w-full overflow-x-hidden h-full overflow-y-auto bg-background text-foreground">
      
      {/* Elite Enterprise Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-3xl font-display font-bold tracking-tight flex flex-wrap items-center gap-2.5">
            Storefront <span className="text-primary">Management</span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 animate-pulse">
                <Loader2 size={12} className="animate-spin" /> Live Syncing...
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Control products, categories, collections, and custom banners in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {activeTab === 'products' && (
            <Button variant="primary" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm" onClick={() => openProductModal(null)}>
              <Plus size={16} /> Add Product
            </Button>
          )}
          {activeTab === 'categories' && (
            <Button variant="primary" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm" onClick={() => openCategoryModal(null)}>
              <Plus size={16} /> Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 rounded-xl flex space-x-1.5 scrollbar-none flex-nowrap max-w-full shrink-0">
          <TabsTrigger value="products" className="flex items-center gap-1.5 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-xs sm:text-sm font-medium">
            <Package size={15} /> Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-xs sm:text-sm font-medium">
            <Layers size={15} /> Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="banners" className="flex items-center gap-1.5 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-xs sm:text-sm font-medium">
            <Sliders size={15} /> Banners & Sections
          </TabsTrigger>
          <TabsTrigger value="nav" className="flex items-center gap-1.5 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-xs sm:text-sm font-medium">
            <Menu size={15} /> Navigation Menu
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {fetchError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="text-red-500 font-bold text-lg">❌ Failed to Load Storefront Data</div>
          <div className="text-sm text-surface-muted bg-background/50 p-3 rounded-lg border border-border text-left font-mono text-xs overflow-auto max-h-32">{fetchError}</div>
          <button 
            type="button"
            onClick={() => fetchStorefrontData()}
            className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md text-sm inline-flex items-center gap-2"
          >
            🔄 Retry Loading Data
          </button>
        </div>
      ) : (
        <div className="animate-slide-up">
          
          {/* 1. PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 min-w-0">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search products by name or slug..." 
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs sm:text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto text-xs sm:text-sm" 
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Product Grid */}
              {filteredProducts.length === 0 ? (
                isRefreshing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <div key={n} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm animate-pulse">
                        <div className="aspect-square bg-muted/60" />
                        <div className="p-4 space-y-3 flex-1">
                          <div className="h-3 w-1/4 bg-muted rounded" />
                          <div className="h-4 w-3/4 bg-muted rounded" />
                          <div className="h-3 w-1/2 bg-muted rounded" />
                          <div className="h-5 w-1/3 bg-muted rounded pt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-surface-muted">
                    No products found matching filters.
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6">
                  {filteredProducts.map(p => (
                    <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative aspect-square bg-muted overflow-hidden flex items-center justify-center">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={32} className="text-surface-muted" />
                        )}
                        {p.badge && <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{p.badge}</span>}
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex justify-between items-center text-xs mb-2">
                          <span className="text-brand font-semibold">{p.category}</span>
                          {p.inventory_id ? (
                            <span className={p.inventory?.current_stock > 0 ? "text-green-500 font-bold animate-pulse" : "text-red-500 font-bold"}>
                              Stock: {p.inventory?.current_stock ?? 0}
                            </span>
                          ) : (
                            <span className={p.in_stock ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                              {p.in_stock ? "In Stock" : "Out of Stock"}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-foreground mb-1 line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-surface-muted truncate">/{p.slug}</p>
                        
                        <div className="flex items-center gap-2 mt-auto pt-4">
                          <span className="font-bold text-lg text-foreground">৳{p.price}</span>
                          {p.original_price && (
                            <span className="text-sm text-muted-foreground line-through">৳{p.original_price}</span>
                          )}
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t border-border bg-secondary/30 flex justify-between items-center">
                        <Button variant="ghost" size="sm" onClick={() => openProductModal(p)}>
                          <Edit2 size={13} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-500/10">
                          <Trash2 size={13} /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {categories.length === 0 && isRefreshing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm animate-pulse">
                      <div className="aspect-square bg-muted/60" />
                      <div className="p-4 space-y-3 flex-1">
                        <div className="h-4 w-2/3 bg-muted rounded" />
                        <div className="h-3 w-1/3 bg-muted rounded" />
                        <div className="h-10 w-full bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categories.map(c => (
                    <div key={c.id} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative aspect-square bg-muted overflow-hidden flex items-center justify-center">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <Layers size={32} className="text-surface-muted" />
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-base text-foreground mb-1 line-clamp-1">{c.name}</h3>
                        <p className="text-xs text-surface-muted">slug: /{c.slug}</p>
                        <p className="text-sm text-surface-secondary mt-2 leading-relaxed line-clamp-2">{c.description || 'No description provided.'}</p>
                      </div>
                      <div className="px-4 py-3 border-t border-border bg-secondary/30 flex justify-between items-center">
                        <Button variant="ghost" size="sm" onClick={() => openCategoryModal(c)}>
                          <Edit2 size={13} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:bg-red-500/10">
                          <Trash2 size={13} /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. BANNERS TAB (SITE CUSTOMIZER) */}
          {activeTab === 'banners' && (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Mobile Section Selector (< 768px) */}
              <div className="block md:hidden w-full">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Select Section to Edit:</label>
                <select
                  value={bannerSection}
                  onChange={(e) => setBannerSection(e.target.value)}
                  className="w-full h-11 px-3.5 bg-card border border-border rounded-xl font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="brand">🏷️ Site Brand & Logo</option>
                  <option value="hero">Hero Banner</option>
                  <option value="shop_slider">Shop Page Slider</option>
                  <option value="drops">Collections & Drops</option>
                  <option value="story">Brand Story</option>
                  <option value="instagram">Social / Instagram</option>
                  <option value="shipping">Shipping Charges</option>
                  <option value="contact">Contact & Popups</option>
                  <option value="contact_info">📞 Contact Info Page</option>
                  <option value="faq">❓ FAQ Page</option>
                  <option value="return_policy">🔄 Returns & Exchanges</option>
                  <option value="trust">Checkout Trust Badges</option>
                </select>
              </div>

              {/* Desktop Sidebar (>= 768px) */}
              <div className="hidden md:flex flex-col gap-2 w-64 shrink-0">
                <button 
                  type="button"
                  onClick={() => setBannerSection('brand')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "brand" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  🏷️ Site Brand & Logo
                </button>
                <button 
                  type="button"
                  onClick={() => setBannerSection('hero')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "hero" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Hero Banner
                </button>
                <button 
                  onClick={() => setBannerSection('shop_slider')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "shop_slider" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Shop Page Slider
                </button>
                <button 
                  onClick={() => setBannerSection('drops')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "drops" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Collections & Drops
                </button>
                <button 
                  onClick={() => setBannerSection('story')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "story" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Brand Story
                </button>
                <button 
                  onClick={() => setBannerSection('instagram')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "instagram" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Social / Instagram
                </button>
                <button 
                  onClick={() => setBannerSection('shipping')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "shipping" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Shipping Charges
                </button>
                <button 
                  onClick={() => setBannerSection('contact')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "contact" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Contact & Popups
                </button>
                <button 
                  onClick={() => setBannerSection('contact_info')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "contact_info" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  📞 Contact Info Page
                </button>
                <button 
                  onClick={() => setBannerSection('faq')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "faq" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  ❓ FAQ Page
                </button>
                <button 
                  onClick={() => setBannerSection('return_policy')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "return_policy" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  🔄 Returns & Exchanges
                </button>
                <button 
                  onClick={() => setBannerSection('trust')} 
                  className={`px-4 py-3 text-sm font-medium rounded-xl text-left whitespace-nowrap transition-colors ${bannerSection === "trust" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Checkout Trust Badges
                </button>
              </div>

              {/* Editor Card */}
              <div className="flex-1 bg-card rounded-2xl border border-border p-3.5 sm:p-6 shadow-sm min-w-0 overflow-hidden">
                <form onSubmit={handleSaveHomeSettings} className="space-y-6">
                  
                  {/* Site Brand & Identity section */}
                  {bannerSection === 'brand' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-base-800 pb-2">
                        <h2 className="text-h3 font-black">🏷️ Site Brand & Logo Identity</h2>
                        <button
                          type="submit"
                          disabled={saveLoading}
                          className="action-btn-primary"
                          style={{ padding: '8px 20px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none' }}
                        >
                          {saveLoading ? 'Saving...' : '💾 Save Brand Settings'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Brand Name</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                            value={brandSettings.brandName || ''} 
                            onChange={e => setBrandSettings({ ...brandSettings, brandName: e.target.value })} 
                            placeholder="PutiMach" 
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Brand Tagline</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                            value={brandSettings.tagline || ''} 
                            onChange={e => setBrandSettings({ ...brandSettings, tagline: e.target.value })} 
                            placeholder="Vintage Weaves" 
                          />
                        </div>
                        <ImageUploadInput 
                          label="Brand Logo Image" 
                          value={brandSettings.logoUrl || ''} 
                          onChange={url => setBrandSettings({ ...brandSettings, logoUrl: url })} 
                          placeholder="/logo.webp" 
                        />
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Footer Copyright Text</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                            value={brandSettings.copyright || ''} 
                            onChange={e => setBrandSettings({ ...brandSettings, copyright: e.target.value })} 
                            placeholder="© 2026 PutiMach. All rights reserved." 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hero banner section */}
                  {bannerSection === 'hero' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Hero Section Banner</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Hero Badge</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.heroBadge}
                            onChange={(e) => setHomeSettings({ ...homeSettings, heroBadge: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Hero Sub-Badge</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.heroSubBadge}
                            onChange={(e) => setHomeSettings({ ...homeSettings, heroSubBadge: e.target.value })}
                          />
                        </div>
                        <ImageUploadInput
                          label="Hero Background Image URL"
                          value={homeSettings.heroBgImage}
                          onChange={(val) => setHomeSettings({ ...homeSettings, heroBgImage: val })}
                          placeholder="Upload image or paste Cloudflare CDN URL"
                        />
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Hero Main Heading</label>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.heroHeading}
                            onChange={(e) => setHomeSettings({ ...homeSettings, heroHeading: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Hero Subtext description</label>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.heroSubtext}
                            onChange={(e) => setHomeSettings({ ...homeSettings, heroSubtext: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Hero Button CTA text</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.heroButtonText}
                            onChange={(e) => setHomeSettings({ ...homeSettings, heroButtonText: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shop Page Slider section */}
                  {bannerSection === 'shop_slider' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Shop Page Slider</h2>
                      <p className="text-xs text-surface-muted">
                        These images will appear as an auto-sliding top product banner on the shop page, replacing the "THE SHOP ARCHIVE" heading text.
                      </p>
                      
                      <div className="space-y-4">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                          {shopSlider.map((imgUrl, idx) => (
                            <div key={idx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '21/9', background: 'var(--surface-3)', border: '2px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                              <img src={imgUrl} alt={`Slide ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              
                              {/* ALWAYS-VISIBLE DELETE BUTTON */}
                              <button 
                                type="button"
                                onClick={async () => {
                                  triggerConfirm(
                                    `Delete Slide #${idx + 1}?`,
                                    'Are you sure you want to delete this image from the shop slider?',
                                    () => {
                                      const updated = shopSlider.filter((_, i) => i !== idx);
                                      setShopSlider(updated);
                                      showSuccess('Slide deleted from list. Click "Save Changes" to update Database.', 'Deleted 🗑️');
                                    }
                                  );
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  padding: '6px 12px',
                                  background: 'rgba(239, 68, 68, 0.95)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  color: 'white',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                  zIndex: 10
                                }}
                                title="Delete Slide"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>

                              <span style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'white', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.8)', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>
                                Slide #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>

                        {shopSlider.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontStyle: 'italic', border: '2px dashed var(--glass-border)', borderRadius: '12px' }}>
                            No slider images uploaded. Upload new images below.
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '16px' }}>
                          <ImageUploadInput
                            label="Upload New Slider Image (Saved directly to R2 / Storage as WebP)"
                            value=""
                            onChange={(val) => {
                              if (val) {
                                setShopSlider([...shopSlider, val]);
                                showSuccess('New slide image uploaded! Click "Save Changes" to apply.', 'Uploaded 🖼️');
                              }
                            }}
                            placeholder="Upload an image..."
                            local={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collections and Drops Section */}
                  {bannerSection === 'drops' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Collections & Catalog Sections</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Categories Section Sub-title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.collectionsLabel}
                            onChange={(e) => setHomeSettings({ ...homeSettings, collectionsLabel: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Categories Section Main Title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.collectionsTitle}
                            onChange={(e) => setHomeSettings({ ...homeSettings, collectionsTitle: e.target.value })}
                          />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">New Arrivals Section Sub-title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.latestLabel}
                            onChange={(e) => setHomeSettings({ ...homeSettings, latestLabel: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">New Arrivals Section Title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.latestTitle}
                            onChange={(e) => setHomeSettings({ ...homeSettings, latestTitle: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Catalog Section Sub-title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.catalogLabel}
                            onChange={(e) => setHomeSettings({ ...homeSettings, catalogLabel: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Catalog Section Title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.catalogTitle}
                            onChange={(e) => setHomeSettings({ ...homeSettings, catalogTitle: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Catalog Subtext Description</label>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.catalogSubtext}
                            onChange={(e) => setHomeSettings({ ...homeSettings, catalogSubtext: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Brand Story Section */}
                  {bannerSection === 'story' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Brand Story</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Story Section Sub-title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.brandStoryLabel}
                            onChange={(e) => setHomeSettings({ ...homeSettings, brandStoryLabel: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Story Section Title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.brandStoryTitle}
                            onChange={(e) => setHomeSettings({ ...homeSettings, brandStoryTitle: e.target.value })}
                          />
                        </div>
                        <ImageUploadInput
                          label="Story Section First Image URL"
                          value={homeSettings.brandStoryImage}
                          onChange={(val) => setHomeSettings({ ...homeSettings, brandStoryImage: val })}
                          placeholder="e.g. /images/hoodie-rust.webp"
                        />
                        <ImageUploadInput
                          label="Story Section Second Image URL"
                          value={homeSettings.brandStoryImage2 || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, brandStoryImage2: val })}
                          placeholder="e.g. /images/story-image2.webp"
                        />
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Story Button Text</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.brandStoryButtonText || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, brandStoryButtonText: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Story Paragraph 1</label>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.brandStoryText1}
                            onChange={(e) => setHomeSettings({ ...homeSettings, brandStoryText1: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Story Paragraph 2</label>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.brandStoryText2}
                            onChange={(e) => setHomeSettings({ ...homeSettings, brandStoryText2: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instagram / Social section */}
                  {bannerSection === 'instagram' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Social Feed & Instagram Channel</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Instagram Section Sub-title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.instagramLabel}
                            onChange={(e) => setHomeSettings({ ...homeSettings, instagramLabel: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Instagram Section Title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.instagramTitle}
                            onChange={(e) => setHomeSettings({ ...homeSettings, instagramTitle: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Instagram URL / Profile link</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.instagramUrl}
                            onChange={(e) => setHomeSettings({ ...homeSettings, instagramUrl: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Instagram Subtext Description</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.instagramSubtext}
                            onChange={(e) => setHomeSettings({ ...homeSettings, instagramSubtext: e.target.value })}
                          />
                        </div>
                        <ImageUploadInput
                          label="Instagram Mini-profile Image URL"
                          value={homeSettings.instagramProfileImage}
                          onChange={(val) => setHomeSettings({ ...homeSettings, instagramProfileImage: val })}
                          placeholder="e.g. /images/hoodie-rust.webp"
                        />
                        <h3 className="text-sm font-bold full-width border-b border-base-800 pb-1 mt-4" style={{ gridColumn: '1 / -1' }}>Instagram Gallery Images</h3>
                        <ImageUploadInput
                          label="Instagram Gallery Image 1"
                          value={homeSettings.instagramImage1 || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, instagramImage1: val })}
                        />
                        <ImageUploadInput
                          label="Instagram Gallery Image 2"
                          value={homeSettings.instagramImage2 || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, instagramImage2: val })}
                        />
                        <ImageUploadInput
                          label="Instagram Gallery Image 3"
                          value={homeSettings.instagramImage3 || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, instagramImage3: val })}
                        />
                        <ImageUploadInput
                          label="Instagram Gallery Image 4"
                          value={homeSettings.instagramImage4 || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, instagramImage4: val })}
                        />
                        <ImageUploadInput
                          label="Instagram Gallery Image 5"
                          value={homeSettings.instagramImage5 || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, instagramImage5: val })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Shipping Charges section */}
                  {bannerSection === 'shipping' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Delivery & Shipping Fees</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Inside Dhaka Delivery Fee (৳)</label>
                          <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.shippingInsideDhaka || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, shippingInsideDhaka: Number(e.target.value) })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Sub Dhaka Delivery Fee (Savar, Gazipur, Narayanganj) (৳)</label>
                          <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.shippingSubDhaka || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, shippingSubDhaka: Number(e.target.value) })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Outside Dhaka Delivery Fee (৳)</label>
                          <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.shippingOutsideDhaka || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, shippingOutsideDhaka: Number(e.target.value) })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Free Delivery Threshold Min Order (৳)</label>
                          <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.freeDeliveryThreshold || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, freeDeliveryThreshold: Number(e.target.value) })}
                          />
                        </div>

                        <h3 className="text-sm font-bold full-width border-b border-base-800 pb-1 mt-4" style={{ gridColumn: '1 / -1' }}>Auto Discount Promotion</h3>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Enable Promotion Discount?</label>
                          <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={homeSettings.discountEnabled || 'true'}
                            onChange={(e) => setHomeSettings({ ...homeSettings, discountEnabled: e.target.value })}
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Discount Threshold Min Order (৳)</label>
                          <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.discountThreshold || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, discountThreshold: Number(e.target.value) })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Discount Amount (৳)</label>
                          <input 
                            type="number" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.discountAmount || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, discountAmount: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact & Welcome Popup section */}
                  {bannerSection === 'contact' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Contact Details & Welcome Popup</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Contact Phone</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.contactPhone || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, contactPhone: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Contact Email</label>
                          <input 
                            type="email" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.contactEmail || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, contactEmail: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Flagship Address</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.contactAddress || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, contactAddress: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Enable Welcome Popup?</label>
                          <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={homeSettings.welcome_popup_enabled || 'true'}
                            onChange={(e) => setHomeSettings({ ...homeSettings, welcome_popup_enabled: e.target.value })}
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Welcome Popup Title</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.welcome_title || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, welcome_title: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Welcome Popup Description Text</label>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.welcome_text || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, welcome_text: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Welcome Popup Button Text</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.welcome_button_text || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, welcome_button_text: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Welcome Popup Link URL</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.welcome_link || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, welcome_link: e.target.value })}
                          />
                        </div>
                        <ImageUploadInput
                          label="Welcome Popup Image URL"
                          value={homeSettings.welcome_image || ''}
                          onChange={(val) => setHomeSettings({ ...homeSettings, welcome_image: val })}
                          placeholder="e.g. /images/welcome-banner.webp"
                        />
                      </div>
                    </div>
                  )}

                  {/* Contact Info Page Section */}
                  {bannerSection === 'contact_info' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-base-800 pb-2">
                        <h2 className="text-h3 font-black">📞 Contact Info Page</h2>
                        <button
                          type="button"
                          disabled={contactSaving}
                          onClick={async () => {
                            setContactSaving(true);
                            try {
                              const res = await fetch('/admin-api/site-settings/contact_info', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ data: contactInfo }),
                              });
                              const result = await res.json();
                              if (!result.success) throw new Error(result.error);
                              if (result.data) setContactInfo(prev => ({ ...prev, ...result.data }));
                              alert('✅ Contact info saved!');
                            } catch (err) { alert('❌ ' + err.message); }
                            finally { setContactSaving(false); }
                          }}
                          className="action-btn-primary"
                          style={{ padding: '8px 20px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none' }}
                        >
                          {contactSaving ? 'Saving...' : '💾 Save Contact Info'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2"><label className="text-sm font-medium text-foreground">Phone Number</label><input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.phone || ''} onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })} placeholder="01827-406756" /></div>
                        <div className="flex flex-col gap-2"><label className="text-sm font-medium text-foreground">WhatsApp Number (digits only)</label><input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.whatsapp || ''} onChange={e => setContactInfo({ ...contactInfo, whatsapp: e.target.value })} placeholder="01827406756" /></div>
                        <div className="flex flex-col gap-2 md:col-span-2"><label className="text-sm font-medium text-foreground">Email Address</label><input type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.email || ''} onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })} /></div>
                        <div className="flex flex-col gap-2 md:col-span-2"><label className="text-sm font-medium text-foreground">Full Address</label><input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.address || ''} onChange={e => setContactInfo({ ...contactInfo, address: e.target.value })} /></div>
                        <div className="flex flex-col gap-2 md:col-span-2"><label className="text-sm font-medium text-foreground">Facebook URL</label><input type="url" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.facebook_url || ''} onChange={e => setContactInfo({ ...contactInfo, facebook_url: e.target.value })} /></div>
                        <div className="flex flex-col gap-2 md:col-span-2"><label className="text-sm font-medium text-foreground">Instagram URL</label><input type="url" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.instagram_url || ''} onChange={e => setContactInfo({ ...contactInfo, instagram_url: e.target.value })} /></div>
                        <div className="flex flex-col gap-2 md:col-span-2"><label className="text-sm font-medium text-foreground">Google Maps URL</label><input type="url" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.google_maps_url || ''} onChange={e => setContactInfo({ ...contactInfo, google_maps_url: e.target.value })} /></div>
                        <div className="flex flex-col gap-2"><label className="text-sm font-medium text-foreground">Flagship Store Name</label><input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.flagship_name || ''} onChange={e => setContactInfo({ ...contactInfo, flagship_name: e.target.value })} /></div>
                        <div className="flex flex-col gap-2"><label className="text-sm font-medium text-foreground">Flagship Store Address</label><input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contactInfo.flagship_address || ''} onChange={e => setContactInfo({ ...contactInfo, flagship_address: e.target.value })} /></div>
                      </div>
                    </div>
                  )}

                  {/* FAQ Page Section */}
                  {bannerSection === 'faq' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-base-800 pb-2">
                        <h2 className="text-h3 font-black">❓ FAQ Page</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFaqItems([...faqItems, { id: Date.now(), q: 'New Question?', a: 'Answer here.' }])}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none' }}
                          >+ Add FAQ</button>
                          <button
                            type="button"
                            disabled={faqSaving}
                            onClick={async () => {
                              setFaqSaving(true);
                              try {
                                const res = await fetch('/admin-api/site-settings/faq_page', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ data: faqItems }),
                                });
                                const result = await res.json();
                                if (!result.success) throw new Error(result.error);
                                if (result.data && Array.isArray(result.data)) setFaqItems(result.data);
                                alert('✅ FAQ saved!');
                              } catch (err) { alert('❌ ' + err.message); }
                              finally { setFaqSaving(false); }
                            }}
                            className="action-btn-primary"
                            style={{ padding: '8px 20px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none' }}
                          >{faqSaving ? 'Saving...' : '💾 Save FAQ'}</button>
                        </div>
                      </div>
                      {faqItems.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '13px' }}>No FAQ items yet. Click + Add FAQ to begin.</p>}
                      <div className="space-y-4">
                        {faqItems.map((item, idx) => (
                          <div key={item.id || idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                            <div className="flex justify-between items-center mb-3">
                              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAQ #{idx + 1}</span>
                              <button type="button" onClick={() => setFaqItems(faqItems.filter((_, i) => i !== idx))} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2" style={{ marginBottom: '10px' }}>
                              <label className="text-sm font-medium text-foreground">Question</label>
                              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={item.q} onChange={e => setFaqItems(faqItems.map((f, i) => i === idx ? { ...f, q: e.target.value } : f))} />
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2">
                              <label className="text-sm font-medium text-foreground">Answer</label>
                              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" rows={3} value={item.a} onChange={e => setFaqItems(faqItems.map((f, i) => i === idx ? { ...f, a: e.target.value } : f))} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Return Policy Section */}
                  {bannerSection === 'return_policy' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-base-800 pb-2">
                        <h2 className="text-h3 font-black">🔄 Returns &amp; Exchanges Page</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setReturnPolicySections([...returnPolicySections, { id: Date.now(), title: 'New Section', text: 'Section content here.' }])}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none' }}
                          >+ Add Section</button>
                          <button
                            type="button"
                            disabled={returnSaving}
                            onClick={async () => {
                              setReturnSaving(true);
                              try {
                                const res = await fetch('/admin-api/site-settings/return_policy', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ data: returnPolicySections }),
                                });
                                const result = await res.json();
                                if (!result.success) throw new Error(result.error);
                                if (result.data && Array.isArray(result.data)) setReturnPolicySections(result.data);
                                alert('✅ Return Policy saved!');
                              } catch (err) { alert('❌ ' + err.message); }
                              finally { setReturnSaving(false); }
                            }}
                            className="action-btn-primary"
                            style={{ padding: '8px 20px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none' }}
                          >{returnSaving ? 'Saving...' : '💾 Save Policy'}</button>
                        </div>
                      </div>
                      {returnPolicySections.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '13px' }}>No sections yet. Click + Add Section to begin.</p>}
                      <div className="space-y-4">
                        {returnPolicySections.map((sec, idx) => (
                          <div key={sec.id || idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                            <div className="flex justify-between items-center mb-3">
                              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section {idx + 1}</span>
                              <button type="button" onClick={() => setReturnPolicySections(returnPolicySections.filter((_, i) => i !== idx))} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2" style={{ marginBottom: '10px' }}>
                              <label className="text-sm font-medium text-foreground">Section Title</label>
                              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={sec.title} onChange={e => setReturnPolicySections(returnPolicySections.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))} />
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2">
                              <label className="text-sm font-medium text-foreground">Section Content (use • for bullet points)</label>
                              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" rows={5} value={sec.text} onChange={e => setReturnPolicySections(returnPolicySections.map((s, i) => i === idx ? { ...s, text: e.target.value } : s))} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust Badges section */}
                  {bannerSection === 'trust' && (
                    <div className="space-y-4">
                      <h2 className="text-h3 font-black border-b border-base-800 pb-2">Checkout Trust Badges</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Trust Badge 1</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.trustBadge1 || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, trustBadge1: e.target.value })}
                            placeholder="e.g. Cash on Delivery Available"
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Trust Badge 2</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.trustBadge2 || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, trustBadge2: e.target.value })}
                            placeholder="e.g. Check in front of Delivery Man"
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Trust Badge 3</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.trustBadge3 || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, trustBadge3: e.target.value })}
                            placeholder="e.g. No Return after Delivery Man Leaves"
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-medium text-foreground">Trust Badge 4</label>
                          <input 
                            type="text" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                            value={homeSettings.trustBadge4 || ''}
                            onChange={(e) => setHomeSettings({ ...homeSettings, trustBadge4: e.target.value })}
                            placeholder="e.g. Exchange Available (Conditions Apply)"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
                    <Button variant="primary" type="submit" disabled={saveLoading} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                      {saveLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 4. NAVIGATION MENU TAB */}
          {activeTab === 'nav' && (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-h3 font-black">Navigation Menu</h2>
                  <p className="text-xs text-surface-muted mt-1">Drag to reorder · Edit labels & links · Toggle dropdown sub-items · Save when done.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={addNavItem}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '6px', height: 'auto', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                  <button
                    onClick={handleSaveNavMenu}
                    disabled={navSaving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 18px', fontSize: '12px', borderRadius: '6px',
                      cursor: navSaving ? 'not-allowed' : 'pointer',
                      background: navSaved ? 'rgba(34,197,94,0.15)' : 'var(--brand)',
                      color: navSaved ? 'rgb(34,197,94)' : '#fff',
                      border: navSaved ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--brand)',
                      fontWeight: 600, transition: 'all 0.2s',
                    }}
                  >
                    {navSaving ? <Loader2 size={13} className="spin" /> : navSaved ? <><CheckCircle size={13} /> Saved!</> : <><Save size={13} /> Save to Website</>}
                  </button>
                </div>
              </div>

              {/* Menu Items List */}
              <div style={{ border: '1px solid var(--border-base)', borderRadius: '10px', overflow: 'hidden' }}>

                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 1.6fr 110px 80px 36px',
                  gap: '0',
                  padding: '10px 16px',
                  background: 'var(--surface-3)',
                  borderBottom: '1px solid var(--border-base)',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)', textTransform: 'uppercase',
                }}>
                  <span></span>
                  <span>Label</span>
                  <span>URL / Path</span>
                  <span>Type</span>
                  <span style={{ textAlign: 'center' }}>Sub-links</span>
                  <span></span>
                </div>

                {/* Rows */}
                {navMenu.map((item, idx) => (
                  <div key={idx}>
                    {/* Main Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr 1.6fr 110px 80px 36px',
                      gap: '0',
                      alignItems: 'center',
                      padding: '8px 16px',
                      borderBottom: item.type === 'category' && (item.subs||[]).length > 0 ? 'none' : '1px solid var(--border-base)',
                      background: idx % 2 === 0 ? 'var(--surface-1)' : 'var(--surface-2)',
                      transition: 'background 0.15s',
                    }}>
                      {/* Order controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                        <button
                          onClick={() => moveNavItem(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                          style={{ background: 'none', border: 'none', padding: '1px 4px', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'var(--border-base)' : 'var(--text-tertiary)', lineHeight: 1, fontSize: '9px', borderRadius: '2px' }}
                        >▲</button>
                        <button
                          onClick={() => moveNavItem(idx, 1)}
                          disabled={idx === navMenu.length - 1}
                          title="Move down"
                          style={{ background: 'none', border: 'none', padding: '1px 4px', cursor: idx === navMenu.length - 1 ? 'not-allowed' : 'pointer', color: idx === navMenu.length - 1 ? 'var(--border-base)' : 'var(--text-tertiary)', lineHeight: 1, fontSize: '9px', borderRadius: '2px' }}
                        >▼</button>
                      </div>

                      {/* Label */}
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateNavItem(idx, 'label', e.target.value)}
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                          width: '100%', padding: '4px 8px 4px 0',
                        }}
                        onFocus={e => e.target.style.background = 'var(--surface-3)'}
                        onBlur={e => e.target.style.background = 'transparent'}
                      />

                      {/* URL */}
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => updateNavItem(idx, 'url', e.target.value)}
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          fontSize: '12px', color: 'var(--text-secondary)',
                          fontFamily: 'monospace', width: '100%', padding: '4px 8px 4px 0',
                        }}
                        onFocus={e => e.target.style.background = 'var(--surface-3)'}
                        onBlur={e => e.target.style.background = 'transparent'}
                      />

                      {/* Type badge / toggle */}
                      <div>
                        <button
                          onClick={() => updateNavItem(idx, 'type', item.type === 'link' ? 'category' : 'link')}
                          style={{
                            fontSize: '10px', fontWeight: 700, padding: '3px 9px',
                            borderRadius: '20px', border: 'none', cursor: 'pointer',
                            background: item.type === 'category' ? 'rgba(99,102,241,0.15)' : 'rgba(148,163,184,0.12)',
                            color: item.type === 'category' ? 'rgb(129,140,248)' : 'var(--text-tertiary)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {item.type === 'category' ? '⌄ Dropdown' : '→ Link'}
                        </button>
                      </div>

                      {/* Sub-link count */}
                      <div style={{ textAlign: 'center' }}>
                        {item.type === 'category' ? (
                          <span style={{
                            fontSize: '11px', fontWeight: 700,
                            color: (item.subs||[]).length > 0 ? 'var(--brand)' : 'var(--text-tertiary)',
                          }}>
                            {(item.subs||[]).length} sub
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--border-base)' }}>—</span>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeNavItem(idx)}
                        title="Remove item"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-tertiary)', padding: '4px',
                          borderRadius: '4px', display: 'flex', alignItems: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Sub-items accordion */}
                    {item.type === 'category' && (
                      <div style={{
                        background: 'var(--surface-3)',
                        borderBottom: '1px solid var(--border-base)',
                        padding: '10px 16px 12px 48px',
                        borderLeft: '3px solid var(--brand)',
                      }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                          Dropdown Sub-links
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(item.subs || []).map((sub, si) => (
                            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', minWidth: '16px' }}>↳</span>
                              <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Sub-item label"
                                value={sub.label}
                                onChange={(e) => updateSubItem(idx, si, 'label', e.target.value)}
                                style={{ flex: '1', fontSize: '12px', padding: '6px 10px' }}
                              />
                              <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="/shop?category=men&subcategory=..."
                                value={sub.url}
                                onChange={(e) => updateSubItem(idx, si, 'url', e.target.value)}
                                style={{ flex: '2', fontSize: '12px', fontFamily: 'monospace', padding: '6px 10px' }}
                              />
                              <button
                                onClick={() => removeSubItem(idx, si)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: 'var(--text-tertiary)', padding: '4px 6px', borderRadius: '4px',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => addSubItem(idx)}
                          style={{
                            marginTop: '8px', fontSize: '11px', fontWeight: 600,
                            color: 'var(--brand)', background: 'transparent',
                            border: '1px dashed var(--brand)', borderRadius: '5px',
                            padding: '4px 14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >
                          <Plus size={11} /> Add Sub-link
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {navMenu.length === 0 && (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    No menu items yet. Click <strong>"+ Add Item"</strong> to get started.
                  </div>
                )}
              </div>

              {/* Live preview hint */}
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                💡 Click a <strong>→ Link</strong> or <strong>⌄ Dropdown</strong> badge to toggle the type.
              </p>
            </div>
          )}

        </div>
      )}

      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Edit Storefront Product' : 'Add New Product'}
        subtitle="Configure product details, stock synchronization, pricing, and media gallery."
        size="lg"
      >
        <form onSubmit={saveProductSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Product Name</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={prodForm.name}
                  onChange={handleProdNameChange}
                  required 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="sf-label flex justify-between items-center">
                  <span>URL Slug</span>
                  <span className="text-[10px] text-brand flex items-center gap-1 cursor-pointer" onClick={() => setProdForm({ ...prodForm, slug: generateSlug(prodForm.name) })}>
                    <Sparkles size={10} /> Auto
                  </span>
                </label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={prodForm.slug}
                  onChange={(e) => setProdForm({ ...prodForm, slug: generateSlug(e.target.value) })}
                  required 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={prodForm.category}
                  onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Link to Inventory Item (Stock Sync)</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={prodForm.inventory_id || ''}
                  onChange={(e) => setProdForm({ ...prodForm, inventory_id: e.target.value || '' })}
                >
                  <option value="">-- No Link (Ignore Stock Control) --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku || 'No SKU'}) - Stock: {item.current_stock}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {prodForm.inventory_id && (
                    <button
                      type="button"
                      onClick={() => syncVariantsFromInventory(prodForm.inventory_id)}
                      className="text-xs text-brand hover:text-brand-400 font-bold flex items-center gap-1.5 cursor-pointer bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg border border-brand/20 transition-all"
                    >
                      🔄 Import Variations from Linked Inventory
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={quickCreatingInventory}
                    onClick={handleQuickCreateInventory}
                    className="text-xs text-emerald-600 hover:text-emerald-500 font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all"
                  >
                    {quickCreatingInventory ? 'Creating...' : '➕ Quick Create & Link Inventory'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Badge Tag (e.g. Bestseller, New, Drop)</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Leave empty for none"
                  value={prodForm.badge}
                  onChange={(e) => setProdForm({ ...prodForm, badge: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Selling Price (BDT)</label>
                <input 
                  type="number" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                  required 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Original/Strike Price (BDT)</label>
                <input 
                  type="number" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Leave empty for no strike"
                  value={prodForm.original_price}
                  onChange={(e) => setProdForm({ ...prodForm, original_price: e.target.value })}
                />
              </div>

              <ImageUploadInput
                label="Product Main Image URL"
                value={prodForm.image}
                onChange={(val) => setProdForm({ ...prodForm, image: val })}
                placeholder="e.g. /images/hoodie-black.webp"
                required
              />

              <MultipleImageUploadInput
                label="Product Additional Images"
                value={prodForm.images || []}
                onChange={(urls) => setProdForm({ ...prodForm, images: urls })}
              />

              <ColorImagesEditor
                colors={typeof prodForm.colors === 'string' ? prodForm.colors : (Array.isArray(prodForm.colors) ? prodForm.colors.join(', ') : '')}
                colorImages={prodForm.color_images || {}}
                onChange={(newMap) => setProdForm(prev => ({ ...prev, color_images: newMap }))}
                onColorsChange={(newColors) => setProdForm(prev => ({ ...prev, colors: newColors }))}
                onRemoveColor={(colorToRemove, updatedMap, updatedColors) => {
                  setProdForm(prev => {
                    const cleanVariants = colorToRemove 
                      ? (prev.variants || []).filter(v => v.color?.toLowerCase() !== colorToRemove.toLowerCase())
                      : (prev.variants || []);
                    return {
                      ...prev,
                      color_images: updatedMap,
                      colors: updatedColors,
                      variants: cleanVariants
                    };
                  });
                }}
              />

              <SizeGuideTableEditor
                value={prodForm.size_guide}
                onChange={(guide) => setProdForm({ ...prodForm, size_guide: guide })}
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Available Sizes (comma separated)</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="e.g. S, M, L, XL"
                  value={prodForm.sizes}
                  onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Available Colors (comma separated)</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="e.g. black, rust, grey"
                  value={prodForm.colors}
                  onChange={(e) => setProdForm({ ...prodForm, colors: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Product Features (comma separated)</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="e.g. 100% Premium Cotton, Oversized Fit"
                  value={prodForm.features || ''}
                  onChange={(e) => setProdForm({ ...prodForm, features: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Material / Fabric</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="e.g. Cotton 100%, Heavyweight Fleece"
                  value={prodForm.material || ''}
                  onChange={(e) => setProdForm({ ...prodForm, material: e.target.value })}
                />
              </div>

              {/* Product Variations (Color, Size, SKU, Stock) */}
              <div className="sf-form-group full-width border border-base-300/30 rounded-xl p-4 bg-base-900/40 mt-2">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-surface-primary">Product Variations</h4>
                    <p className="text-xs text-surface-muted">Manage size & color combinations, SKUs, and individual stocks.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={generateVariantCombinations}
                      className="px-3 py-1.5 text-xs font-semibold bg-brand/10 text-brand border border-brand/20 rounded-lg hover:bg-brand/20 transition-all cursor-pointer"
                    >
                      Auto-Generate Combinations
                    </button>
                    <button 
                      type="button" 
                      onClick={addVariantRow}
                      className="px-3 py-1.5 text-xs font-semibold bg-base-800 text-surface-primary border border-base-300/40 rounded-lg hover:bg-base-750 transition-all cursor-pointer"
                    >
                      + Add Row
                    </button>
                  </div>
                </div>

                {(!prodForm.variants || prodForm.variants.length === 0) ? (
                  <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                    <p className="text-xs text-surface-muted">No variations added yet. Click Auto-Generate or Add Row to start.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-base-300/20 text-surface-muted uppercase font-mono tracking-wider">
                          <th className="pb-2 pr-2 font-medium">Size</th>
                          <th className="pb-2 px-2 font-medium">Color</th>
                          <th className="pb-2 px-2 font-medium">SKU</th>
                          <th className="pb-2 px-2 font-medium">Stock</th>
                          <th className="pb-2 pl-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prodForm.variants.map((v, idx) => (
                          <tr key={idx} className="border-b border-base-300/10 last:border-0">
                            <td className="py-2 pr-2">
                              <input 
                                type="text"
                                className="w-full bg-base-800 border border-base-300/30 rounded px-2 py-1 text-surface-primary"
                                placeholder="e.g. S"
                                value={v.size || ''}
                                onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input 
                                type="text"
                                className="w-full bg-base-800 border border-base-300/30 rounded px-2 py-1 text-surface-primary"
                                placeholder="e.g. Black"
                                value={v.color || ''}
                                onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input 
                                type="text"
                                className="w-full bg-base-800 border border-base-300/30 rounded px-2 py-1 text-surface-primary font-mono"
                                placeholder="SKU"
                                value={v.sku || ''}
                                onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                              />
                            </td>
                            <td className="py-2 px-2 w-24">
                              <input 
                                type="number"
                                className="w-full bg-base-800 border border-base-300/30 rounded px-2 py-1 text-surface-primary"
                                placeholder="0"
                                value={v.stock}
                                onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="py-2 pl-2 text-right">
                              <button 
                                type="button"
                                onClick={() => removeVariantRow(idx)}
                                className="text-red-500 hover:text-red-400 font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Short Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Describe this product briefly..."
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Long Details Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Provide detailed composition, sizing details etc..."
                  value={prodForm.long_description}
                  onChange={(e) => setProdForm({ ...prodForm, long_description: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Stock Status</label>
                <div className="flex items-center gap-3 mt-2">
                  <Switch 
                    checked={prodForm.in_stock}
                    onCheckedChange={(checked) => setProdForm({ ...prodForm, in_stock: checked })}
                  />
                  <span className="text-sm font-semibold">{prodForm.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button variant="ghost" type="button" onClick={() => setIsProductModalOpen(false)} className="rounded-full px-5 py-2 text-xs font-bold">Cancel</Button>
              <Button variant="primary" type="submit" disabled={saveLoading} className="rounded-full px-6 py-2 text-xs font-bold gap-2">
                {saveLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save Product
              </Button>
            </div>
          </form>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        subtitle="Manage storefront categories, image banner, and URL slugs."
      >
        <form onSubmit={saveCategorySubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">Category Name</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                value={catForm.name}
                onChange={handleCatNameChange}
                required 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground flex justify-between items-center">
                <span>URL Slug</span>
                <span className="text-[10px] text-primary flex items-center gap-1 cursor-pointer font-bold" onClick={() => setCatForm({ ...catForm, slug: generateSlug(catForm.name) })}>
                  <Sparkles size={10} /> Auto
                </span>
              </label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                value={catForm.slug}
                onChange={(e) => setCatForm({ ...catForm, slug: generateSlug(e.target.value) })}
                required 
              />
            </div>

            <ImageUploadInput
              label="Category Image URL"
              value={catForm.image_url}
              onChange={(val) => setCatForm({ ...catForm, image_url: val })}
              placeholder="e.g. /images/cat-hoodies.webp"
            />

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsCategoryModalOpen(false)} className="rounded-full px-5 py-2 text-xs font-bold">Cancel</Button>
            <Button variant="primary" type="submit" disabled={saveLoading} className="rounded-full px-6 py-2 text-xs font-bold gap-2">
              {saveLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Global Confirmation Dialog */}
      <AlertDialog open={confirmState.isOpen} onOpenChange={(open) => setConfirmState(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setConfirmState(prev => ({ ...prev, isOpen: false }));
              if (confirmState.onConfirm) confirmState.onConfirm();
            }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Alert Dialog */}
      <AlertDialog open={alertState.isOpen} onOpenChange={(open) => setAlertState(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent style={{ maxWidth: 420 }}>
          <AlertDialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
              {alertState.type === 'success' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', marginBottom: 4 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
              {alertState.type === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', marginBottom: 4 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
              )}
              {alertState.type === 'info' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', marginBottom: 4 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
              )}
              <AlertDialogTitle style={{ marginTop: 4 }}>{alertState.title}</AlertDialogTitle>
              <AlertDialogDescription style={{ textAlign: 'center' }}>
                {alertState.description}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ justifyContent: 'center' }}>
            <AlertDialogAction onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
export default StorefrontManagement;
