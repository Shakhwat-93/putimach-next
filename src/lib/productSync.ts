'use client';

import { invalidateCache } from './api';

const SYNC_CHANNEL_NAME = 'putimach_product_sync_channel';
const STORAGE_KEY = 'putimach_product_last_sync_ts';

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch (e) {
      // BroadcastChannel might not be supported in some environments
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

export interface ProductSyncPayload {
  type: 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'ALL_PRODUCTS_SYNC';
  id?: string | number;
  slug?: string;
  timestamp: number;
}

/**
 * Authoritative broadcaster called immediately after any Product create / update / delete in Admin.
 * Notifies all browser windows, tabs, and local client caches.
 */
export function broadcastProductUpdate(targetIdOrSlug?: string | number, type: ProductSyncPayload['type'] = 'PRODUCT_UPDATED') {
  // 1. Immediately invalidate in-memory caches
  invalidateCache();

  if (typeof window === 'undefined') return;

  const payload: ProductSyncPayload = {
    type,
    id: targetIdOrSlug,
    slug: typeof targetIdOrSlug === 'string' ? targetIdOrSlug : undefined,
    timestamp: Date.now()
  };

  // 2. BroadcastChannel for active tabs
  try {
    const channel = getBroadcastChannel();
    channel?.postMessage(payload);
  } catch (err) {
    // Ignore channel post errors
  }

  // 3. localStorage event for cross-window / cross-tab synchronization
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // Ignore storage write errors
  }

  // 4. Custom DOM event for current window components
  try {
    window.dispatchEvent(new CustomEvent('putimach:product-sync', { detail: payload }));
  } catch (err) {
    // Ignore custom event errors
  }
}

/**
 * Universal hook / listener for Storefront components (ProductDetail, Shop, Home, Cart)
 * to automatically receive and react to real-time product updates.
 */
export function subscribeToProductUpdates(callback: (payload: ProductSyncPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handlePayload = (payload: ProductSyncPayload) => {
    invalidateCache();
    callback(payload);
  };

  // 1. BroadcastChannel listener
  const channel = getBroadcastChannel();
  const onChannelMessage = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object' && event.data.timestamp) {
      handlePayload(event.data);
    }
  };
  channel?.addEventListener('message', onChannelMessage);

  // 2. Storage event listener (fires on other tabs/windows when localStorage is updated)
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        handlePayload(data);
      } catch {
        handlePayload({ type: 'ALL_PRODUCTS_SYNC', timestamp: Date.now() });
      }
    }
  };
  window.addEventListener('storage', onStorageEvent);

  // 3. Custom Event listener (same window)
  const onCustomEvent = (event: Event) => {
    const customEvt = event as CustomEvent<ProductSyncPayload>;
    if (customEvt.detail) {
      handlePayload(customEvt.detail);
    }
  };
  window.addEventListener('putimach:product-sync', onCustomEvent);

  // 4. Tab visibility / focus listener (revalidate when user switches back to tab)
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      handlePayload({ type: 'ALL_PRODUCTS_SYNC', timestamp: Date.now() });
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Return clean unsubscriber
  return () => {
    channel?.removeEventListener('message', onChannelMessage);
    window.removeEventListener('storage', onStorageEvent);
    window.removeEventListener('putimach:product-sync', onCustomEvent);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
