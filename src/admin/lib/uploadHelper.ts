// @ts-nocheck
// admin/src/lib/uploadHelper.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal Image Upload Helper for Local Dev & Vercel Serverless
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert file to optimized WebP image (max 1200px width/height, 82% quality)
 */
export async function convertToWebP(file, maxDimension = 1200, quality = 0.82) {
  if (!file || !file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          const webpFile = new File([blob], webpName, { type: 'image/webp' });
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert file to Base64 Data URL
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Universal upload image function:
 * Converts file to optimized WebP image and uploads directly to Cloudflare R2 Storage CDN
 */
export async function uploadImage(file) {
  if (!file) throw new Error('No file provided');

  // Convert to WebP first (<80KB) for ultra-fast upload speed
  const webpFile = await convertToWebP(file);

  try {
    const formData = new FormData();
    formData.append('file', webpFile);

    const res = await fetch('/admin-api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url; // Returns Cloudflare R2 CDN URL (e.g. https://media.putimach.com/uploads/img_...)
      } else {
        throw new Error(data.error || 'Server returned success: false');
      }
    } else {
      throw new Error(`HTTP status ${res.status}`);
    }
  } catch (e) {
    console.error('Cloudflare R2 upload failed:', e);
    if (typeof window !== 'undefined') {
      const msg = `Cloudflare R2 storage upload failed (${e.message}). The image will fall back to local database storage (base64), which will slow down page load speed. Please verify R2 settings.`;
      if (window.Swal) {
        window.Swal.fire({
          title: 'Storage Upload Failed ⚠️',
          text: msg,
          icon: 'warning',
          confirmButtonColor: '#C5A880'
        });
      } else {
        alert(msg);
      }
    }
  }

  // Fallback to WebP Data URL if upload endpoint is unreachable
  return await fileToDataUrl(webpFile);
}
