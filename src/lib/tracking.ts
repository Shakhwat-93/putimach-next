'use client';
// @ts-nocheck
// src/lib/tracking.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified Tracking Module — Meta Pixel + CAPI + GA4 DataLayer
//
// Architecture:
//  • GTM manages GA4 completely (no direct GA4 script → no GA4 duplicates)
//  • Meta Pixel fires client-side (browser)
//  • Meta CAPI fires from browser directly (Option B — no edge function needed)
//  • Deduplication via shared eventID between Pixel + CAPI
// ─────────────────────────────────────────────────────────────────────────────

const CAPI_VERSION = 'v20.0';
const GRAPH_URL = `https://graph.facebook.com/${CAPI_VERSION}`;

// ── Settings cache (loaded once from Supabase on app init) ──────────────────
let _config = null;

/**
 * Load tracking config from site_settings table.
 * Called once from App.jsx. Cached for the session.
 */
import { supabase } from './supabase';

export async function loadTrackingConfig(customSupabase = null) {
  try {
    const sb = customSupabase || supabase;
    let configData = null;

    const siteSettingsRes = await sb
      .from('site_settings')
      .select('data')
      .eq('id', 'tracking_config')
      .maybeSingle();

    if (siteSettingsRes.data?.data) {
      configData = siteSettingsRes.data.data;
    } else {
      const cbSettingsRes = await sb
        .from('cb_settings')
        .select('data')
        .eq('id', 'tracking_config')
        .maybeSingle();
      configData = cbSettingsRes.data?.data;
    }

    _config = configData || {};

    if (_config.tracking_enabled !== false) {
      if (_config.gtm_id) {
        injectGTM(_config.gtm_id);
      }
      if (_config.pixel_id) {
        injectMetaPixel(_config.pixel_id);
      }
    }
  } catch (e) {
    console.warn('[Tracking] Could not load config:', e);
    _config = {};
  }
  return _config;
}

export function getTrackingConfig() {
  return _config || {};
}

export function isTrackingEnabled() {
  const cfg = getTrackingConfig();
  return cfg.tracking_enabled !== false && (cfg.pixel_id || cfg.gtm_id || cfg.ga4_id);
}

// ── GTM Injection ────────────────────────────────────────────────────────────
export function injectGTM(gtmId) {
  if (!gtmId || document.getElementById('gtm-script')) return;

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  // GTM head script
  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);

  // GTM noscript iframe (for body)
  const noscript = document.createElement('noscript');
  noscript.id = 'gtm-noscript';
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);

  console.log('[Tracking] GTM injected:', gtmId);
}

// ── Meta Pixel Injection ─────────────────────────────────────────────────────
export function injectMetaPixel(pixelId) {
  if (!pixelId || window.fbq || document.getElementById('meta-pixel-script')) return;

  // Standard Meta Pixel base code
  (function(f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.id = 'meta-pixel-script';
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  console.log('[Tracking] Meta Pixel injected:', pixelId);
}

// ── Event ID Generator ───────────────────────────────────────────────────────
function genEventId() {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

// ── Hashing for CAPI user data (SHA-256) ────────────────────────────────────
async function sha256(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

// ── Currency / value helpers ─────────────────────────────────────────────────
const toNum = (v) => Math.round(Number(v) * 100) / 100;

// ── GA4 DataLayer push ───────────────────────────────────────────────────────
function pushDataLayer(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// ── Meta Pixel client-side fire ──────────────────────────────────────────────
function firePixel(eventName, data = {}, eventId = null) {
  if (!window.fbq) return;
  const options = eventId ? { eventID: eventId } : {};
  window.fbq('track', eventName, data, options);
}

// ── Meta CAPI (direct browser call) ─────────────────────────────────────────
async function fireCAPI(eventName, eventId, customData = {}, userData = {}) {
  const cfg = getTrackingConfig();
  if (!cfg.pixel_id || !cfg.capi_token) return;

  try {
    const hashedPhone = await sha256(userData.phone);
    const hashedEmail = await sha256(userData.email);

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: window.location.href,
        action_source: 'website',
        user_data: {
          ...(hashedPhone && { ph: [hashedPhone] }),
          ...(hashedEmail && { em: [hashedEmail] }),
          client_ip_address: null, // browser can't get real IP for CAPI; server-side would
          client_user_agent: navigator.userAgent,
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc') || getFbcFromUrl(),
        },
        custom_data: {
          ...customData,
          currency: 'BDT',
        },
      }],
      ...(cfg.capi_test_code && { test_event_code: cfg.capi_test_code }),
    };

    const res = await fetch(`${GRAPH_URL}/${cfg.pixel_id}/events?access_token=${cfg.capi_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.warn('[Tracking] CAPI error:', err);
    } else {
      console.log(`[Tracking] CAPI ${eventName} sent (eventID: ${eventId})`);
    }
  } catch (e) {
    console.warn('[Tracking] CAPI request failed:', e);
  }
}

// ── Cookie helpers ───────────────────────────────────────────────────────────
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getFbcFromUrl() {
  const fbclid = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('fbclid');
  if (!fbclid) return null;
  return `fb.1.${Date.now()}.${fbclid}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — Call these from your pages/components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PageView — called on every route change
 * GTM fires this automatically; no manual fire needed for GA4.
 * Only fire Pixel PageView manually if GTM is NOT configured.
 */
export function trackPageView() {
  if (!isTrackingEnabled()) return;
  const cfg = getTrackingConfig();

  // GA4 via GTM — GTM handles pageview automatically via "All Pages" trigger
  pushDataLayer('page_view', { page_path: window.location.pathname });

  // Meta Pixel PageView — only direct fire if Pixel set but no GTM
  if (cfg.pixel_id && !cfg.gtm_id) {
    firePixel('PageView');
  }
  // If GTM is configured, PageView Pixel tag should be in GTM
}

/**
 * ViewContent — product detail page
 * @param {object} product - { id, name, price, category, image }
 */
export function trackViewContent(product) {
  if (!isTrackingEnabled() || !product) return;
  const eventId = genEventId();

  // GA4 via GTM
  pushDataLayer('view_item', {
    ecommerce: {
      currency: 'BDT',
      value: toNum(product.price),
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        item_category: product.category || '',
        price: toNum(product.price),
        quantity: 1,
      }],
    },
    event_id: eventId,
  });

  // Meta Pixel
  firePixel('ViewContent', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: toNum(product.price),
    currency: 'BDT',
  }, eventId);

  // CAPI
  fireCAPI('ViewContent', eventId, {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: toNum(product.price),
  });
}

/**
 * AddToCart
 * @param {object} product - { id, name, price, category }
 * @param {number} quantity
 * @param {string} size
 */
export function trackAddToCart(product, quantity = 1, size = '') {
  if (!isTrackingEnabled() || !product) return;
  const eventId = genEventId();
  const value = toNum(product.price * quantity);

  // GA4 via GTM
  pushDataLayer('add_to_cart', {
    ecommerce: {
      currency: 'BDT',
      value,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        item_category: product.category || '',
        item_variant: size,
        price: toNum(product.price),
        quantity,
      }],
    },
    event_id: eventId,
  });

  // Meta Pixel
  firePixel('AddToCart', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value,
    currency: 'BDT',
    num_items: quantity,
  }, eventId);

  // CAPI
  fireCAPI('AddToCart', eventId, {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value,
    num_items: quantity,
  });
}

