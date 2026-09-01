import { supabase } from '@/lib/supabase';

export const EMPTY_TRACKING_SETTINGS = {
  // Google
  gtm_enabled: false,
  gtm_container_id: '',
  ga4_enabled: false,
  ga4_measurement_id: '',
  ga4_api_secret: '',
  google_ads_enabled: false,
  google_ads_conversion_id: '',
  google_ads_purchase_label: '',
  google_ads_cart_label: '',
  google_ads_begin_checkout_label: '',

  // Meta
  meta_enabled: true,
  meta_pixel_id: '',
  meta_capi_enabled: true,
  meta_capi_token: '',
  meta_capi_test_code: '',

  // TikTok
  tiktok_enabled: false,
  tiktok_pixel_id: '',
  tiktok_events_api_enabled: false,
  tiktok_access_token: '',
  tiktok_test_code: '',

  // General
  ecommerce_tracking_enabled: true,
  debug_mode: false,
  consent_mode_enabled: false,
  advanced_matching_enabled: true,
};

export async function getTrackingSettings(client = supabase) {
  let loadedData: any = null;

  // 1. Try site_settings (id = 'tracking_config')
  try {
    const { data: ssData, error: ssErr } = await client
      .from('site_settings')
      .select('data')
      .eq('id', 'tracking_config')
      .maybeSingle();

    if (!ssErr && ssData?.data) {
      loadedData = ssData.data;
    }
  } catch (_) {}

  // 2. Try cb_settings (id = 'tracking_config')
  if (!loadedData) {
    try {
      const { data: cbData, error: cbErr } = await client
        .from('cb_settings')
        .select('data')
        .eq('id', 'tracking_config')
        .maybeSingle();

      if (!cbErr && cbData?.data) {
        loadedData = cbData.data;
      }
    } catch (_) {}
  }

  // 3. Try tracking_settings table
  if (!loadedData) {
    try {
      const { data: tsData, error: tsErr } = await client
        .from('tracking_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!tsErr && tsData) {
        loadedData = tsData;
      }
    } catch (_) {}
  }

  if (loadedData) {
    return {
      ...EMPTY_TRACKING_SETTINGS,
      ...loadedData,
      // Map legacy field aliases if present
      gtm_container_id: loadedData.gtm_container_id || loadedData.gtm_id || '',
      gtm_enabled: loadedData.gtm_enabled !== undefined ? Boolean(loadedData.gtm_enabled) : Boolean(loadedData.gtm_id),
      ga4_measurement_id: loadedData.ga4_measurement_id || loadedData.ga4_id || '',
      ga4_enabled: loadedData.ga4_enabled !== undefined ? Boolean(loadedData.ga4_enabled) : Boolean(loadedData.ga4_id),
      meta_pixel_id: loadedData.meta_pixel_id || loadedData.pixel_id || '',
      meta_capi_token: loadedData.meta_capi_token || loadedData.capi_token || '',
      meta_capi_test_code: loadedData.meta_capi_test_code || loadedData.capi_test_code || '',
    };
  }

  return { ...EMPTY_TRACKING_SETTINGS };
}

export async function saveTrackingSettings(client = supabase, settingsData: any) {
  const payload = {
    ...EMPTY_TRACKING_SETTINGS,
    ...settingsData,
    updated_at: new Date().toISOString()
  };

  let saved = false;
  let lastError: any = null;

  // 1. Primary: Save to site_settings (Standard settings table across system)
  try {
    const { error: ssErr } = await client
      .from('site_settings')
      .upsert({ id: 'tracking_config', data: payload, created_at: new Date().toISOString() }, { onConflict: 'id' });

    if (!ssErr) {
      saved = true;
    } else {
      lastError = ssErr;
    }
  } catch (e) {
    lastError = e;
  }

  // 2. Sync to cb_settings
  try {
    await client
      .from('cb_settings')
      .upsert({ id: 'tracking_config', data: payload, created_at: new Date().toISOString() }, { onConflict: 'id' });
    saved = true;
  } catch (_) {}

  // 3. Sync to tracking_settings table if it exists in schema
  try {
    const { error: tsErr } = await client
      .from('tracking_settings')
      .upsert({ id: 'default', ...payload }, { onConflict: 'id' });
    if (!tsErr) saved = true;
  } catch (_) {}

  if (!saved && lastError) {
    throw new Error(lastError.message || 'Failed to save tracking settings');
  }

  return payload;
}
