// Centralized Product Media Normalizer & Image Resolver
// Guarantees deterministic, rock-solid image resolution across the entire storefront & admin

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
export const MEDIA_BASE_URL = '/api/media';

/**
 * Sanitizes and validates a potential image URL.
 * Handles relative paths, whitespace, stringified JSON, media.putimach.com R2 proxying, and invalid URL formats.
 */
export function cleanImageUrl(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;

  let trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""' || trimmed === "''") {
    return null;
  }

  // Handle accidental quotes wrapped around URL
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  if (!trimmed) return null;

  // Handle data URLs directly
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Rewrite media.putimach.com directly to Next.js R2 Media Proxy Route
  if (/^https?:\/\/media\.putimach\.com/i.test(trimmed)) {
    const keyPath = trimmed.replace(/^https?:\/\/media\.putimach\.com\/?/i, '');
    return `/api/media/${keyPath.replace(/^\/+/, '')}`;
  }

  // If already pointing to /api/media/...
  if (trimmed.startsWith('/api/media/')) {
    return trimmed;
  }
  if (trimmed.startsWith('api/media/')) {
    return `/${trimmed}`;
  }

  // If pointing to uploads/... or /uploads/...
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const keyPath = trimmed.replace(/^\/?uploads\//, '');
    return `/api/media/uploads/${keyPath}`;
  }

  // If already absolute HTTP / HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If absolute path starting with slash (e.g. /images/...)
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If relative path without protocol (e.g. products/sample.webp)
  const cleanPath = trimmed.replace(/^\/+/, '');
  return `/api/media/${cleanPath}`;
}

/**
 * Extracts all valid image candidates from a product in deterministic priority order.
 */
export function extractProductImages(product: any): string[] {
  if (!product) return [];

  const candidates: string[] = [];

  const addCandidate = (val: unknown) => {
    if (!val) return;

    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Check if it's a stringified JSON array
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(addCandidate);
            return;
          }
        } catch {
          // not valid JSON, treat as single string
        }
      }

      // Check if it's a comma-separated list of URLs
      if (trimmed.includes(',') && (trimmed.includes('http') || trimmed.includes('media.putimach.com') || trimmed.includes('/api/media'))) {
        trimmed.split(',').forEach((part) => addCandidate(part.trim()));
        return;
      }

      const cleaned = cleanImageUrl(trimmed);
      if (cleaned) candidates.push(cleaned);
    } else if (Array.isArray(val)) {
      val.forEach(addCandidate);
    } else if (typeof val === 'object' && val !== null) {
      // If object is a color-images dictionary or has url / src / image property
      const obj = val as Record<string, unknown>;
      if (obj.url) addCandidate(obj.url);
      else if (obj.src) addCandidate(obj.src);
      else if (obj.image) addCandidate(obj.image);
      else if (obj.image_url) addCandidate(obj.image_url);
      else {
        // May be a dictionary of color galleries
        Object.values(obj).forEach(addCandidate);
      }
    }
  };

  // 1. Primary explicit image fields (Main image always top priority)
  addCandidate(product.main_image);
  addCandidate(product.mainImage);
  addCandidate(product.primary_image);
  addCandidate(product.primaryImage);
  addCandidate(product.image);
  addCandidate(product.thumbnail);
  addCandidate(product.thumbnailUrl);
  addCandidate(product.featured_image);
  addCandidate(product.cover_image);

  // 2. Explicit images arrays
  addCandidate(product.images);
  addCandidate(product.gallery);

  // 3. Nested data object (for raw Supabase rows)
  if (product.data && typeof product.data === 'object') {
    addCandidate(product.data.main_image);
    addCandidate(product.data.mainImage);
    addCandidate(product.data.image);
    addCandidate(product.data.images);
    addCandidate(product.data.gallery);
    addCandidate(product.data.primary_image);
    addCandidate(product.data.primaryImage);
  }

  // 4. Color image map & galleries
  const colorMap = product.color_images || product.colorImages || product.color_galleries || product.data?.color_images || product.data?.colorImages || product.data?.color_galleries;
  if (colorMap && typeof colorMap === 'object') {
    Object.values(colorMap).forEach(addCandidate);
  }

  // 5. Variant images
  const variants = product.variants || product.data?.variants;
  if (Array.isArray(variants)) {
    variants.forEach((v) => {
      if (v) {
        addCandidate(v.image_url);
        addCandidate(v.image);
        addCandidate(v.imageUrl);
      }
    });
  }

  // Deduplicate preserving order
  const unique = Array.from(new Set(candidates));
  return unique;
}

/**
 * Resolves the single best primary image for a product with fallback.
 */
export function resolveProductPrimaryImage(product: any, fallback = DEFAULT_PRODUCT_FALLBACK): string {
  const images = extractProductImages(product);
  return images.length > 0 ? images[0] : fallback;
}

/**
 * Normalizes any raw product from Supabase / API into a consistent shape with multi-color galleries.
 */
