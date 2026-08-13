import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io';
const FALLBACK_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NjI4OTg4MCwiZXhwIjo0OTQxOTYzNDgwLCJyb2xlIjoiYW5vbiJ9.HmcIIGb7nWMtKWnopMW8SENHBHXRC6DE2XRJpC6qIQM';

// Server-side supabase client for fetching data in Server Components
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  const ordersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL || FALLBACK_URL;
  const ordersAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY || FALLBACK_ANON_KEY;

  const supabaseOthers = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const supabaseOrders = ordersUrl && ordersAnonKey 
    ? createClient(ordersUrl, ordersAnonKey, { auth: { persistSession: false } }) 
    : supabaseOthers;

  const supabase: any = new Proxy({}, {
    get(target, prop: string) {
      if (prop === 'auth') return supabaseOthers.auth;
      if (prop === 'storage') return supabaseOthers.storage;
      if (prop === 'from') {
        return (tableName: string) => {
          if (tableName === 'products' || tableName === 'cb_products') return supabaseOthers.from('cb_products');
          if (tableName === 'categories' || tableName === 'cb_categories') return supabaseOthers.from('cb_categories');
          if (tableName === 'site_settings' || tableName === 'system_configs' || tableName === 'cb_settings') return supabaseOthers.from('cb_settings');
          // All other tables (orders, users, etc.) go to orders DB
          return supabaseOrders.from(tableName);
        };
      }
      const val = (supabaseOthers as any)[prop];
      return typeof val === 'function' ? val.bind(supabaseOthers) : val;
    },
  });

  return supabase;
}
