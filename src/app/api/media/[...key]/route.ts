import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME || 'putimach-media';

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

    return new NextResponse(byteArray, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    console.error('R2 Media Proxy Error:', err?.message || err);
    return new NextResponse('Image proxy error', { status: 404 });
  }
}
