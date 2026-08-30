import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME || 'putimach-media';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let s3Client: S3Client | null = null;
if (ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
    requestHandler: new NodeHttpHandler(),
  });
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getContentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Check if a media item is referenced in products, inventory, categories, or settings
 */
export async function checkMediaReferences(key: string, url: string) {
  const supabase = getSupabase();
  const references: Array<{ type: string; id: string; name: string; field: string }> = [];

  const searchTerms = [
    key,
    url,
    `/api/media/${key}`,
    key.replace(/^uploads\//, ''),
  ].filter(Boolean);

  try {
    // 1. Check Storefront Products (cb_products & products)
    const { data: products } = await supabase.from('cb_products').select('id, data').limit(500);
    if (products) {
      for (const prod of products) {
        const d = prod.data || {};
        const pName = d.name || prod.id;
        const jsonStr = JSON.stringify(d);

        const isReferenced = searchTerms.some(term => jsonStr.includes(term));
        if (isReferenced) {
          let field = 'Product Gallery / Description';
          if (searchTerms.some(term => d.image?.includes(term))) field = 'Primary Cover Image';
          else if (searchTerms.some(term => d.size_chart_image?.includes(term))) field = 'Size Chart Image';
          else if (searchTerms.some(term => JSON.stringify(d.color_images || {}).includes(term))) field = 'Color Variant Image';

          references.push({
            type: 'Product',
            id: prod.id,
            name: pName,
            field
          });
        }
      }
    }

    // 2. Check Inventory table
    const { data: invItems } = await supabase.from('inventory').select('id, name, image, image_url').limit(500);
    if (invItems) {
      for (const item of invItems) {
        const isReferenced = searchTerms.some(term => 
          (item.image && item.image.includes(term)) ||
          (item.image_url && item.image_url.includes(term))
        );
        if (isReferenced) {
          references.push({
            type: 'Inventory',
            id: item.id,
            name: item.name || item.id,
            field: 'Inventory Stock Image'
          });
        }
      }
    }

    // 3. Check Categories (cb_categories)
    const { data: categories } = await supabase.from('cb_categories').select('id, data').limit(100);
    if (categories) {
      for (const cat of categories) {
        const d = cat.data || {};
        const catName = d.name || cat.id;
        const jsonStr = JSON.stringify(d);
        if (searchTerms.some(term => jsonStr.includes(term))) {
          references.push({
            type: 'Category',
            id: cat.id,
            name: catName,
            field: 'Category Banner / Icon'
          });
        }
      }
    }

    // 4. Check Site Settings / Hero Banners (cb_settings)
    const { data: settings } = await supabase.from('cb_settings').select('id, key, value, data').limit(100);
    if (settings) {
      for (const s of settings) {
        const jsonStr = JSON.stringify(s);
        if (searchTerms.some(term => jsonStr.includes(term))) {
          references.push({
            type: 'Site Setting',
            id: s.key || s.id,
            name: `Setting: ${s.key || s.id}`,
            field: 'Site Banner / Logo / Graphic'
          });
        }
      }
    }
  } catch (err) {
    console.error('Error checking media references:', err);
  }

  return references;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: List Cloudflare R2 Media Objects
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    if (!s3Client) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare R2 storage credentials are not configured on the server.',
        items: []
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '60', 10), 10), 100);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const sort = searchParams.get('sort') || 'newest'; // newest, oldest, size_desc, size_asc, name_asc, name_desc

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1000,
      ContinuationToken: cursor,
    });

    const response = await s3Client.send(command);
    const rawObjects = response.Contents || [];

    let items = rawObjects
      .filter(obj => Boolean(obj.Key))
      .map(obj => {
        const key = obj.Key!;
        const filename = key.split('/').pop() || key;
        const size = obj.Size || 0;
        const lastModified = obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString();
        const contentType = getContentTypeFromKey(key);
        const url = `/api/media/${key}`;

        return {
          key,
          name: filename,
          url,
          size,
          formattedSize: formatBytes(size),
          contentType,
          lastModified,
          etag: obj.ETag?.replace(/"/g, '') || '',
        };
      });

    // 1. Apply search filter if provided
    if (search) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(search) || 
        item.key.toLowerCase().includes(search)
      );
    }

    // 2. Apply sorting
    if (sort === 'newest') {
      items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } else if (sort === 'oldest') {
      items.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
    } else if (sort === 'size_desc') {
      items.sort((a, b) => b.size - a.size);
    } else if (sort === 'size_asc') {
      items.sort((a, b) => a.size - b.size);
    } else if (sort === 'name_asc') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'name_desc') {
      items.sort((a, b) => b.name.localeCompare(a.name));
    }

    // 3. Paginate / slice to limit
    const paginatedItems = items.slice(0, limit);
    const hasMore = items.length > limit || Boolean(response.IsTruncated);
    const nextCursor = response.NextContinuationToken || (items.length > limit ? 'has-more' : null);

    const totalSize = rawObjects.reduce((sum, o) => sum + (o.Size || 0), 0);

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      totalCount: items.length,
      bucketTotalCount: rawObjects.length,
      bucketTotalSize: totalSize,
      formattedBucketTotalSize: formatBytes(totalSize),
      hasMore,
      nextCursor,
    });
  } catch (err: any) {
    console.error('Error listing R2 media:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to list media from storage',
      items: []
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Upload Media to Cloudflare R2
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    if (!s3Client) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare R2 storage credentials are not configured on the server.',
      }, { status: 500 });
    }

    const formData = await request.formData();
    // Accept single or multiple files
    const files: File[] = [];
    const allFiles = formData.getAll('files');
    const singleFile = formData.get('file');

    if (allFiles && allFiles.length > 0) {
      allFiles.forEach(f => { if (f instanceof File) files.push(f); });
    } else if (singleFile instanceof File) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No file(s) provided for upload' }, { status: 400 });
    }

    const uploadedItems = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const rawExt = file.name.split('.').pop()?.toLowerCase() || 'webp';
      const timestamp = Date.now();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const filename = `img_${timestamp}_${randomSuffix}.${rawExt}`;
      const key = `uploads/${filename}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type || getContentTypeFromKey(key),
        })
      );

      const publicUrl = `/api/media/${key}`;
      const size = buffer.length;

      uploadedItems.push({
        key,
        name: filename,
        originalName: file.name,
        url: publicUrl,
        size,
        formattedSize: formatBytes(size),
        contentType: file.type || getContentTypeFromKey(key),
        lastModified: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      items: uploadedItems,
      item: uploadedItems[0],
      url: uploadedItems[0]?.url,
    });
  } catch (err: any) {
    console.error('Error uploading media to R2:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to upload media to storage',
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Safe Delete Media Object from Cloudflare R2
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    if (!s3Client) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare R2 storage credentials are not configured on the server.',
      }, { status: 500 });
    }

    const body = await request.json();
    const { key, url, force } = body;

    if (!key && !url) {
      return NextResponse.json({ success: false, error: 'Media key or URL is required for deletion' }, { status: 400 });
    }

    const resolvedKey = key || (url ? url.replace(/^\/api\/media\//, '') : '');
    const resolvedUrl = url || `/api/media/${resolvedKey}`;

    // Safety Dependency Check: If force is not true, verify if file is referenced
    if (!force) {
      const references = await checkMediaReferences(resolvedKey, resolvedUrl);
      if (references.length > 0) {
        return NextResponse.json({
          success: false,
          inUse: true,
          error: `This media file is actively in use by ${references.length} item(s) in your store.`,
          references,
        }, { status: 409 });
      }
    }

    // Execute Cloudflare R2 deletion
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: resolvedKey,
      })
    );

    return NextResponse.json({
      success: true,
      deletedKey: resolvedKey,
      message: 'Media deleted successfully from Cloudflare storage.',
    });
  } catch (err: any) {
    console.error('Error deleting media from R2:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to delete media from storage',
    }, { status: 500 });
  }
}
