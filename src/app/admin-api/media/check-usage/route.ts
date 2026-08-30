import { NextResponse } from 'next/server';
import { checkMediaReferences } from '../route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, url } = body;

    if (!key && !url) {
      return NextResponse.json({ success: false, error: 'Key or URL is required' }, { status: 400 });
    }

    const resolvedKey = key || (url ? url.replace(/^\/api\/media\//, '') : '');
    const resolvedUrl = url || `/api/media/${resolvedKey}`;

    const references = await checkMediaReferences(resolvedKey, resolvedUrl);

    return NextResponse.json({
      success: true,
      inUse: references.length > 0,
      count: references.length,
      references,
    });
  } catch (err: any) {
    console.error('Error checking media usage:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Check usage failed' }, { status: 500 });
  }
}
