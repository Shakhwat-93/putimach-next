'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Enterprise Marketing Tracking & Analytics Engine
 * GTM + GA4 + Meta Pixel + Meta CAPI + TikTok Pixel + TikTok Events API
 * 
 * Features:
 *  • Strict Single Source of Truth architecture
 *  • Exact Event ID parity between Client Browser & Server APIs (Meta & TikTok deduplication)
 *  • Deterministic Purchase Event ID based on order number (`order_<orderId>`)
 *  • Idempotent script injection & Consent Mode v2 support
 *  • React StrictMode / navigation duplicate suppression
 *  • GA4 Ecommerce dataLayer lifecycle management
 *  • Zero exposure of server access tokens to the client
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface TrackingProduct {
  id?: string | number;
  name?: string;
  price?: number | string;
  category?: string;
  category_name?: string;
  image?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

export interface TrackingCartItem {
  key?: string;
  product?: TrackingProduct;
  quantity?: number;
  size?: string;
  color?: string;
}

export interface TrackingOrderPayload {
  id?: string | number;
  order_number?: string | number;
  total?: number;
  amount?: number;
  subtotal?: number;
  shipping_fee?: number;
  delivery_charge?: number;
  discount?: number;
  phone?: string;
  email?: string;
  customer_name?: string;
  city?: string;
  ordered_items?: any[];
}

export interface TrackingUserData {
  phone?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  external_id?: string;
}

export interface TrackingConfig {
  gtm_enabled?: boolean;
  gtm_container_id?: string;
  ga4_enabled?: boolean;
  ga4_measurement_id?: string;
  google_ads_enabled?: boolean;
  google_ads_conversion_id?: string;
  meta_enabled?: boolean;
  meta_pixel_id?: string;
  meta_capi_enabled?: boolean;
  tiktok_enabled?: boolean;
  tiktok_pixel_id?: string;
  tiktok_events_api_enabled?: boolean;
  ecommerce_tracking_enabled?: boolean;
  debug_mode?: boolean;
  consent_mode_enabled?: boolean;
  advanced_matching_enabled?: boolean;
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

let _config: TrackingConfig | null = null;
let _initPromise: Promise<TrackingConfig> | null = null;
let _lastPageViewPath = '';

// In-memory deduplication cache for preventing rapid duplicate triggers (e.g. React StrictMode / multi-clicks)
const _recentEvents = new Map<string, number>();

function isDuplicateEvent(cacheKey: string, windowMs = 2500): boolean {
  const now = Date.now();
  const lastTime = _recentEvents.get(cacheKey) || 0;
  if (now - lastTime < windowMs) {
    return true;
  }
  _recentEvents.set(cacheKey, now);

  // Periodic cleanup if cache grows
  if (_recentEvents.size > 200) {
    for (const [k, t] of _recentEvents.entries()) {
      if (now - t > 30000) _recentEvents.delete(k);
    }
  }
  return false;
}

/**
 * Fetch client-safe tracking configuration from /api/tracking/config
 */
export async function loadTrackingConfig(): Promise<TrackingConfig> {
  if (_config) return _config;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const res = await fetch('/api/tracking/config', { cache: 'no-store' });
      const json = await res.json();
      _config = (json?.config as TrackingConfig) || {};

      if (_config.ecommerce_tracking_enabled !== false) {
        // Initialize Google Consent Mode v2 if enabled
        if (_config.consent_mode_enabled) {
          initConsentMode();
        }

        // 1. Google Tag Manager
        if (_config.gtm_enabled && _config.gtm_container_id) {
          injectGTM(_config.gtm_container_id);
        }

        // 2. Direct GA4 (Only when GTM is NOT managing Google tags)
        if (_config.ga4_enabled && _config.ga4_measurement_id && !_config.gtm_enabled) {
          injectDirectGA4(_config.ga4_measurement_id);
        }

        // 3. Meta Pixel
        if (_config.meta_enabled && _config.meta_pixel_id) {
          injectMetaPixel(_config.meta_pixel_id);
        }

        // 4. TikTok Pixel
        if (_config.tiktok_enabled && _config.tiktok_pixel_id) {
          injectTikTokPixel(_config.tiktok_pixel_id);
        }
      }

      if (_config.debug_mode) {
        console.log('[Tracking Engine] Initialized with config:', {
          gtm: _config.gtm_enabled ? _config.gtm_container_id : 'Disabled',
          ga4: _config.ga4_enabled ? _config.ga4_measurement_id : 'Disabled',
          meta: _config.meta_enabled ? _config.meta_pixel_id : 'Disabled',
          tiktok: _config.tiktok_enabled ? _config.tiktok_pixel_id : 'Disabled',
          capi: _config.meta_capi_enabled,
          tiktok_events_api: _config.tiktok_events_api_enabled,
        });
      }
    } catch (e) {
      console.warn('[Tracking Engine] Failed to load tracking config:', e);
      _config = {};
    }
    return _config;
  })();

  return _initPromise;
}

