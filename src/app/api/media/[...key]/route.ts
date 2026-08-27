import { NextResponse } from 'next/server';
import https from 'https';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

export const dynamic = 'force-dynamic';

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME || 'putimach-media';

// High-performance persistent HTTPS Agent with connection pooling
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 30,
  timeout: 30000,
  keepAliveMsecs: 60000,
});

let s3Client: S3Client | null = null;
if (ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
    requestHandler: new NodeHttpHandler({
      httpsAgent,
    }),
  });
}

// ── In-Memory LRU Media Cache (Up to 100MB hot images) ───────────────────────
interface CachedMedia {
  buffer: Uint8Array;
  contentType: string;
  etag: string;
  lastModified: string;
  size: number;
  cachedAt: number;
}

const MAX_CACHE_BYTES = 100 * 1024 * 1024; // 100 MB
const mediaCache = new Map<string, CachedMedia>();
let currentCacheBytes = 0;

function pruneCacheIfNeeded(newBytes: number) {
  while (currentCacheBytes + newBytes > MAX_CACHE_BYTES && mediaCache.size > 0) {
    const oldestKey = mediaCache.keys().next().value;
    if (!oldestKey) break;
    const item = mediaCache.get(oldestKey);
    if (item) {
      currentCacheBytes -= item.size;
      mediaCache.delete(oldestKey);
    }
  }
}

export async function GET(
  request: Request,
  props: { params: Promise<{ key: string[] }> }
) {
  try {
    const params = await props.params;
    const keyPath = params.key ? params.key.join('/') : '';

    if (!keyPath || !s3Client) {
      return new NextResponse('Image not found or storage unconfigured', { status: 404 });
    }

    const ifNoneMatch = request.headers.get('if-none-match');

    // 1. Check in-memory LRU cache
    if (mediaCache.has(keyPath)) {
      const cached = mediaCache.get(keyPath)!;

      // Re-insert to refresh LRU position
      mediaCache.delete(keyPath);
      mediaCache.set(keyPath, cached);

      // Check HTTP 304 Not Modified
      if (ifNoneMatch && (ifNoneMatch === cached.etag || ifNoneMatch === `W/${cached.etag}`)) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            'ETag': cached.etag,
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
          },
        });
      }

      return new NextResponse(cached.buffer, {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          'Content-Length': String(cached.size),
          'ETag': cached.etag,
          'Last-Modified': cached.lastModified,
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
          'X-Media-Cache': 'HIT-MEMORY',
        },
      });
    }

    // 2. Fetch from Cloudflare R2 S3 API
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: keyPath,
    });

    const s3Response = await s3Client.send(command);
    if (!s3Response.Body) {
      return new NextResponse('Object empty', { status: 404 });
    }

    const byteArray = await s3Response.Body.transformToByteArray();
    const contentType = s3Response.ContentType || 'image/webp';
    const etag = s3Response.ETag || `"${keyPath}-${byteArray.length}"`;
    const lastModified = s3Response.LastModified ? s3Response.LastModified.toUTCString() : new Date().toUTCString();
    const size = byteArray.length;

    // Check HTTP 304 Not Modified
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
        },
      });
    }

    // Cache in memory for instant subsequent loads (<1ms)
    pruneCacheIfNeeded(size);
    mediaCache.set(keyPath, {
      buffer: byteArray,
      contentType,
      etag,
      lastModified,
      size,
      cachedAt: Date.now(),
    });
    currentCacheBytes += size;

    return new NextResponse(byteArray, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(size),
        'ETag': etag,
        'Last-Modified': lastModified,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
        'X-Media-Cache': 'MISS-ORIGIN',
      },
    });
  } catch (err: any) {
    console.error('R2 Media Proxy Error:', err?.message || err);
    return new NextResponse('Image proxy error', { status: 404 });
  }
}
