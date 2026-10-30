'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STRICT 5-EVENT ENTERPRISE TRACKING ARCHITECTURE
 * GTM + GA4 + Meta Pixel + Meta CAPI
 * 
 * STRICT CANONICAL 5-EVENT MAPPING:
 *  1. PageView       -> Meta: `PageView`         | GA4: `page_view`
 *  2. Product View   -> Meta: `ViewContent`      | GA4: `view_item`
 *  3. Add To Cart    -> Meta: `AddToCart`        | GA4: `add_to_cart`
 *  4. Begin Checkout -> Meta: `InitiateCheckout` | GA4: `begin_checkout`
 *  5. Purchase       -> Meta: `Purchase`         | GA4: `purchase`
 * 
 * STRICT ZERO-DUPLICATION & OWNERSHIP RULES:
 *  - Exclusive Browser Tag Ownership: When GTM is enabled, GTM container is the
 *    sole owner of browser tags via dataLayer. Direct `window.fbq` is suppressed.
 *  - Single Source of Truth: When GTM is disabled, Direct Meta Pixel fires.
 *  - Server CAPI Parity: Server-side Meta CAPI receives identical `event_id` and
 *    payload schema for deterministic browser/server deduplication.
 *  - Order-Level Idempotency: Purchase `event_id` is strictly `order_<orderId>`
 *    with browser sessionStorage guarding and database-backed CAPI deduplication.
 *  - All other events (Search, RemoveFromCart, ViewCart, AddShippingInfo, 
 *    AddPaymentInfo, Leads, Custom Timers) are strictly disabled.
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
  customer_name?: string;
  name?: string;
  phone?: string;
  customer_phone?: string;
  email?: string;
  customer_email?: string;
  address?: string;
  shipping_address?: string;
  product_name?: string;
  amount?: number;
  total?: number;
  subtotal?: number;
  items?: number;
  quantity?: number;
  totalItems?: number;
  shipping_zone?: string;
  shipping_fee?: number;
  delivery_charge?: number;
  discount?: number;
  source?: string;
  status?: string;
  payment_status?: string;
  ip_address?: string;
  customerIp?: string;
  traffic_source?: string;
  city?: string;
  ordered_items?: any[];
}

export interface TrackingUserData {
  phone?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  clientIp?: string;
  external_id?: string;
  fbp?: string;
  fbc?: string;
  ttclid?: string;
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

// Strict whitelist of allowed DataLayer events
const ALLOWED_DATALAYER_EVENTS = new Set([
  'page_view',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase'
]);

// Strict whitelist of allowed Meta events
const ALLOWED_META_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Purchase'
]);

let _config: TrackingConfig | null = null;
let _initPromise: Promise<TrackingConfig> | null = null;
let _lastPageViewPath = '';
let _lastPageViewTimestamp = 0;

// In-memory deduplication cache for preventing rapid duplicate triggers
const _recentEvents = new Map<string, number>();

