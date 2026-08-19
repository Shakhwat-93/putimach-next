// @ts-nocheck
import { supabase } from './supabase';
import { products as fallbackProducts, categories as fallbackCategories } from '../data/products';
import { normalizeProduct } from './productMedia';

// Global in-memory cache for 0ms route transitions
let productsCache = { data: null, time: 0 };
let categoriesCache = { data: null, time: 0 };
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL

export function invalidateCache() {
  productsCache = { data: null, time: 0 };
  categoriesCache = { data: null, time: 0 };
}

// ==================== AUTH ====================
export async function loginAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function logoutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ==================== CATEGORIES ====================
export async function getCategories(options = {}) {
  if (!options.forceRefresh && categoriesCache.data && (Date.now() - categoriesCache.time < CACHE_TTL_MS)) {
    return categoriesCache.data;
  }

  try {
    const { data, error } = await supabase
      .from('cb_categories')
      .select('id, data, created_at')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.warn('Supabase categories query notice:', error.message || error);
      return [];
    }

    const list = (data || []).map(row => ({
      id: row.id,
      created_at: row.created_at,
      ...(row.data || {})
    }));

    const result = list;
    categoriesCache = { data: result, time: Date.now() };
    return result;
  } catch (err) {
    console.warn('Categories query notice:', err?.message || err);
    return [];
  }
}

export async function createCategory(categoryData) {
  const payload = {
    id: categoryData.slug || 'cat-' + Date.now(),
    data: categoryData,
    created_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('cb_categories')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  invalidateCache();
  return { id: data.id, created_at: data.created_at, ...data.data };
}

export async function updateCategory(id, categoryData) {
  const { data, error } = await supabase
    .from('cb_categories')
    .update({ data: categoryData })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  invalidateCache();
  return { id: data.id, created_at: data.created_at, ...data.data };
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('cb_categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
  invalidateCache();
}

// ==================== PRODUCTS ====================
export async function getProducts(options = {}) {
  if (!options.forceRefresh && productsCache.data && (Date.now() - productsCache.time < CACHE_TTL_MS)) {
    let list = productsCache.data;
    if (options.category && options.category !== 'all') {
      list = list.filter(p => p.category === options.category);
    }
    return list;
  }

  try {
    const { data, error } = await supabase
      .from('cb_products')
      .select('id, data, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('Supabase products query notice:', error.message || error);
      return [];
    }

    let list = (data || []).map(row => normalizeProduct({
      id: row.id,
      created_at: row.created_at,
      slug: row.data?.slug || row.id,
      ...(row.data || {})
    })).filter(Boolean);

    productsCache = { data: list, time: Date.now() };

    const inventoryIds = list.map(p => p.inventory_id).filter(Boolean);
    if (inventoryIds.length > 0) {
      supabase
        .from('inventory')
        .select('id, current_stock')
        .in('id', inventoryIds)
        .then(({ data: invData, error: invErr }) => {
          if (!invErr && invData) {
            const invMap = {};
            invData.forEach(item => { invMap[item.id] = item; });
            list.forEach(p => {
              if (p.inventory_id && invMap[p.inventory_id]) {
                p.inventory = invMap[p.inventory_id];
              }
            });
          }
        })
        .catch(e => console.warn('Background inventory sync notice:', e));
    }

    if (options.category && options.category !== 'all') {
      list = list.filter(p => p.category === options.category);
    }

    return list;
  } catch (err) {
    console.warn('Products query notice, using local fallback:', err?.message || err);
    let list = fallbackProducts || [];
    if (options.category && options.category !== 'all') {
      list = list.filter(p => p.category === options.category);
    }
    return list;
  }
}

export async function getProductBySlug(slug) {
  if (!slug) return null;

  if (productsCache.data) {
    const cached = productsCache.data.find(
      p => p.id === slug || p.slug === slug || String(p.id).toLowerCase() === String(slug).toLowerCase() || String(p.slug).toLowerCase() === String(slug).toLowerCase()
    );
    if (cached) return cached;
  }

  try {
    let { data, error } = await supabase
      .from('products')
      .select('id, data, created_at')
      .eq('id', slug)
      .maybeSingle();

    if (!data && !error) {
      const res = await supabase
        .from('products')
        .select('id, data, created_at')
        .eq('data->>slug', slug)
        .maybeSingle();
      data = res.data;
    }

    if (!data) {
      const fallback = (fallbackProducts || []).find(
        p => String(p.id) === String(slug) || String(p.slug) === String(slug)
      );
      return fallback ? normalizeProduct(fallback) : null;
    }

    const product = normalizeProduct({ id: data.id, created_at: data.created_at, slug: data.data?.slug || data.id, ...data.data });

    if (product?.inventory_id) {
      supabase
        .from('inventory')
        .select('*')
        .eq('id', product.inventory_id)
        .maybeSingle()
        .then(({ data: invData }) => {
          if (invData) product.inventory = invData;
        })
        .catch(() => {});
    }

    return product;
  } catch (err) {
    console.warn('getProductBySlug notice, using fallback lookup:', err?.message || err);
    const fallback = (fallbackProducts || []).find(
      p => String(p.id) === String(slug) || String(p.slug) === String(slug)
    );
    return fallback ? normalizeProduct(fallback) : null;
  }
}

export async function createProduct(productData) {
  const payload = {
    id: productData.slug || 'prod-' + Date.now(),
    data: productData,
    created_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  invalidateCache();
  return { id: data.id, created_at: data.created_at, ...data.data };
}

export async function updateProduct(id, productData) {
  const { data, error } = await supabase
    .from('products')
    .update({ data: productData })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  invalidateCache();
  return { id: data.id, created_at: data.created_at, ...data.data };
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
  invalidateCache();
}

// ==================== SITE SETTINGS ====================
export async function getSiteSettings(key) {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();
    if (error) throw error;
    return data?.data || null;
  } catch (err) {
    console.warn(`getSiteSettings notice for ${key}:`, err?.message || err);
    return null;
  }
}

export async function updateSiteSettings(key, value) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ id: key, data: value, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data?.data || value;
}

// ==================== ORDERS ====================
export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