export function getTrackingConfig(): TrackingConfig {
  return _config || {};
}

export function isTrackingEnabled(): boolean {
  const cfg = getTrackingConfig();
  return cfg.ecommerce_tracking_enabled !== false;
}

// ── Google Consent Mode v2 ────────────────────────────────────────────────────
function initConsentMode() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) { window.dataLayer?.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
}

// ── 1. GTM Injection ──────────────────────────────────────────────────────────
export function injectGTM(gtmId: string) {
  if (!gtmId || typeof window === 'undefined' || document.getElementById('gtm-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.id = 'gtm-noscript';
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
}

// ── 2. Direct GA4 Injection (Used only when GTM is not enabled) ───────────────
export function injectDirectGA4(measurementId: string) {
  if (!measurementId || typeof window === 'undefined' || document.getElementById('ga4-script')) return;

  const script = document.createElement('script');
  script.id = 'ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) { window.dataLayer?.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: false });
}

// ── 3. Meta Pixel Injection ──────────────────────────────────────────────────
export function injectMetaPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined' || window.fbq || document.getElementById('meta-pixel-script')) return;

  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
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
}

// ── 4. TikTok Pixel Injection ────────────────────────────────────────────────
export function injectTikTokPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined' || window.ttq || document.getElementById('tiktok-pixel-script')) return;

  (function(w: any, d: any, t: any) {
    w.TiktokAnalyticsObject = t;
    const ttq = w[t] = w[t] || [];
    ttq.methods = [
      "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"
    ];
    ttq.setAndDefer = function(t: any, e: any) {
      t[e] = function() {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function(t: any) {
      for (let e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n]);
      }
      return e;
    };
    ttq.load = function(e: any, n: any) {
      const i = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const o = document.createElement("script");
      o.id = "tiktok-pixel-script";
      o.type = "text/javascript";
      o.async = true;
      o.src = i + "?sdkid=" + e + "&lib=" + t;
      const a = document.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(pixelId);
  })(window, document, 'ttq');
}

// ── Event ID Generators (Guaranteed Parity) ──────────────────────────────────
export function generateEventId(prefix = 'evt'): string {
  try {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function generatePurchaseEventId(orderId: string | number): string {
  const cleanId = String(orderId).trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return `order_${cleanId}`;
}

export function generateCheckoutEventId(sessionId: string): string {
  const cleanId = String(sessionId).trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return `ic_${cleanId}`;
}

// ── Cookie Helpers ───────────────────────────────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getFbClickId(): string | null {
  if (typeof window === 'undefined') return null;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
}

function getTtClickId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ttclid') || null;
}

// ── DataLayer Cleanup & Push ─────────────────────────────────────────────────
function pushEcommerceDataLayer(event: string, ecommerceData: any, eventId: string) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  
  // Clear previous ecommerce state to prevent tag reuse in GA4
  window.dataLayer.push({ ecommerce: null });
  
  // Push standard GA4 ecommerce payload
  window.dataLayer.push({
    event,
    event_id: eventId,
    ecommerce: ecommerceData,
  });
}

