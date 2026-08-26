import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function sha256(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Server-Side Conversion API Router
 * Dispatches events to Meta CAPI and TikTok Events API securely with SHA-256 hashed user data.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventName,
      eventId,
      orderId,
      sourceUrl,
      userData = {},
      customData = {}
    } = body;

    if (!eventName || !eventId) {
      return NextResponse.json({ success: false, error: 'Missing eventName or eventId' }, { status: 400 });
    }

    // 1. Fetch server-side tracking settings
    const { data: settingsRow } = await supabase
      .from('tracking_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const cfg = settingsRow || {};
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

    const results: Record<string, any> = {};

    // ── 2. Meta Conversions API (CAPI) ──
    if (cfg.meta_enabled && cfg.meta_capi_enabled && cfg.meta_pixel_id && cfg.meta_capi_token) {
      try {
        // Idempotency check for Purchase
        let shouldSendMeta = true;
        if (eventName === 'Purchase' && orderId) {
          const { data: existingEvent } = await supabase
            .from('conversion_events')
            .select('id')
            .eq('order_id', String(orderId))
            .eq('provider', 'meta_capi')
            .eq('status', 'success')
            .maybeSingle();

          if (existingEvent) {
            shouldSendMeta = false;
            results.meta = { status: 'skipped_duplicate', eventId };
          }
        }

        if (shouldSendMeta) {
          const hashedPhone = sha256(userData.phone);
          const hashedEmail = sha256(userData.email);
          const hashedFirstName = sha256(userData.firstName);
          const hashedLastName = sha256(userData.lastName);
          const hashedCity = sha256(userData.city);

          const metaPayload = {
            data: [{
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              event_source_url: sourceUrl || 'https://putimach.com',
              action_source: 'website',
              user_data: {
                ...(hashedPhone && { ph: [hashedPhone] }),
                ...(hashedEmail && { em: [hashedEmail] }),
                ...(hashedFirstName && { fn: [hashedFirstName] }),
                ...(hashedLastName && { ln: [hashedLastName] }),
                ...(hashedCity && { ct: [hashedCity] }),
                client_ip_address: clientIp || undefined,
                client_user_agent: userAgent || undefined,
                fbp: userData.fbp || undefined,
                fbc: userData.fbc || undefined,
              },
              custom_data: {
                ...customData,
                currency: customData.currency || 'BDT',
              },
            }],
            ...(cfg.meta_capi_test_code && { test_event_code: cfg.meta_capi_test_code }),
          };

          const metaRes = await fetch(
            `https://graph.facebook.com/v20.0/${cfg.meta_pixel_id}/events?access_token=${cfg.meta_capi_token}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(metaPayload),
            }
          );

          const metaData = await metaRes.json();

          // Log to conversion_events
          await supabase.from('conversion_events').insert([{
            order_id: orderId ? String(orderId) : null,
            transaction_id: orderId ? String(orderId) : null,
            provider: 'meta_capi',
            event_name: eventName,
            event_id: eventId,
            status: metaRes.ok ? 'success' : 'failed',
            payload: metaPayload,
            error_message: metaRes.ok ? null : JSON.stringify(metaData),
            sent_at: new Date().toISOString(),
          }]);

          results.meta = { success: metaRes.ok, response: metaData };
        }
      } catch (metaErr: any) {
        console.warn('[Meta CAPI Dispatch Error]:', metaErr);
        results.meta = { success: false, error: metaErr.message };
      }
    }

    // ── 3. TikTok Events API ──
    if (cfg.tiktok_enabled && cfg.tiktok_events_api_enabled && cfg.tiktok_pixel_id && cfg.tiktok_access_token) {
      try {
        let shouldSendTikTok = true;
        if (eventName === 'Purchase' && orderId) {
          const { data: existingEvent } = await supabase
            .from('conversion_events')
            .select('id')
            .eq('order_id', String(orderId))
            .eq('provider', 'tiktok_events_api')
            .eq('status', 'success')
            .maybeSingle();

          if (existingEvent) {
            shouldSendTikTok = false;
            results.tiktok = { status: 'skipped_duplicate', eventId };
          }
        }

        if (shouldSendTikTok) {
          const hashedPhone = sha256(userData.phone);
          const hashedEmail = sha256(userData.email);

          // Map event name to TikTok standard if needed
          const tikTokEventName = eventName === 'InitiateCheckout' ? 'InitiateCheckout' :
            eventName === 'AddToCart' ? 'AddToCart' :
            eventName === 'ViewContent' ? 'ViewContent' :
            eventName === 'Purchase' ? 'CompletePayment' : eventName;

          const tikTokPayload = {
            event_source: 'web',
            event_source_id: cfg.tiktok_pixel_id,
            data: [{
              event: tikTokEventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              user: {
                ...(hashedPhone && { phone: hashedPhone }),
                ...(hashedEmail && { email: hashedEmail }),
                ip: clientIp || undefined,
                user_agent: userAgent || undefined,
                ttclid: userData.ttclid || undefined,
              },
              properties: {
                currency: customData.currency || 'BDT',
                value: customData.value || 0,
                contents: Array.isArray(customData.contents) ? customData.contents.map((c: any) => ({
                  content_id: String(c.id || c.content_id),
                  content_name: c.name || c.content_name,
                  price: c.price || c.item_price,
                  quantity: c.quantity || 1,
                })) : [],
              },
            }],
            ...(cfg.tiktok_test_code && { test_event_code: cfg.tiktok_test_code }),
          };

          const tikTokRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Access-Token': cfg.tiktok_access_token,
            },
            body: JSON.stringify(tikTokPayload),
          });

          const tikTokData = await tikTokRes.json();

          // Log to conversion_events
          await supabase.from('conversion_events').insert([{
            order_id: orderId ? String(orderId) : null,
            transaction_id: orderId ? String(orderId) : null,
            provider: 'tiktok_events_api',
            event_name: eventName,
            event_id: eventId,
            status: tikTokRes.ok && tikTokData.code === 0 ? 'success' : 'failed',
            payload: tikTokPayload,
            error_message: tikTokRes.ok && tikTokData.code === 0 ? null : JSON.stringify(tikTokData),
            sent_at: new Date().toISOString(),
          }]);

          results.tiktok = { success: tikTokRes.ok, response: tikTokData };
        }
      } catch (ttErr: any) {
        console.warn('[TikTok Events API Dispatch Error]:', ttErr);
        results.tiktok = { success: false, error: ttErr.message };
      }
    }

    return NextResponse.json({ success: true, eventId, results });
  } catch (err: any) {
    console.error('[Tracking Events Route Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