function isDuplicateEvent(cacheKey: string, windowMs = 2500): boolean {
  const now = Date.now();
  const lastTime = _recentEvents.get(cacheKey) || 0;
  if (now - lastTime < windowMs) {
    return true;
  }
  _recentEvents.set(cacheKey, now);

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

        // 3. Direct Meta Pixel (Only when GTM is NOT managing tags)
        if (_config.meta_enabled && _config.meta_pixel_id && !_config.gtm_enabled) {
          injectMetaPixel(_config.meta_pixel_id);
        }

        // 4. Direct TikTok Pixel (Only when GTM is NOT managing tags)
        if (_config.tiktok_enabled && _config.tiktok_pixel_id && !_config.gtm_enabled) {
          injectTikTokPixel(_config.tiktok_pixel_id);
        }
      }

      if (_config.debug_mode) {
        console.log('[Tracking Engine] Initialized (Strict 5-Event Architecture):', {
          gtm: _config.gtm_enabled ? _config.gtm_container_id : 'Disabled',
          ga4: _config.ga4_enabled ? _config.ga4_measurement_id : 'Disabled',
          meta: _config.meta_enabled ? _config.meta_pixel_id : 'Disabled',
          capi: _config.meta_capi_enabled,
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

/**
 * Determine if direct Meta Pixel window.fbq calls should execute.
 * When GTM is enabled, GTM container is the exclusive browser owner via dataLayer events.
 * Direct window.fbq calls MUST NOT run when GTM is enabled to avoid 2x duplicate fires.
 */
function shouldFireDirectMeta(cfg: TrackingConfig): boolean {
  if (cfg.gtm_enabled) return false;
  return Boolean(typeof window !== 'undefined' && window.fbq && cfg.meta_enabled);
}

/**
 * Determine if direct TikTok Pixel window.ttq calls should execute.
 */
function shouldFireDirectTikTok(cfg: TrackingConfig): boolean {
  if (cfg.gtm_enabled) return false;
  return Boolean(typeof window !== 'undefined' && window.ttq && cfg.tiktok_enabled);
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

// ── 2. Direct GA4 Injection ───────────────────────────────────────────────────
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

// ── DataLayer Cleanup & Push (Strict 5-Event Enforcement) ────────────────────
function pushEcommerceDataLayer(
  event: string, 
  ecommerceData: any, 
  eventId: string, 
  userData?: TrackingUserData,
  extraOrderData?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  // STRICT ENFORCEMENT: Only 5 canonical events permitted
  if (!ALLOWED_DATALAYER_EVENTS.has(event)) {
    if (getTrackingConfig().debug_mode) {
      console.warn(`[Tracking Engine] Event "${event}" blocked by STRICT 5-EVENT POLICY.`);
    }
    return;
  }

  window.dataLayer = window.dataLayer || [];
  
  // Clear previous ecommerce state to prevent tag reuse in GA4
  window.dataLayer.push({ ecommerce: null });

  // Prepare customer profile matching variables for GTM and GA4
  const nameParts = (userData?.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = userData?.firstName || nameParts[0] || userData?.name || '';
  const lastName = userData?.lastName || nameParts.slice(1).join(' ') || '';
  const phone = userData?.phone || '';
  const email = userData?.email || '';
  const address = userData?.address || userData?.street || '';
  const city = userData?.city || 'Dhaka';
  const country = userData?.country || 'BD';
  const postalCode = userData?.postalCode || '1200';
  const clientIp = userData?.clientIp || '';

  const payload: Record<string, any> = {
    event,
    event_id: eventId,
    ecommerce: ecommerceData,
  };

  // If extra order data provided (from exact user order schema), inject to dataLayer root
  if (extraOrderData) {
    if (extraOrderData.id) payload.id = extraOrderData.id;
    if (extraOrderData.customer_name) payload.customer_name = extraOrderData.customer_name;
    if (extraOrderData.phone) payload.phone = extraOrderData.phone;
    if (extraOrderData.address) payload.address = extraOrderData.address;
    if (extraOrderData.product_name) payload.product_name = extraOrderData.product_name;
    if (extraOrderData.amount !== undefined) payload.amount = extraOrderData.amount;
    if (extraOrderData.items !== undefined) payload.items = extraOrderData.items;
    if (extraOrderData.shipping_zone) payload.shipping_zone = extraOrderData.shipping_zone;
    if (extraOrderData.source) payload.source = extraOrderData.source;
    if (extraOrderData.status) payload.status = extraOrderData.status;
    if (extraOrderData.ip_address) payload.ip_address = extraOrderData.ip_address;
    if (extraOrderData.traffic_source) payload.traffic_source = extraOrderData.traffic_source;
  }

  // If customer data is provided, attach all DataLayer variables expected by GTM and GA4
  if (phone || email || firstName || address) {
    payload.customerFirstName = firstName;
    payload.customerLastName = lastName;
    payload.customerBillingPhone = phone;
    payload.customerBillingEmail = email;
    payload.customerBillingAddress1 = address;
    payload.customerBillingCity = city;
    payload.customerBillingCountry = country;
    payload.customerBillingPostcode = postalCode;
    if (clientIp) {
      payload.customer_ip = clientIp;
      payload.ip_address = clientIp;
    }
    payload.user_data = {
      email_address: email,
      phone_number: phone,
      address: {
        first_name: firstName,
        last_name: lastName,
        street: address,
        city: city,
        postal_code: postalCode,
        country: country,
      },
    };
  }
  
  // Push standard payload with full customer matching parameters
  window.dataLayer.push(payload);
}

// ── Server-side Conversion Dispatcher (Meta CAPI + TikTok Events API) ────────
async function dispatchServerConversion(params: {
  eventName: string;
  eventId: string;
  orderId?: string;
  userData?: TrackingUserData;
  customData?: any;
}) {
  // STRICT ENFORCEMENT: Only canonical Meta events permitted
  if (!ALLOWED_META_EVENTS.has(params.eventName)) {
    return;
  }

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
      keepalive: true,
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
      metaPixelDirect: shouldFireDirectMeta(cfg),
      metaPixelViaGTM: Boolean(cfg.gtm_enabled),
      metaCAPI: Boolean(cfg.meta_capi_enabled),
      tiktokPixelDirect: shouldFireDirectTikTok(cfg),
      tiktokViaGTM: Boolean(cfg.gtm_enabled),
      tiktokEventsAPI: Boolean(cfg.tiktok_events_api_enabled),
    });
    console.groupEnd();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL 5 STANDARD E-COMMERCE EVENT IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. PAGE VIEW
 * Event: `PageView` (Meta) / `page_view` (GA4)
 * Fire on every page load and every successful internal route navigation.
 * Exactly 1 PageView per logical page visit.
 */
export function trackPageView(isVirtual = false) {
  if (typeof window === 'undefined' || !isTrackingEnabled()) return;
  const currentPath = window.location.pathname;
  const now = Date.now();

  // Deduplication Rule 1: Prevent duplicate pageview on identical route within 1500ms
  if (_lastPageViewPath === currentPath && (now - _lastPageViewTimestamp < 1500)) {
    return;
  }
  _lastPageViewPath = currentPath;
  _lastPageViewTimestamp = now;

  const eventId = generateEventId('pv');
  const cfg = getTrackingConfig();

  if (cfg.gtm_enabled) {
    // When GTM is enabled, container load already triggers initial PageView via All Pages trigger.
    // We only push virtual 'page_view' for subsequent client-side navigation.
    if (isVirtual) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'page_view',
        event_id: eventId,
        page_path: currentPath,
        page_title: document.title,
      });
    }
  } else {
    // Direct Tracking Mode (No GTM)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      event_id: eventId,
      page_path: currentPath,
      page_title: document.title,
    });

    if (shouldFireDirectMeta(cfg)) {
      window.fbq('track', 'PageView', {}, { eventID: eventId });
    }

    if (shouldFireDirectTikTok(cfg)) {
      window.ttq.page();
    }
  }

  logDebugEvent('PageView', eventId, { path: currentPath, isVirtual });
}

