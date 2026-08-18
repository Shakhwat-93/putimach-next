// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const rawOrdersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL;
const ordersAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY;

const FALLBACK_URL = 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io';
const FALLBACK_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NjI4OTg4MCwiZXhwIjo0OTQxOTYzNDgwLCJyb2xlIjoiYW5vbiJ9.HmcIIGb7nWMtKWnopMW8SENHBHXRC6DE2XRJpC6qIQM';

let supabaseUrl = rawSupabaseUrl || FALLBACK_URL;
let ordersUrl = rawOrdersUrl || FALLBACK_URL;

// On browser client side, route through local /supabase-proxy to eliminate ERR_CERT_AUTHORITY_INVALID
// and mixed-content/CORS security blocking when connecting to sslip.io / HTTP custom VPS backend.
if (typeof window !== 'undefined') {
  if (supabaseUrl.includes('sslip.io') || supabaseUrl.startsWith('http://')) {
    supabaseUrl = `${window.location.origin}/supabase-proxy`;
  }
  if (ordersUrl.includes('sslip.io') || ordersUrl.startsWith('http://')) {
    ordersUrl = `${window.location.origin}/supabase-proxy`;
  }
}

const supabaseOthers = createClient(supabaseUrl, supabaseAnonKey || FALLBACK_ANON_KEY, {
  realtime: { transport: null }
});
const supabaseOrders = ordersUrl && ordersAnonKey 
  ? createClient(ordersUrl, ordersAnonKey, {
      realtime: { transport: null }
    }) 
  : supabaseOthers;

// Helper to create a dummy safe channel for realtime
const dummyChannel = {
  on: () => dummyChannel,
  subscribe: (callback) => {
    if (callback) setTimeout(() => callback('TIMED_OUT'), 0);
    return dummyChannel;
  },
  unsubscribe: () => {},
  send: () => {}
};

// Transparent routing proxy to support multi-database split
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (prop === 'auth') {
      return supabaseOthers.auth;
    }
    if (prop === 'storage') {
      return supabaseOthers.storage;
    }
    if (prop === 'channel') {
      return () => dummyChannel;
    }
    if (prop === 'from') {
      return (tableName) => {
        // 1. Catalog DB tables
        if (tableName === 'products' || tableName === 'cb_products') {
          return supabaseOthers.from('cb_products');
        }
        if (tableName === 'categories' || tableName === 'cb_categories') {
          return supabaseOthers.from('cb_categories');
        }
        if (tableName === 'site_settings' || tableName === 'system_configs' || tableName === 'cb_settings') {
          return supabaseOthers.from('cb_settings');
        }

        // 2. All operational tables
        return supabaseOrders.from(tableName);
      };
    }
    const value = supabaseOthers[prop] || supabaseOrders[prop];
    if (typeof value === 'function') {
      return value.bind(supabaseOthers);
    }
    return value;
  }
});