/**
 * InitiateCheckout
 * @param {Array} items - cart items
 * @param {number} total
 */
export function trackInitiateCheckout(items = [], total = 0) {
  if (!isTrackingEnabled()) return;
  const eventId = genEventId();
  const contentIds = items.map(i => String(i.product?.id));
  const numItems = items.reduce((s, i) => s + i.quantity, 0);

  // GA4 via GTM
  pushDataLayer('begin_checkout', {
    ecommerce: {
      currency: 'BDT',
      value: toNum(total),
      items: items.map(i => ({
        item_id: String(i.product?.id),
        item_name: i.product?.name,
        price: toNum(i.product?.price),
        quantity: i.quantity,
        item_variant: i.size,
      })),
    },
    event_id: eventId,
  });

  // Meta Pixel
  firePixel('InitiateCheckout', {
    content_ids: contentIds,
    content_type: 'product',
    value: toNum(total),
    currency: 'BDT',
    num_items: numItems,
  }, eventId);

  // CAPI
  fireCAPI('InitiateCheckout', eventId, {
    content_ids: contentIds,
    content_type: 'product',
    value: toNum(total),
    num_items: numItems,
  });
}

/**
 * Purchase — most important event, fired after successful order insert
 * @param {object} order - { id, amount, customer_name, phone, email, ordered_items }
 * @param {object} userData - { phone, email } for CAPI hashing
 */
export function trackPurchase(order, userData = {}) {
  if (!isTrackingEnabled() || !order) return;
  const eventId = genEventId();
  const items = Array.isArray(order.ordered_items) ? order.ordered_items : [];
  const value = toNum(order.amount);
  const contentIds = items.map(i => String(i.id));
  const numItems = items.reduce((s, i) => s + (i.quantity || 1), 0);

  // GA4 via GTM
  pushDataLayer('purchase', {
    ecommerce: {
      transaction_id: String(order.id),
      currency: 'BDT',
      value,
      shipping: toNum(order.shipping_fee || 0),
      items: items.map(i => ({
        item_id: String(i.id),
        item_name: i.name,
        price: toNum(i.price),
        quantity: i.quantity || 1,
        item_variant: i.size,
      })),
    },
    event_id: eventId,
  });

  // Meta Pixel
  firePixel('Purchase', {
    content_ids: contentIds,
    content_type: 'product',
    value,
    currency: 'BDT',
    num_items: numItems,
    order_id: String(order.id),
  }, eventId);

  // CAPI (with user data hashing for better signal)
  fireCAPI('Purchase', eventId, {
    content_ids: contentIds,
    content_type: 'product',
    value,
    num_items: numItems,
    order_id: String(order.id),
  }, {
    phone: userData.phone,
    email: userData.email,
  });

  console.log('[Tracking] Purchase event fired:', { orderId: order.id, value, eventId });
}

/**
 * Search
 * @param {string} query
 */
export function trackSearch(query) {
  if (!isTrackingEnabled() || !query) return;
  const eventId = genEventId();

  // GA4 via GTM
  pushDataLayer('search', {
    search_term: query,
    event_id: eventId,
  });

  // Meta Pixel
  firePixel('Search', {
    search_string: query,
    content_type: 'product',
  }, eventId);
}
