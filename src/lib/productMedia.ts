// Centralized Product Media Normalizer & Image Resolver
// Guarantees deterministic, rock-solid image resolution across the entire storefront

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
export const MEDIA_BASE_URL = 'https://media.putimach.com';

/**
 * Sanitizes and validates a potential image URL.
 * Handles relative paths, whitespace, stringified JSON, and invalid URL formats.
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

  // If already absolute HTTP / HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If data URL
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // If absolute path starting with slash (e.g. /images/...)
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If relative path without protocol (e.g. products/sample.webp or uploads/...)
  const cleanPath = trimmed.replace(/^\/+/, '');
  return `${MEDIA_BASE_URL}/${cleanPath}`;
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
      if (trimmed.includes(',') && (trimmed.includes('http') || trimmed.includes('media.putimach.com'))) {
        trimmed.split(',').forEach((part) => addCandidate(part.trim()));
        return;
      }

      const cleaned = cleanImageUrl(trimmed);
      if (cleaned) candidates.push(cleaned);
    } else if (Array.isArray(val)) {
      val.forEach(addCandidate);
    } else if (typeof val === 'object' && val !== null) {
      // If object has url / src / image property
      const obj = val as Record<string, unknown>;
      if (obj.url) addCandidate(obj.url);
      else if (obj.src) addCandidate(obj.src);
      else if (obj.image) addCandidate(obj.image);
      else if (obj.image_url) addCandidate(obj.image_url);
    }
  };

  // 1. Primary explicit image fields
  addCandidate(product.image);
  addCandidate(product.primary_image);
  addCandidate(product.primaryImage);
  addCandidate(product.thumbnail);
  addCandidate(product.thumbnailUrl);
  addCandidate(product.featured_image);
  addCandidate(product.cover_image);

  // 2. Explicit images arrays
  addCandidate(product.images);
  addCandidate(product.gallery);

  // 3. Nested data object (for raw Supabase rows)
  if (product.data && typeof product.data === 'object') {
    addCandidate(product.data.image);
    addCandidate(product.data.images);
    addCandidate(product.data.gallery);
    addCandidate(product.data.primary_image);
  }

  // 4. Color image map
  const colorMap = product.color_images || product.colorImages || product.data?.color_images || product.data?.colorImages;
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
 * Normalizes any raw product from Supabase / API into a consistent shape with resolved images.
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

  const images = extractProductImages(base);
  const primaryImage = images.length > 0 ? images[0] : DEFAULT_PRODUCT_FALLBACK;
  const guaranteedImages = images.length > 0 ? images : [primaryImage];

  // Normalize color_images
  const rawColorImages = base.color_images || base.colorImages || {};
  const normalizedColorImages: Record<string, string> = {};
  if (typeof rawColorImages === 'object' && rawColorImages !== null) {
    Object.entries(rawColorImages).forEach(([color, url]) => {
      const cleaned = cleanImageUrl(url);
      if (cleaned) normalizedColorImages[color] = cleaned;
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
  const colorKeys = Object.keys(normalizedColorImages);
  colors = Array.from(new Set([...colors, ...colorKeys])).filter(Boolean);

  const price = Number(base.price) || 0;
  const originalPrice = base.original_price || base.originalPrice ? Number(base.original_price || base.originalPrice) : null;

  return {
    ...base,
    id: base.id,
    slug: base.slug,
    name: base.name || 'Untitled Product',
    price,
    original_price: originalPrice,
    originalPrice,
    image: primaryImage,
    images: guaranteedImages,
    color_images: normalizedColorImages,
    colorImages: normalizedColorImages,
    sizes,
    colors,
    in_stock: base.in_stock !== false && base.inStock !== false,
  };
}