/**
 * 2. PRODUCT VIEW
 * Event: `ViewContent` (Meta) / `view_item` (GA4)
 * Fire only when a user actually opens/views a product details page.
 * Deduplicated per product ID within 3000ms.
 */
export function trackViewContent(product: TrackingProduct) {
  if (!product || !isTrackingEnabled()) return;

  const productId = String(product.id || '').trim();
  if (!productId) return;

  // Session/Route-level deduplication: Exactly ONE ViewContent per product per 60 seconds
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const dedupeKey = `vc_${productId}_${currentPath}`;
  if (isDuplicateEvent(dedupeKey, 60000)) return;

  const eventId = generateEventId('vc');
  const price = Number(product.price) || 0;
  const productName = product.name || 'Product';
  const category = product.category_name || product.category || 'General';
  const cfg = getTrackingConfig();

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

  // 2. Direct Meta Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectMeta(cfg)) {
    window.fbq('track', 'ViewContent', {
      content_ids: [productId],
      content_name: productName,
      content_category: category,
      content_type: 'product',
      value: price,
      currency: 'BDT',
    }, { eventID: eventId });
  }

  // 3. Direct TikTok Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectTikTok(cfg)) {
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
 * 3. ADD TO CART
 * Event: `AddToCart` (Meta) / `add_to_cart` (GA4)
 * Fire only after a product is successfully added to the cart.
 * Debounces rapid accidental double-clicks (< 350ms) per item variant.
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
  const cfg = getTrackingConfig();

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

  // 2. Direct Meta Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectMeta(cfg)) {
    window.fbq('track', 'AddToCart', {
      content_ids: [productId],
      content_name: productName,
      content_type: 'product',
      value: lineValue,
      currency: 'BDT',
      num_items: quantity,
    }, { eventID: eventId });
  }

  // 3. Direct TikTok Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectTikTok(cfg)) {
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
 * 4. BEGIN CHECKOUT
 * Event: `InitiateCheckout` (Meta) / `begin_checkout` (GA4)
 * Fire only when user successfully enters the checkout flow.
 * Deduplicated per checkoutSessionId so component re-renders or shipping zone changes don't inflate events.
 */
