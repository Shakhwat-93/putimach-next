'use client';
// @ts-nocheck
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Marketing Tracking & Analytics Engine
 * GTM + GA4 + Meta Pixel + Meta CAPI + TikTok Pixel + TikTok Events API
 * 
 * Features:
 *  • Single canonical tracking abstraction
 *  • Single Event ID shared between Client Browser & Server APIs (Deduplication)
 *  • Safe dynamic script injection with duplicate prevention
 *  • GA4 Ecommerce dataLayer lifecycle management
 *  • Zero exposure of server access tokens to the client
 * ─────────────────────────────────────────────────────────────────────────────
 */

let _config = null;
let _initPromise = null;
let _lastPageViewPath = '';

/**
 * Fetch client-safe tracking configuration from /api/tracking/config
 */
export async function loadTrackingConfig(): Promise<any> {
  if (_config) return _config;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const res = await fetch('/api/tracking/config', { cache: 'no-store' });
      const json = await res.json();
      _config = json?.config || {};

      if (_config.ecommerce_tracking_enabled !== false) {
        if (_config.gtm_enabled && _config.gtm_container_id) {
          injectGTM(_config.gtm_container_id);
        }
        if (_config.ga4_enabled && _config.ga4_measurement_id && !_config.gtm_enabled) {
          injectDirectGA4(_config.ga4_measurement_id);
        }
        if (_config.meta_enabled && _config.meta_pixel_id) {
          injectMetaPixel(_config.meta_pixel_id);
        }
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

export function getTrackingConfig() {
  return _config || {};
}

export function isTrackingEnabled() {
  const cfg = getTrackingConfig();
  return cfg.ecommerce_tracking_enabled !== false;
}

// ── 1. GTM Injection ──────────────────────────────────────────────────────────
export function injectGTM(gtmId: string) {
  if (!gtmId || typeof window === 'undefined' || document.getElementById('gtm-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);

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
}

// ── 2. Direct GA4 Injection (Used only when GTM is not enabled) ───────────────
export function injectDirectGA4(measurementId: string) {
  if (!measurementId || typeof window === 'undefined' || document.getElementById('ga4-script')) return;

  const script = document.createElement('script');
  script.id = 'ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: false });
}

// ── 3. Meta Pixel Injection ──────────────────────────────────────────────────
export function injectMetaPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined' || window.fbq || document.getElementById('meta-pixel-script')) return;

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
}

// ── 4. TikTok Pixel Injection ────────────────────────────────────────────────
export function injectTikTokPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined' || window.ttq || document.getElementById('tiktok-pixel-script')) return;

  (function(w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = [
      "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"
    ];
    ttq.setAndDefer = function(t, e) {
      t[e] = function() {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function(t) {
      for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n]);
      }
      return e;
    };
    ttq.load = function(e, n) {
      var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date;
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      var o = document.createElement("script");
      o.id = "tiktok-pixel-script";
      o.type = "text/javascript";
      o.async = true;
      o.src = i + "?sdkid=" + e + "&lib=" + t;
      var a = document.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(pixelId);
  })(window, document, 'ttq');
}

// ── Event ID Generation ──────────────────────────────────────────────────────
export function generateEventId(): string {
  try {
    return 'evt_' + crypto.randomUUID().replace(/-/g, '');
  } catch {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
}

// ── Cookie Helpers ───────────────────────────────────────────────────────────
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getFbClickId() {
  if (typeof window === 'undefined') return null;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
}

function getTtClickId() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ttclid') || null;
}

// ── DataLayer Cleanup & Push ─────────────────────────────────────────────────
function pushEcommerceDataLayer(event: string, ecommerceData: any, eventId: string) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  
  // Clear previous ecommerce state to prevent tag reuse
  window.dataLayer.push({ ecommerce: null });
  
  // Push standard payload
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
  userData?: any;
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
      keepalive: true, // Guarantees execution during page unloads
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
 */
export function trackPageView() {
  if (typeof window === 'undefined' || !isTrackingEnabled()) return;
  const currentPath = window.location.pathname;

  // Prevent duplicate pageview on identical route state
  if (_lastPageViewPath === currentPath) return;
  _lastPageViewPath = currentPath;

  const eventId = generateEventId();
  const cfg = getTrackingConfig();

  // DataLayer / GA4
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'page_view',
    event_id: eventId,
    page_path: currentPath,
    page_title: document.title,
  });

  // Meta Pixel (Only if Pixel is set and GTM is NOT managing it)
  if (window.fbq && cfg.meta_enabled && !cfg.gtm_enabled) {
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
 */
export function trackViewContent(product: any) {
  if (!product || !isTrackingEnabled()) return;
  const eventId = generateEventId();
  const price = Number(product.price) || 0;
  const productId = String(product.id || '');
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

  // 4. Server-Side CAPI + Events API
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
  const eventId = generateEventId();

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'search',
    event_id: eventId,
    search_term: query,
  });

  if (window.fbq) {
    window.fbq('track', 'Search', { search_string: query }, { eventID: eventId });
  }

  if (window.ttq) {
    window.ttq.track('Search', { query }, { event_id: eventId });
  }

  logDebugEvent('Search', eventId, { query });
}

