import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ActiveVisitor {
  id: string;
  page: string;
  device: 'Mobile' | 'Desktop';
  lastSeen: number;
  ip?: string;
}

// Global server memory store for active visitors
declare global {
  var __ACTIVE_VISITORS__: Map<string, ActiveVisitor> | undefined;
}

if (!globalThis.__ACTIVE_VISITORS__) {
  globalThis.__ACTIVE_VISITORS__ = new Map<string, ActiveVisitor>();
}

const activeVisitors = globalThis.__ACTIVE_VISITORS__;
const VISITOR_EXPIRY_MS = 45 * 1000; // 45 seconds timeout

function pruneStaleVisitors() {
  const now = Date.now();
  for (const [id, visitor] of activeVisitors.entries()) {
    if (now - visitor.lastSeen > VISITOR_EXPIRY_MS) {
      activeVisitors.delete(id);
    }
  }
}

// GET: Query live visitor stats (for Admin dashboard / navbar)
export async function GET() {
  pruneStaleVisitors();

  const details: ActiveVisitor[] = [];
  const pages: Record<string, number> = {};
  let mobile = 0;
  let desktop = 0;

  for (const visitor of activeVisitors.values()) {
    details.push(visitor);
    const pg = visitor.page || '/';
    pages[pg] = (pages[pg] || 0) + 1;
    if (visitor.device === 'Mobile') mobile++;
    else desktop++;
  }

  return NextResponse.json({
    success: true,
    count: details.length,
    mobile,
    desktop,
    pages,
    details,
    timestamp: Date.now()
  });
}

// POST: Storefront heartbeat ping
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { visitorId, page, device } = body;

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid visitor ID' }, { status: 400 });
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    activeVisitors.set(visitorId, {
      id: visitorId,
      page: (page && typeof page === 'string') ? page : '/',
      device: device === 'Mobile' ? 'Mobile' : 'Desktop',
      lastSeen: Date.now(),
      ip: clientIp
    });

    pruneStaleVisitors();

    return NextResponse.json({
      success: true,
      count: activeVisitors.size
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Heartbeat error' }, { status: 500 });
  }
}