// ── Server-side Conversion Dispatcher (Meta CAPI + TikTok Events API) ────────
async function dispatchServerConversion(params: {
  eventName: string;
  eventId: string;
  orderId?: string;
  userData?: TrackingUserData;
  customData?: any;
}) {
  const cfg = getTrackingConfig();
  if (!cfg.meta_capi_enabled && !cfg.tiktok_events_api_enabled) return;

  try {
    const fbp = getCookie('_fbp');
    const fbc = getCookie('_fbc') || getFbClickId();
    const ttclid = getTtClickId();

    const mergedUserData = {
      ...params.userData,
      fbp,
      fbc,
      ttclid,
    };

    fetch('/api/tracking/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: params.eventName,
        eventId: params.eventId,
        orderId: params.orderId,
        sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        userData: mergedUserData,
        customData: params.customData,
      }),
      keepalive: true, // Guarantees execution even during page unloads
    }).catch(err => {
      console.warn('[Tracking Engine] Server conversion API call failed:', err);
    });
  } catch (err) {
    console.warn('[Tracking Engine] Server dispatch error:', err);
  }
}

// ── Debug Event Logger ───────────────────────────────────────────────────────
function logDebugEvent(eventName: string, eventId: string, payload: any) {
  const cfg = getTrackingConfig();
  if (cfg.debug_mode) {
    console.group(`[Tracking Event: ${eventName}] (EventID: ${eventId})`);
    console.log('Payload:', payload);
    console.log('Active Providers:', {
      dataLayer: typeof window !== 'undefined' && Boolean(window.dataLayer),
      metaPixel: typeof window !== 'undefined' && Boolean(window.fbq),
      tiktokPixel: typeof window !== 'undefined' && Boolean(window.ttq),
      metaCAPI: Boolean(cfg.meta_capi_enabled),
      tiktokEventsAPI: Boolean(cfg.tiktok_events_api_enabled),
    });
    console.groupEnd();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL ECOMMERCE EVENT APIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. PageView
 * Fired on route changes and initial landing once tracking is ready.
 */
export function trackPageView() {
  if (typeof window === 'undefined' || !isTrackingEnabled()) return;
  const currentPath = window.location.pathname;

  // Prevent duplicate pageview on identical route state
  if (_lastPageViewPath === currentPath) return;
  _lastPageViewPath = currentPath;

  const eventId = generateEventId('pv');
  const cfg = getTrackingConfig();

  // DataLayer / GA4
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'page_view',
    event_id: eventId,
    page_path: currentPath,
    page_title: document.title,
  });

  // Meta Pixel (Direct browser tracking with eventID)
  if (window.fbq && cfg.meta_enabled) {
    window.fbq('track', 'PageView', {}, { eventID: eventId });
  }

  // TikTok Pixel
  if (window.ttq && cfg.tiktok_enabled) {
    window.ttq.page();
  }

  logDebugEvent('PageView', eventId, { path: currentPath });
}

/**
 * 2. ViewContent (Product Details View)
 * Deduplicated per product ID within 3000ms.
 */
export function trackViewContent(product: TrackingProduct) {
  if (!product || !isTrackingEnabled()) return;

  const productId = String(product.id || '');
  if (!productId) return;

  // Deduplicate rapid renders or StrictMode double-mount
  if (isDuplicateEvent(`vc_${productId}`, 3000)) return;

  const eventId = generateEventId('vc');
  const price = Number(product.price) || 0;
  const productName = product.name || 'Product';
  const category = product.category_name || product.category || 'General';

  // 1. GA4 / GTM DataLayer
  pushEcommerceDataLayer('view_item', {
    currency: 'BDT',
    value: price,
    items: [{
      item_id: productId,
      item_name: productName,
      item_category: category,
      price: price,
      quantity: 1,
    }],
  }, eventId);

  // 2. Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [productId],
      content_name: productName,
      content_category: category,
      content_type: 'product',
      value: price,
      currency: 'BDT',
    }, { eventID: eventId });
  }

  // 3. TikTok Pixel
  if (window.ttq) {
    window.ttq.track('ViewContent', {
      content_id: productId,
      content_name: productName,
      content_type: 'product',
      value: price,
      currency: 'BDT',
    }, { event_id: eventId });
  }

  // 4. Server-Side CAPI + Events API (Shared eventId for deduplication)
  dispatchServerConversion({
    eventName: 'ViewContent',
    eventId,
    customData: {
      currency: 'BDT',
      value: price,
      content_ids: [productId],
      content_name: productName,
      contents: [{ id: productId, name: productName, price, quantity: 1 }],
    },
  });

  logDebugEvent('ViewContent', eventId, { product });
}

