import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTrackingSettings } from '@/lib/trackingSettingsDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public Client-Safe Tracking Configuration Endpoint
 * Explicitly strips all server-side secrets, access tokens, and private API keys.
 */
export async function GET() {
  try {
    const raw = await getTrackingSettings(supabase);

    // Build strictly sanitized public payload
    const publicConfig = {
      // Google Tag Manager
      gtm_enabled: Boolean(raw.gtm_enabled),
      gtm_container_id: raw.gtm_container_id ? String(raw.gtm_container_id).trim() : '',

      // Google Analytics 4
      ga4_enabled: Boolean(raw.ga4_enabled),
      ga4_measurement_id: raw.ga4_measurement_id ? String(raw.ga4_measurement_id).trim() : '',

      // Google Ads
      google_ads_enabled: Boolean(raw.google_ads_enabled),
      google_ads_conversion_id: raw.google_ads_conversion_id ? String(raw.google_ads_conversion_id).trim() : '',
      google_ads_purchase_label: raw.google_ads_purchase_label ? String(raw.google_ads_purchase_label).trim() : '',
      google_ads_cart_label: raw.google_ads_cart_label ? String(raw.google_ads_cart_label).trim() : '',
      google_ads_begin_checkout_label: raw.google_ads_begin_checkout_label ? String(raw.google_ads_begin_checkout_label).trim() : '',

      // Meta Pixel
      meta_enabled: Boolean(raw.meta_enabled),
      meta_pixel_id: raw.meta_pixel_id ? String(raw.meta_pixel_id).trim() : '',
      meta_capi_enabled: Boolean(raw.meta_capi_enabled),

      // TikTok Pixel
      tiktok_enabled: Boolean(raw.tiktok_enabled),
      tiktok_pixel_id: raw.tiktok_pixel_id ? String(raw.tiktok_pixel_id).trim() : '',
      tiktok_events_api_enabled: Boolean(raw.tiktok_events_api_enabled),

      // General Flags
      ecommerce_tracking_enabled: raw.ecommerce_tracking_enabled !== false,
      debug_mode: Boolean(raw.debug_mode),
      consent_mode_enabled: Boolean(raw.consent_mode_enabled),
      advanced_matching_enabled: raw.advanced_matching_enabled !== false,
    };

    return NextResponse.json({ success: true, config: publicConfig });
  } catch (err: any) {
    console.error('[Tracking Config API Exception]:', err);
    return NextResponse.json({ success: false, config: {} }, { status: 200 });
  }
}