export function trackInitiateCheckout(
  items: any[] = [],
  total = 0,
  checkoutSessionId = ''
) {
  if (!isTrackingEnabled() || !items || items.length === 0) return;

  const eventId = checkoutSessionId 
    ? generateCheckoutEventId(checkoutSessionId)
    : generateEventId('ic');

  if (isDuplicateEvent(`ic_${eventId}`, 3000)) return;

  const numItems = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const contentIds = items.map(i => String(i.product?.id || i.id || ''));
  const value = Number(total) || 0;
  const cfg = getTrackingConfig();

  // 1. DataLayer
  pushEcommerceDataLayer('begin_checkout', {
    currency: 'BDT',
    value,
    items: items.map(i => ({
      item_id: String(i.product?.id || i.id),
      item_name: i.product?.name || i.name,
      price: Number(i.product?.price || i.price || 0),
      quantity: Number(i.quantity) || 1,
      item_variant: [i.color, i.size].filter(Boolean).join(' / '),
    })),
  }, eventId);

  // 2. Direct Meta Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectMeta(cfg)) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      content_type: 'product',
      value,
      currency: 'BDT',
      num_items: numItems,
    }, { eventID: eventId });
  }

  // 3. Direct TikTok Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectTikTok(cfg)) {
    window.ttq.track('InitiateCheckout', {
      contents: items.map(i => ({
        content_id: String(i.product?.id || i.id),
        content_name: i.product?.name || i.name,
        quantity: Number(i.quantity) || 1,
        price: Number(i.product?.price || i.price || 0),
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
        id: String(i.product?.id || i.id),
        name: i.product?.name || i.name,
        price: Number(i.product?.price || i.price || 0),
        quantity: Number(i.quantity) || 1,
      })),
    },
  });

  logDebugEvent('InitiateCheckout', eventId, { items, total });
}

/**
 * 5. PURCHASE
 * Event: `Purchase` (Meta) / `purchase` (GA4)
 * Fire only after the order/payment reaches verified successful purchase state.
 * 
 * Strict Deduplication Rules:
 *  1. event_id is strictly derived from the order ID: `order_<orderId>`
 *  2. GTM receives dataLayer push with event_id: `order_<orderId>`
 *  3. Direct fbq only fires if GTM is disabled
 *  4. In-browser sessionStorage guard prevents re-firing on page refreshes or success screen returns
 *  5. Server-side conversion_events idempotency prevents duplicate CAPI delivery
 */