/**
 * 3. Search
 */
export function trackSearch(query: string) {
  if (!query || !isTrackingEnabled()) return;
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  if (isDuplicateEvent(`search_${cleanQuery}`, 1500)) return;

  const eventId = generateEventId('search');

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'search',
    event_id: eventId,
    search_term: cleanQuery,
  });

  if (window.fbq) {
    window.fbq('track', 'Search', { search_string: cleanQuery }, { eventID: eventId });
  }

  if (window.ttq) {
    window.ttq.track('Search', { query: cleanQuery }, { event_id: eventId });
  }

  logDebugEvent('Search', eventId, { query: cleanQuery });
}

/**
 * 4. AddToCart
 * Debounces rapid accidental double-clicks (< 350ms) while preserving legitimate repeated additions.
 */
export function trackAddToCart(
  product: TrackingProduct,
  quantity = 1,
  size = '',
  color = ''
) {
  if (!product || !isTrackingEnabled()) return;

  const productId = String(product.id || '');
  if (!productId) return;

  const clickKey = `atc_${productId}_${size}_${color}`;
  if (isDuplicateEvent(clickKey, 350)) return;

  const eventId = generateEventId('atc');
  const price = Number(product.price) || 0;
  const lineValue = price * quantity;
  const productName = product.name || 'Product';
  const category = product.category_name || product.category || 'General';
  const variantStr = [color, size].filter(Boolean).join(' / ') || 'Default';

  // 1. DataLayer
  pushEcommerceDataLayer('add_to_cart', {
    currency: 'BDT',
    value: lineValue,
    items: [{
      item_id: productId,
      item_name: productName,
      item_category: category,
      item_variant: variantStr,
      price: price,
      quantity: quantity,
    }],
  }, eventId);

  // 2. Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [productId],
      content_name: productName,
      content_type: 'product',
      value: lineValue,
      currency: 'BDT',
      num_items: quantity,
    }, { eventID: eventId });
  }

  // 3. TikTok Pixel
  if (window.ttq) {
    window.ttq.track('AddToCart', {
      content_id: productId,
      content_name: productName,
      content_type: 'product',
      value: lineValue,
      currency: 'BDT',
      quantity: quantity,
    }, { event_id: eventId });
  }

  // 4. Server-Side CAPI + Events API
  dispatchServerConversion({
    eventName: 'AddToCart',
    eventId,
    customData: {
      currency: 'BDT',
      value: lineValue,
      content_ids: [productId],
      num_items: quantity,
      contents: [{ id: productId, name: productName, price, quantity }],
    },
  });

  logDebugEvent('AddToCart', eventId, { product, quantity, size, color });
}

/**
 * 5. RemoveFromCart
 */
export function trackRemoveFromCart(
  product: TrackingProduct,
  quantity = 1,
  size = '',
  color = ''
) {
  if (!product || !isTrackingEnabled()) return;
  const eventId = generateEventId('rfc');
  const price = Number(product.price) || 0;
  const lineValue = price * quantity;
  const productId = String(product.id || '');
  const productName = product.name || 'Product';
  const variantStr = [color, size].filter(Boolean).join(' / ') || 'Default';

  pushEcommerceDataLayer('remove_from_cart', {
    currency: 'BDT',
    value: lineValue,
    items: [{
      item_id: productId,
      item_name: productName,
      item_variant: variantStr,
      price: price,
      quantity: quantity,
    }],
  }, eventId);

  logDebugEvent('RemoveFromCart', eventId, { product, quantity });
}

/**
 * 6. ViewCart
 */