export function normalizeProduct(raw: any): any {
  if (!raw) return null;

  // Unpack if wrapped in a data column
  const base = {
    id: raw.id,
    created_at: raw.created_at,
    slug: raw.slug || raw.data?.slug || (typeof raw.id === 'string' ? raw.id : `product-${raw.id}`),
    ...(raw.data || {}),
    ...raw,
  };

  const allImages = extractProductImages(base);
  const primaryImage = allImages.length > 0 ? allImages[0] : DEFAULT_PRODUCT_FALLBACK;
  const guaranteedImages = allImages.length > 0 ? allImages : [primaryImage];

  // Normalize color_images into multi-image arrays: Record<string, string[]>
  const rawColorImages = base.color_images || base.colorImages || base.color_galleries || base.colorGalleries || {};
  const normalizedColorGalleries: Record<string, string[]> = {};
  const singleColorMap: Record<string, string> = {};

  if (typeof rawColorImages === 'object' && rawColorImages !== null) {
    Object.entries(rawColorImages).forEach(([colorName, val]) => {
      if (!colorName) return;
      const cleanColorName = colorName.trim();
      const list: string[] = [];

      if (Array.isArray(val)) {
        val.forEach((item) => {
          const cleaned = cleanImageUrl(item);
          if (cleaned && !list.includes(cleaned)) list.push(cleaned);
        });
      } else if (typeof val === 'string') {
        const cleaned = cleanImageUrl(val);
        if (cleaned) list.push(cleaned);
      }

      if (list.length > 0) {
        normalizedColorGalleries[cleanColorName] = list;
        singleColorMap[cleanColorName] = list[0];
      }
    });
  }

  // Also harvest any variant images attached to specific colors
  const variants = base.variants || base.data?.variants;
  if (Array.isArray(variants)) {
    variants.forEach((v) => {
      if (v?.color && (v.image_url || v.image)) {
        const cName = String(v.color).trim();
        const cleaned = cleanImageUrl(v.image_url || v.image);
        if (cleaned) {
          if (!normalizedColorGalleries[cName]) {
            normalizedColorGalleries[cName] = [];
          }
          if (!normalizedColorGalleries[cName].includes(cleaned)) {
            normalizedColorGalleries[cName].push(cleaned);
          }
          if (!singleColorMap[cName]) {
            singleColorMap[cName] = cleaned;
          }
        }
      }
    });
  }

  // Normalize sizes
  let sizes: string[] = [];
  if (Array.isArray(base.sizes)) {
    sizes = base.sizes.filter(Boolean).map(String);
  } else if (typeof base.sizes === 'string') {
    sizes = base.sizes.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (sizes.length === 0) sizes = ['Free Size'];

  // Normalize colors
  let colors: string[] = [];
  if (Array.isArray(base.colors)) {
    colors = base.colors.filter(Boolean).map(String);
  } else if (typeof base.colors === 'string') {
    colors = base.colors.split(',').map((c) => c.trim()).filter(Boolean);
  }
  const colorKeys = Object.keys(normalizedColorGalleries);
  colors = Array.from(new Set([...colors, ...colorKeys])).filter(Boolean);

  const price = Number(base.price) || 0;
  const originalPrice = base.original_price || base.originalPrice ? Number(base.original_price || base.originalPrice) : null;

  // Authoritative operational stock calculation
  const variantsList = Array.isArray(base.variants) ? base.variants : [];
  const hasVariants = variantsList.length > 0;
  const variantStockTotal = hasVariants 
    ? variantsList.reduce((sum: number, v: any) => sum + (Number(v?.stock) || 0), 0)
    : null;

  let rawStock = 50;
  if (base.stock !== undefined && base.stock !== null) {
    rawStock = Number(base.stock);
  } else if (base.inventory?.current_stock !== undefined) {
    rawStock = Number(base.inventory.current_stock);
  }

  const effectiveStock = variantStockTotal !== null ? variantStockTotal : rawStock;
  const isAvailable = effectiveStock > 0 && base.status !== 'draft' && base.status !== 'archived';

  return {
    ...base,
    id: base.id,
    slug: base.slug,
    name: base.name || 'Untitled Product',
    price,
    original_price: originalPrice,
    originalPrice,
    main_image: primaryImage,
    mainImage: primaryImage,
    primary_image: primaryImage,
    image: primaryImage,
    images: guaranteedImages,
    color_images: normalizedColorGalleries,
    color_images_map: singleColorMap,
    colorImages: normalizedColorGalleries,
    color_galleries: normalizedColorGalleries,
    sizes,
    colors,
    stock: effectiveStock,
    in_stock: isAvailable,
    inStock: isAvailable,
    description: base.description || base.long_description || base.longDescription || '',
    long_description: base.description || base.long_description || base.longDescription || '',
    longDescription: base.description || base.long_description || base.longDescription || '',
  };
}

/**
 * Universal Single-Source-Of-Truth Stock Status Checker
 */
export function isProductInStock(product: any, selectedVariant?: any): boolean {
  if (!product) return false;
  if (product.status === 'draft' || product.status === 'archived') return false;

  // 1. If a specific variant is selected
  if (selectedVariant) {
    return (Number(selectedVariant.stock) || 0) > 0;
  }

  // 2. If product has variants
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const hasAnyVariantStock = product.variants.some((v: any) => (Number(v?.stock) || 0) > 0);
    if (hasAnyVariantStock) return true;
  }

  // 3. Check inventory if attached
  if (product.inventory && product.inventory.current_stock !== undefined) {
    return Number(product.inventory.current_stock) > 0;
  }

  // 4. Check product stock field
  if (product.stock !== undefined && product.stock !== null) {
    return Number(product.stock) > 0;
  }

  // 5. Fallback to boolean in_stock
  return product.in_stock !== false && product.inStock !== false;
}