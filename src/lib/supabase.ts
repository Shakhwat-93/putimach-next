// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ordersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL;
const ordersAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseOthers = createClient(supabaseUrl, supabaseAnonKey);
const supabaseOrders = ordersUrl && ordersAnonKey ? createClient(ordersUrl, ordersAnonKey) : supabaseOthers;

// Transparent routing proxy to support multi-database split
export const supabase = new Proxy({}, {
  get(target, prop) {
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

        // 2. All operational tables (orders, users, inventory, toy_box_inventory, etc.)
        // live in the ORDERS database (supabaseOrders: tvoxogfqxxilvudtdfdj)
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
