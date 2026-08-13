// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { isNativeApp } from '../platform/runtime';
import { getLocalStorage } from '../platform/storage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ordersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL;
const ordersAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Admin Supabase] Missing environment variables - some features may not work');
}

const FALLBACK_URL = 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io';
const FALLBACK_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NjI4OTg4MCwiZXhwIjo0OTQxOTYzNDgwLCJyb2xlIjoiYW5vbiJ9.HmcIIGb7nWMtKWnopMW8SENHBHXRC6DE2XRJpC6qIQM';

const supabaseOthers = createClient(supabaseUrl || FALLBACK_URL, supabaseAnonKey || FALLBACK_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNativeApp(),
    storage: getLocalStorage()
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
});

const supabaseOrders = ordersUrl && ordersAnonKey ? createClient(ordersUrl || FALLBACK_URL, ordersAnonKey || FALLBACK_ANON_KEY) : supabaseOthers;

// Transparent routing proxy to support multi-database split
export const supabase = new Proxy({}, {
  get(target, prop) {
    // Auth & Storage ALWAYS belong to the main Supabase project (supabaseOthers: nmomvkssloqnhogndlwg)
    if (prop === 'auth') {
      return supabaseOthers.auth;
    }
    if (prop === 'storage') {
      return supabaseOthers.storage;
    }

    if (prop === 'from') {
      return (tableName) => {
        // 1. Catalog DB tables (supabaseOthers: nmomvkssloqnhogndlwg)
        if (tableName === 'products' || tableName === 'cb_products') {
          return supabaseOthers.from('cb_products');
        }
        if (tableName === 'categories' || tableName === 'cb_categories') {
          return supabaseOthers.from('cb_categories');
        }
        if (tableName === 'site_settings' || tableName === 'system_configs' || tableName === 'cb_settings') {
          return supabaseOthers.from('cb_settings');
        }

        // 2. All operational & management tables (orders, users, user_roles, inventory,
        // toy_box_inventory, daily_tasks, task_completions, assigned_tasks, notifications, etc.)
        // live in the ORDERS database (supabaseOrders: tvoxogfqxxilvudtdfdj)
        return supabaseOrders.from(tableName);
      };
    }
    if (prop === 'functions') {
      return {
        invoke: (functionName, options) => {
          if (functionName === 'admin-auth-actions') {
            return supabaseOthers.functions.invoke(functionName, options);
          }
          return supabaseOrders.functions.invoke(functionName, options);
        }
      };
    }
    const value = supabaseOthers[prop] || supabaseOrders[prop];
    if (typeof value === 'function') {
      return value.bind(supabaseOthers);
    }
    return value;
  }
});
