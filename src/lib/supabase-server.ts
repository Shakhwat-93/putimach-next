import { createClient } from '@supabase/supabase-js';

// Server-side supabase client for fetching data in Server Components
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const ordersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL;
  const ordersAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

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
          return supabaseOrders.from(tableName);
        };
      }
      const value = (supabaseOthers as any)[prop] || (supabaseOrders as any)[prop];
      if (typeof value === 'function') return value.bind(supabaseOthers);
      return value;
    }
  });

  return supabase;
}