export function trackViewCart(items: any[] = [], total = 0) {
  if (!isTrackingEnabled() || items.length === 0) return;
  if (isDuplicateEvent('view_cart', 2000)) return;

  const eventId = generateEventId('vc_cart');

  pushEcommerceDataLayer('view_cart', {
    currency: 'BDT',
    value: Number(total) || 0,
    items: items.map(i => ({
      item_id: String(i.product?.id),
      item_name: i.product?.name,
      price: Number(i.product?.price || 0),
      quantity: i.quantity || 1,
      item_variant: [i.color, i.size].filter(Boolean).join(' / '),
    })),
  }, eventId);

  logDebugEvent('ViewCart', eventId, { items, total });
}

/**
 * 7. InitiateCheckout
 * Deduplicated per checkoutSessionId so page reloads or zone toggles don't inflate events.
 */
export function trackInitiateCheckout(
  items: any[] = [],
  total = 0,
  checkoutSessionId = ''
) {
  if (!isTrackingEnabled() || items.length === 0) return;

  const eventId = checkoutSessionId 
    ? generateCheckoutEventId(checkoutSessionId)
    : generateEventId('ic');

  // Prevent duplicate firing for the same checkout session
  if (isDuplicateEvent(`ic_${eventId}`, 3000)) return;

  const numItems = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const contentIds = items.map(i => String(i.product?.id || ''));
  const value = Number(total) || 0;

  // 1. DataLayer
  pushEcommerceDataLayer('begin_checkout', {
    currency: 'BDT',
    value,
    items: items.map(i => ({
      item_id: String(i.product?.id),
      item_name: i.product?.name,
      price: Number(i.product?.price || 0),
      quantity: i.quantity || 1,
      item_variant: [i.color, i.size].filter(Boolean).join(' / '),
    })),
  }, eventId);

  // 2. Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      content_type: 'product',
      value,
      currency: 'BDT',
      num_items: numItems,
    }, { eventID: eventId });
  }

  // 3. TikTok Pixel
  if (window.ttq) {
    window.ttq.track('InitiateCheckout', {
      contents: items.map(i => ({
        content_id: String(i.product?.id),
        content_name: i.product?.name,
        quantity: i.quantity || 1,
        price: Number(i.product?.price || 0),
      })),
      value,
      currency: 'BDT',
    }, { event_id: eventId });
  }

  // 4. Server-Side CAPI + Events API (Deterministic eventId parity)
  dispatchServerConversion({
    eventName: 'InitiateCheckout',
    eventId,
    customData: {
      currency: 'BDT',
      value,
      num_items: numItems,
      content_ids: contentIds,
      contents: items.map(i => ({
        id: String(i.product?.id),
        name: i.product?.name,
        price: Number(i.product?.price || 0),
        quantity: i.quantity || 1,
      })),
    },
  });

  logDebugEvent('InitiateCheckout', eventId, { items, total });
}

/**
 * 8. AddShippingInfo
 */
export function trackAddShippingInfo(
  items: any[] = [],
  shippingArea = '',
  fee = 0,
  total = 0
) {
  if (!isTrackingEnabled() || items.length === 0) return;
  const eventId = generateEventId('asi');

  pushEcommerceDataLayer('add_shipping_info', {
    currency: 'BDT',
    value: Number(total) || 0,
    shipping_tier: shippingArea,
    items: items.map(i => ({
      item_id: String(i.product?.id),
      item_name: i.product?.name,
      price: Number(i.product?.price || 0),
      quantity: i.quantity || 1,
    })),
  }, eventId);

  logDebugEvent('AddShippingInfo', eventId, { shippingArea, fee, total });
}

/**
 * 9. AddPaymentInfo
 */
export function trackAddPaymentInfo(
  items: any[] = [],
  paymentMethod = 'COD',
  total = 0
) {
  if (!isTrackingEnabled() || items.length === 0) return;
  const eventId = generateEventId('api');

  pushEcommerceDataLayer('add_payment_info', {
    currency: 'BDT',
    value: Number(total) || 0,
    payment_type: paymentMethod,
    items: items.map(i => ({
      item_id: String(i.product?.id),
      item_name: i.product?.name,
      price: Number(i.product?.price || 0),
      quantity: i.quantity || 1,
    })),
  }, eventId);

  if (window.fbq) {
    window.fbq('track', 'AddPaymentInfo', {
      value: Number(total) || 0,
      currency: 'BDT',
    }, { eventID: eventId });
  }

  logDebugEvent('AddPaymentInfo', eventId, { paymentMethod, total });
}

