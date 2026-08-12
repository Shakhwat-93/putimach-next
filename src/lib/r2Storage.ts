// @ts-nocheck
/**
 * Cloudflare R2 S3 Media Storage Utility
 * 
 * Provides zero-egress, high-performance media storage management for PutiMach.
 * Uses standard AWS S3 REST API compatible with Cloudflare R2 storage endpoints.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME || 'putimach-media';
const PUBLIC_DOMAIN = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || '';

/**
 * Get public CDN URL for an uploaded object key
 * @param {string} key - S3 object key (e.g. 'products/item-123.webp')
 * @returns {string} Fully qualified CDN image URL
 */
export function getR2PublicUrl(key) {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  
  const cleanKey = key.replace(/^\/+/, '');
  if (PUBLIC_DOMAIN) {
    const base = PUBLIC_DOMAIN.replace(/\/+$/, '');
    return `${base}/${cleanKey}`;
  }
  // Fallback to Cloudflare R2 default endpoint if custom domain is not set
  return `https://${BUCKET_NAME}.${ACCOUNT_ID}.r2.cloudflarestorage.com/${cleanKey}`;
}

/**
 * Format image path for storage upload
 * @param {string} filename Original filename
 * @param {string} folder Target folder name (e.g. 'products', 'banners', 'uploads')
 * @returns {string} Sanitized unique key
 */
export function generateR2StorageKey(filename, folder = 'uploads') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  const ext = filename.split('.').pop()?.toLowerCase() || 'webp';
  const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `${folder}/${cleanName}_${timestamp}_${random}.${ext}`;
}

/**
 * R2 Storage Config Summary for Diagnostics & Setup
 */
export const r2ConfigSummary = {
  isConfigured: Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY),
  bucketName: BUCKET_NAME,
  publicDomain: PUBLIC_DOMAIN || 'Using default R2 bucket URL',
  endpoint: ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : 'Not configured'
};
