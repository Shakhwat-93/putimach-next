// scripts/test-product-media.js
const assert = require('assert');

function cleanImageUrl(url) {
  if (!url) return null;
  if (typeof url !== 'string') return null;

  let trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""' || trimmed === "''") {
    return null;
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (/^https?:\/\/media\.putimach\.com/i.test(trimmed)) {
    const keyPath = trimmed.replace(/^https?:\/\/media\.putimach\.com\/?/i, '');
    return `/api/media/${keyPath.replace(/^\/+/, '')}`;
  }

  if (trimmed.startsWith('/api/media/')) {
    return trimmed;
  }
  if (trimmed.startsWith('api/media/')) {
    return `/${trimmed}`;
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const keyPath = trimmed.replace(/^\/?uploads\//, '');
    return `/api/media/uploads/${keyPath}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  const cleanPath = trimmed.replace(/^\/+/, '');
  return `/api/media/${cleanPath}`;
}

console.log('--- TESTING PRODUCT MEDIA PIPELINE ---');

// Test 1: Cloudflare R2 direct domain rewrite
const t1 = cleanImageUrl('https://media.putimach.com/uploads/img_123.webp');
assert.strictEqual(t1, '/api/media/uploads/img_123.webp');
console.log('✓ Test 1 Passed: media.putimach.com rewritten to /api/media/uploads/img_123.webp');

// Test 2: Local uploads relative path
const t2 = cleanImageUrl('uploads/img_456.webp');
assert.strictEqual(t2, '/api/media/uploads/img_456.webp');
console.log('✓ Test 2 Passed: uploads/img_456.webp normalized to /api/media/uploads/img_456.webp');

// Test 3: Already canonical proxy path
const t3 = cleanImageUrl('/api/media/uploads/img_789.webp');
assert.strictEqual(t3, '/api/media/uploads/img_789.webp');
console.log('✓ Test 3 Passed: /api/media/... preserved');

// Test 4: External image URL
const t4 = cleanImageUrl('https://images.unsplash.com/photo-sample.jpg');
assert.strictEqual(t4, 'https://images.unsplash.com/photo-sample.jpg');
console.log('✓ Test 4 Passed: External Unsplash URL preserved');

// Test 5: Accidental double quotes
const t5 = cleanImageUrl('"uploads/img_test.webp"');
assert.strictEqual(t5, '/api/media/uploads/img_test.webp');
console.log('✓ Test 5 Passed: Accidental quotes stripped');

// Test 6: Null and invalid strings
assert.strictEqual(cleanImageUrl(null), null);
assert.strictEqual(cleanImageUrl(''), null);
assert.strictEqual(cleanImageUrl('   '), null);
assert.strictEqual(cleanImageUrl('null'), null);
assert.strictEqual(cleanImageUrl('undefined'), null);
console.log('✓ Test 6 Passed: Null and corrupted strings rejected gracefully');

console.log('🎉 ALL MEDIA PIPELINE TESTS PASSED!');