/**
 * 10. Purchase (The Ultimate Conversion Event)
 * 
 * Strict Deduplication Rules:
 *  1. event_id is strictly derived from the order ID: `order_<orderId>`
 *  2. Both Meta Pixel and Meta CAPI use this exact same event_id
 *  3. In-browser sessionStorage guard prevents re-firing on page refreshes or success screen returns
 *  4. Server-side conversion_events idempotency prevents duplicate CAPI delivery
 */
export function trackPurchase(
  orderPayload: TrackingOrderPayload,
  userData: TrackingUserData = {}
) {
  if (!orderPayload || !isTrackingEnabled()) return;

  const orderId = String(orderPayload.order_number || orderPayload.id || '').trim();
  if (!orderId) {
    console.warn('[Tracking Engine] Purchase event aborted: Missing order identifier');
    return;
  }

  // 1. In-browser deduplication guard
  const sessionGuardKey = `putimach_purchase_tracked_${orderId}`;
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem(sessionGuardKey)) {
        console.log(`[Tracking Engine] Purchase already tracked for order #${orderId}. Skipping browser duplicate.`);
        return;
      }
      sessionStorage.setItem(sessionGuardKey, 'true');
    } catch (_) {}
  }

  // 2. Deterministic Event ID
  const eventId = generatePurchaseEventId(orderId);
  const items = Array.isArray(orderPayload.ordered_items) ? orderPayload.ordered_items : [];
  const value = Number(orderPayload.total || orderPayload.amount || orderPayload.subtotal || 0);
  const shipping = Number(orderPayload.shipping_fee || orderPayload.delivery_charge || 0);
  const discount = Number(orderPayload.discount || 0);
  const numItems = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const contentIds = items.map(i => String(i.id || i.product_id || ''));

  // 3. GA4 / GTM DataLayer Standard
  pushEcommerceDataLayer('purchase', {
    transaction_id: orderId,
    value: value,
    currency: 'BDT',
    shipping: shipping,
    discount: discount,
    items: items.map(i => ({
      item_id: String(i.id || i.product_id),
      item_name: i.name || i.product_name,
      price: Number(i.price || i.unit_price || 0),
      quantity: Number(i.quantity) || 1,
      item_variant: [i.color || i.color_name, i.size].filter(Boolean).join(' / '),
    })),
  }, eventId);

  // 4. Meta Pixel (Exact matching eventID for deduplication)
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      content_ids: contentIds,
      content_type: 'product',
      value: value,
      currency: 'BDT',
      num_items: numItems,
      order_id: orderId,
    }, { eventID: eventId });
  }

  // 5. TikTok Pixel
  if (window.ttq) {
    window.ttq.track('CompletePayment', {
      contents: items.map(i => ({
        content_id: String(i.id || i.product_id),
        content_name: i.name || i.product_name,
        quantity: Number(i.quantity) || 1,
        price: Number(i.price || i.unit_price || 0),
      })),
      value: value,
      currency: 'BDT',
    }, { event_id: eventId });
  }

  // 6. Server-Side CAPI + Events API (Exact matching eventId)
  dispatchServerConversion({
    eventName: 'Purchase',
    eventId,
    orderId,
    userData: {
      phone: userData.phone || orderPayload.phone,
      email: userData.email || orderPayload.email,
      name: userData.name || orderPayload.customer_name,
      firstName: userData.firstName,
      lastName: userData.lastName,
      city: userData.city || orderPayload.city,
      external_id: orderId,
    },
    customData: {
      currency: 'BDT',
      value: value,
      num_items: numItems,
      order_id: orderId,
      content_ids: contentIds,
      contents: items.map(i => ({
        id: String(i.id || i.product_id),
        name: i.name || i.product_name,
        price: Number(i.price || i.unit_price || 0),
        quantity: Number(i.quantity) || 1,
      })),
    },
  });

  logDebugEvent('Purchase', eventId, { orderId, value, items, userData });
}
