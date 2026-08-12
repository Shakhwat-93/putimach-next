// @ts-nocheck
/**
 * Converts any image file to WebP format client-side using Canvas.
 * @param {File} file - The original uploaded file.
 * @param {number} quality - WebP output quality (0 to 1). Default is 0.85.
 * @returns {Promise<File>} A promise that resolves to the converted WebP File.
 */
export const convertToWebP = (file, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    // If it is already a webp, return it as is
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2d context from canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob conversion failed'));
            return;
          }
          
          // Generate new filename with .webp extension
          const originalName = file.name;
          const lastDotIndex = originalName.lastIndexOf('.');
          const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
          const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
          
          resolve(webpFile);
        }, 'image/webp', quality);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for webp conversion'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};