export function trackPurchase(
  orderPayload: TrackingOrderPayload,
  userData: TrackingUserData = {}
) {
  if (!orderPayload || !isTrackingEnabled()) return;

  const orderId = String(orderPayload.id || orderPayload.order_number || '').trim();
  if (!orderId) {
    console.warn('[Tracking Engine] Purchase event aborted: Missing order identifier');
    return;
  }

  // Extract comprehensive customer & order information from orderPayload & userData
  const customerName = String(orderPayload.customer_name || orderPayload.name || userData.name || '').trim();
  const phone = String(orderPayload.phone || orderPayload.customer_phone || userData.phone || '').trim();
  const email = String(orderPayload.email || orderPayload.customer_email || userData.email || '').trim();
  const address = String(orderPayload.address || orderPayload.shipping_address || userData.address || userData.street || '').trim();
  const ipAddress = String(orderPayload.ip_address || orderPayload.customerIp || userData.clientIp || '').trim();
  const shippingZone = String(orderPayload.shipping_zone || '').trim();
  const source = String(orderPayload.source || 'Website').trim();
  const status = String(orderPayload.status || 'New').trim();
  const trafficSource = String(orderPayload.traffic_source || '').trim();
  const city = String(orderPayload.city || userData.city || (shippingZone.toLowerCase().includes('outside') ? 'Outside Dhaka' : 'Dhaka')).trim();

  const nameParts = customerName.split(/\s+/).filter(Boolean);
  const firstName = userData.firstName || nameParts[0] || customerName || '';
  const lastName = userData.lastName || nameParts.slice(1).join(' ') || '';

  const mergedUserData: TrackingUserData = {
    name: customerName,
    firstName,
    lastName,
    phone,
    email,
    address,
    street: address,
    city,
    country: userData.country || 'BD',
    postalCode: userData.postalCode || '1200',
    clientIp: ipAddress || undefined,
    external_id: orderId,
  };

  // 1. In-browser deduplication guard (durable order-level idempotency)
  const sessionGuardKey = `putimach_purchase_tracked_${orderId}`;
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem(sessionGuardKey)) {
        console.log(`[Tracking Engine] Purchase already tracked for order #${orderId}. Skipping duplicate.`);
        return;
      }
      sessionStorage.setItem(sessionGuardKey, 'true');
    } catch (_) {}
  }

  // 2. Deterministic Event ID (Identical across GTM dataLayer, Meta Pixel, and Meta CAPI)
  const eventId = generatePurchaseEventId(orderId);
  const items = Array.isArray(orderPayload.ordered_items) ? orderPayload.ordered_items : [];
  const value = Number(orderPayload.amount || orderPayload.total || orderPayload.subtotal || 0);
  const shipping = Number(orderPayload.shipping_fee || orderPayload.delivery_charge || 0);
  const discount = Number(orderPayload.discount || 0);
  const numItems = Number(orderPayload.items || orderPayload.quantity || orderPayload.totalItems || items.reduce((s, i) => s + (Number(i.quantity) || 1), 0));
  const productName = String(orderPayload.product_name || items[0]?.name || items[0]?.product_name || 'Product').trim();
  const contentIds = items.map(i => String(i.id || i.product_id || ''));
  const cfg = getTrackingConfig();

  // 3. GA4 / GTM DataLayer Standard with full customer & order fields
  pushEcommerceDataLayer(
    'purchase', 
    {
      transaction_id: orderId,
      value: value,
      currency: 'BDT',
      shipping: shipping,
      discount: discount,
      items: items.map(i => ({
        item_id: String(i.id || i.product_id || productIdFromName(i.name || i.product_name)),
        item_name: i.name || i.product_name || productName,
        price: Number(i.price || i.unit_price || 0),
        quantity: Number(i.quantity) || 1,
        item_variant: [i.color || i.color_name, i.size].filter(Boolean).join(' / '),
      })),
    }, 
    eventId, 
    mergedUserData,
    {
      id: orderId,
      customer_name: customerName,
      phone: phone,
      address: address,
      product_name: productName,
      amount: value,
      items: numItems,
      shipping_zone: shippingZone,
      source: source,
      status: status,
      ip_address: ipAddress || null,
      traffic_source: trafficSource || null,
    }
  );

  // 4. Direct Meta Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectMeta(cfg)) {
    if (phone || email || firstName) {
      try {
        window.fbq('setUserProperties', cfg.meta_pixel_id, {
          em: email,
          ph: phone,
          fn: firstName,
          ln: lastName,
          ct: city,
          st: address,
          country: 'bd',
        });
      } catch (_) {}
    }

    window.fbq('track', 'Purchase', {
      content_ids: contentIds.length ? contentIds : [orderId],
      content_name: productName,
      content_type: 'product',
      value: value,
      currency: 'BDT',
      num_items: numItems,
      order_id: orderId,
      shipping_zone: shippingZone,
      traffic_source: trafficSource,
    }, { eventID: eventId });
  }

  // 5. Direct TikTok Pixel (Only when GTM is NOT managing tags)
  if (shouldFireDirectTikTok(cfg)) {
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

  // 6. Server-Side CAPI + Events API (Exact matching eventId & complete customer profile)
  dispatchServerConversion({
    eventName: 'Purchase',
    eventId,
    orderId,
    userData: {
      phone: phone,
      email: email,
      name: customerName,
      firstName: firstName,
      lastName: lastName,
      address: address,
      street: address,
      city: city,
      country: 'BD',
      postalCode: '1200',
      clientIp: ipAddress,
      external_id: orderId,
    },
    customData: {
      currency: 'BDT',
      value: value,
      num_items: numItems,
      order_id: orderId,
      content_name: productName,
      content_ids: contentIds.length ? contentIds : [orderId],
      shipping_zone: shippingZone,
      source: source,
      traffic_source: trafficSource,
      contents: items.map(i => ({
        id: String(i.id || i.product_id || orderId),
        name: i.name || i.product_name || productName,
        price: Number(i.price || i.unit_price || 0),
        quantity: Number(i.quantity) || 1,
      })),
    },
  });

  logDebugEvent('Purchase', eventId, { orderId, value, items, userData: mergedUserData });
}

// ─────────────────────────────────────────────────────────────────────────────
// DISABLED UNWANTED EVENTS (STRICT 5-EVENT ENFORCEMENT)
// Neutralized as safe no-op stubs to prevent runtime errors in any stale callers
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Disabled under strict 5-event architecture */
export function trackSearch(_query: string) {}

/** @deprecated Disabled under strict 5-event architecture */
export function trackRemoveFromCart(..._args: any[]) {}

/** @deprecated Disabled under strict 5-event architecture */
export function trackViewCart(..._args: any[]) {}

/** @deprecated Disabled under strict 5-event architecture */
export function trackAddShippingInfo(..._args: any[]) {}

/** @deprecated Disabled under strict 5-event architecture */
export function trackAddPaymentInfo(..._args: any[]) {}

function productIdFromName(name: string): string {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'prod';
}
