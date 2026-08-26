// @ts-nocheck
/**
 * Persistent Cart Storage Layer (IndexedDB + LocalStorage Fallback)
 * Stores minimal required payload: product_id, variant_id, size, color, quantity, added_at
 */

const DB_NAME = 'putimach_store_db';
const DB_VERSION = 1;
const STORE_NAME = 'cart_state';
const CART_KEY = 'current_cart';
const LOCAL_STORAGE_FALLBACK_KEY = 'putimach-cart-persistent';
const SESSION_ID_KEY = 'putimach_cart_session_id';

export interface StoredCartItem {
  product_id: string;
  variant_id?: string;
  size?: string;
  color?: string;
  quantity: number;
  added_at: number;
}

export interface StoredCartState {
  cart_session_id: string;
  items: StoredCartItem[];
  appliedCouponCode?: string | null;
  last_reminder_at?: number;
  updated_at: number;
}

/**
 * Get or generate a persistent anonymous Cart Session ID
 */
export function getOrCreateCartSessionId(): string {
  if (typeof window === 'undefined') return 'cs_ssr';
  try {
    let sid = localStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      const now = Date.now().toString(36);
      const rand = Math.random().toString(36).substring(2, 10);
      sid = `cs_${now}_${rand}`;
      localStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch (e) {
    return `cs_${Date.now()}`;
  }
}

/**
 * Open IndexedDB database with fallback safety
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        reject(event.target.error || new Error('Failed to open IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Load stored minimal cart state from IndexedDB or LocalStorage
 */
export async function loadStoredCart(): Promise<StoredCartState | null> {
  if (typeof window === 'undefined') return null;

  // 1. Try IndexedDB
  try {
    const db = await openDB();
    const state = await new Promise<StoredCartState | null>((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(CART_KEY);

        request.onsuccess = () => {
          if (request.result && request.result.data) {
            resolve(request.result.data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    if (state && Array.isArray(state.items)) {
      return state;
    }
  } catch (idbErr) {
    // IndexedDB failed or disabled, proceed to localStorage fallback
  }

  // 2. LocalStorage Fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch (lsErr) {}

  return null;
}

/**
 * Save minimal cart state to IndexedDB and LocalStorage synchronously
 */
export async function saveStoredCart(state: Partial<StoredCartState>): Promise<void> {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateCartSessionId();
  const payload: StoredCartState = {
    cart_session_id: sessionId,
    items: state.items || [],
    appliedCouponCode: state.appliedCouponCode || null,
    last_reminder_at: state.last_reminder_at || Date.now(),
    updated_at: Date.now()
  };

  // Always mirror in localStorage for instant synchronous recovery
  try {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(payload));
  } catch (e) {}

  // Save in IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id: CART_KEY, data: payload });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) {}
}

/**
 * Clear stored cart state from all storage layers
 */
export async function clearStoredCart(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
  } catch (e) {}

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(CART_KEY);
  } catch (e) {}
}
