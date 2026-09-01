import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTrackingSettings } from '@/lib/trackingSettingsDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cfg = await getTrackingSettings(supabase);
    const report: Record<string, any> = {};

    // 1. Validate GTM
    if (cfg.gtm_enabled) {
      const gtmId = String(cfg.gtm_container_id || '').trim();
      const valid = /^GTM-[A-Z0-9]+$/i.test(gtmId);
      report.gtm = {
        enabled: true,
        configured: Boolean(gtmId),
        validFormat: valid,
        status: valid ? 'valid' : 'invalid_format',
        message: valid ? 'GTM Container ID format is valid' : 'Invalid GTM ID format (expected GTM-XXXXXX)',
      };
    } else {
      report.gtm = { enabled: false, status: 'disabled' };
    }

    // 2. Validate GA4
    if (cfg.ga4_enabled) {
      const ga4Id = String(cfg.ga4_measurement_id || '').trim();
      const valid = /^G-[A-Z0-9]+$/i.test(ga4Id);
      report.ga4 = {
        enabled: true,
        configured: Boolean(ga4Id),
        validFormat: valid,
        status: valid ? 'valid' : 'invalid_format',
        message: valid ? 'GA4 Measurement ID format is valid' : 'Invalid GA4 ID format (expected G-XXXXXXXXXX)',
      };
    } else {
      report.ga4 = { enabled: false, status: 'disabled' };
    }

    // 3. Test Meta Pixel & CAPI
    if (cfg.meta_enabled) {
      const pixelId = String(cfg.meta_pixel_id || '').trim();
      const isPixelValid = /^[0-9]{10,20}$/.test(pixelId);

      report.metaPixel = {
        enabled: true,
        configured: Boolean(pixelId),
        validFormat: isPixelValid,
        status: isPixelValid ? 'valid' : 'invalid_format',
      };

      if (cfg.meta_capi_enabled) {
        if (!cfg.meta_capi_token) {
          report.metaCapi = { enabled: true, status: 'missing_token', message: 'CAPI enabled but Access Token is missing' };
        } else {
          try {
            // Test Ping using Graph API debug/test event
            const testPayload = {
              data: [{
                event_name: 'TestEvent',
                event_time: Math.floor(Date.now() / 1000),
                event_id: `test_${Date.now()}`,
                action_source: 'website',
                user_data: { client_user_agent: 'PutiMach-Test-Diagnostic/1.0' },
                custom_data: { currency: 'BDT', value: 0 },
              }],
              ...(cfg.meta_capi_test_code && { test_event_code: cfg.meta_capi_test_code }),
            };

            const metaRes = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${cfg.meta_capi_token}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testPayload),
            });

            const metaData = await metaRes.json();
            if (metaRes.ok) {
              report.metaCapi = {
                enabled: true,
                status: 'connected',
                message: 'Meta CAPI connected successfully! Test event acknowledged.',
                events_received: metaData.events_received || 1,
              };
            } else {
              report.metaCapi = {
                enabled: true,
                status: 'api_error',
                message: metaData?.error?.message || 'Meta API returned an error',
                error_type: metaData?.error?.type,
              };
            }
          } catch (mErr: any) {
            report.metaCapi = { enabled: true, status: 'network_error', message: mErr.message };
          }
        }
      } else {
        report.metaCapi = { enabled: false, status: 'disabled' };
      }
    } else {
      report.metaPixel = { enabled: false, status: 'disabled' };
      report.metaCapi = { enabled: false, status: 'disabled' };
    }

    // 4. Test TikTok Pixel & Events API
    if (cfg.tiktok_enabled) {
      const ttPixelId = String(cfg.tiktok_pixel_id || '').trim();
      report.tiktokPixel = {
        enabled: true,
        configured: Boolean(ttPixelId),
        status: ttPixelId ? 'valid' : 'missing_id',
      };

      if (cfg.tiktok_events_api_enabled) {
        if (!cfg.tiktok_access_token) {
          report.tiktokEventsApi = { enabled: true, status: 'missing_token', message: 'TikTok Events API enabled but Access Token is missing' };
        } else {
          try {
            const ttPayload = {
              event_source: 'web',
              event_source_id: ttPixelId,
              data: [{
                event: 'TestEvent',
                event_time: Math.floor(Date.now() / 1000),
                event_id: `test_tt_${Date.now()}`,
                user: { user_agent: 'PutiMach-Test-Diagnostic/1.0' },
                properties: { currency: 'BDT', value: 0 },
              }],
              ...(cfg.tiktok_test_code && { test_event_code: cfg.tiktok_test_code }),
            };

            const ttRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Access-Token': cfg.tiktok_access_token,
              },
              body: JSON.stringify(ttPayload),
            });

            const ttData = await ttRes.json();
            if (ttRes.ok && ttData.code === 0) {
              report.tiktokEventsApi = {
                enabled: true,
                status: 'connected',
                message: 'TikTok Events API connected successfully!',
              };
            } else {
              report.tiktokEventsApi = {
                enabled: true,
                status: 'api_error',
                message: ttData?.message || 'TikTok API returned an error',
              };
            }
          } catch (ttErr: any) {
            report.tiktokEventsApi = { enabled: true, status: 'network_error', message: ttErr.message };
          }
        }
      } else {
        report.tiktokEventsApi = { enabled: false, status: 'disabled' };
      }
    } else {
      report.tiktokPixel = { enabled: false, status: 'disabled' };
      report.tiktokEventsApi = { enabled: false, status: 'disabled' };
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