/**
 * 4. AddToCart
 */
export function trackAddToCart(product: any, quantity: number = 1, size: string = '', color: string = '') {
  if (!product || !isTrackingEnabled()) return;
  const eventId = generateEventId();
  const price = Number(product.price) || 0;
  const lineValue = price * quantity;
  const productId = String(product.id || '');
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
export function trackRemoveFromCart(product: any, quantity: number = 1, size: string = '', color: string = '') {
  if (!product || !isTrackingEnabled()) return;
  const eventId = generateEventId();
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
export function trackViewCart(items: any[] = [], total: number = 0) {
  if (!isTrackingEnabled() || items.length === 0) return;
  const eventId = generateEventId();

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
 */
export function trackInitiateCheckout(items: any[] = [], total: number = 0) {
  if (!isTrackingEnabled() || items.length === 0) return;
  const eventId = generateEventId();
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

  // 4. Server-Side CAPI + Events API
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
export function trackAddShippingInfo(items: any[] = [], shippingArea: string = '', fee: number = 0, total: number = 0) {
  if (!isTrackingEnabled()) return;
  const eventId = generateEventId();

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
export function trackAddPaymentInfo(items: any[] = [], paymentMethod: string = 'COD', total: number = 0) {
  if (!isTrackingEnabled()) return;
  const eventId = generateEventId();

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
 * Generated only after successful order creation and database confirmation.
 */
export function trackPurchase(orderPayload: any, userData: { phone?: string; email?: string; name?: string; city?: string } = {}) {
  if (!orderPayload || !isTrackingEnabled()) return;

  const eventId = generateEventId();
  const orderId = String(orderPayload.order_number || orderPayload.id || '');
  const items = Array.isArray(orderPayload.ordered_items) ? orderPayload.ordered_items : [];
  const value = Number(orderPayload.total || orderPayload.amount || orderPayload.subtotal || 0);
  const shipping = Number(orderPayload.shipping_fee || orderPayload.delivery_charge || 0);
  const discount = Number(orderPayload.discount || 0);
  const numItems = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const contentIds = items.map(i => String(i.id || i.product_id || ''));

  // 1. GA4 / GTM DataLayer Standard
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

  // 2. Meta Pixel
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

  // 3. TikTok Pixel
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

  // 4. Server-Side CAPI + Events API (With SHA-256 hashed customer parameters)
  dispatchServerConversion({
    eventName: 'Purchase',
    eventId,
    orderId,
    userData: {
      phone: userData.phone || orderPayload.phone,
      email: userData.email || orderPayload.email,
      firstName: userData.name || orderPayload.customer_name,
      city: userData.city || orderPayload.city,
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
