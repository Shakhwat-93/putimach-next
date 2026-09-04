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
    const [prodRes, invRes] = await Promise.all([
      supabase.from('cb_products').select('id, data, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('inventory').select('*').limit(500)
    ]);

    const data = prodRes.data || [];
    const inventoryList = invRes.data || [];

    // Build inventory lookup helpers
    const invByProdId = new Map();
    const invById = new Map();
    const invBySku = new Map();
    const invByName = new Map();

    inventoryList.forEach(item => {
      if (item.product_id) invByProdId.set(String(item.product_id).trim().toLowerCase(), item);
      if (item.id) invById.set(String(item.id).trim(), item);
      if (item.sku) invBySku.set(String(item.sku).trim().toLowerCase(), item);
      if (item.name) invByName.set(String(item.name).trim().toLowerCase(), item);
    });

    let list = data.map(row => {
      const pData = row.data || {};
      const prodId = String(row.id || '').trim().toLowerCase();
      const prodSlug = String(pData.slug || row.id || '').trim().toLowerCase();
      const prodSku = String(pData.sku || '').trim().toLowerCase();
      const prodName = String(pData.name || '').trim().toLowerCase();
      const pInvId = String(pData.inventory_id || '').trim();

      // Find matching inventory
      let matchedInv = null;
      if (pInvId && invById.has(pInvId)) matchedInv = invById.get(pInvId);
      else if (prodId && invByProdId.has(prodId)) matchedInv = invByProdId.get(prodId);
      else if (prodSlug && invByProdId.has(prodSlug)) matchedInv = invByProdId.get(prodSlug);
      else if (prodSku && invBySku.has(prodSku)) matchedInv = invBySku.get(prodSku);
      else if (prodName && invByName.has(prodName)) matchedInv = invByName.get(prodName);

      const raw = {
        id: row.id,
        created_at: row.created_at,
        slug: row.data?.slug || row.id,
        ...(row.data || {}),
        inventory: matchedInv || null,
        inventory_id: matchedInv?.id || pData.inventory_id || null,
        stock: matchedInv !== null && matchedInv.current_stock !== undefined ? Number(matchedInv.current_stock) : pData.stock,
      };

      return normalizeProduct(raw);
    }).filter(Boolean);

    productsCache = { data: list, time: Date.now() };

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
      const cbRes = await supabase
        .from('cb_products')
        .select('id, data, created_at')
        .or(`id.eq.${slug},data->>slug.eq.${slug}`)
        .maybeSingle();
      if (cbRes?.data) {
        data = cbRes.data;
      }
    }

    if (!data) {
      const fallback = (fallbackProducts || []).find(
        p => String(p.id).toLowerCase() === String(slug).toLowerCase() || String(p.slug).toLowerCase() === String(slug).toLowerCase()
      );
      return fallback ? normalizeProduct(fallback) : null;
    }

    const pData = data.data || {};
    const prodId = String(data.id || '').trim();
    const pInvId = String(pData.inventory_id || '').trim();
    const prodSku = String(pData.sku || '').trim();

    // Fetch authoritative inventory record
    let matchedInv = null;
    if (pInvId) {
      const { data: inv } = await supabase.from('inventory').select('*').eq('id', pInvId).maybeSingle();
      if (inv) matchedInv = inv;
    }
    if (!matchedInv && prodId) {
      const { data: inv } = await supabase.from('inventory').select('*').eq('product_id', prodId).maybeSingle();
      if (inv) matchedInv = inv;
    }
    if (!matchedInv && prodSku) {
      const { data: inv } = await supabase.from('inventory').select('*').ilike('sku', prodSku).maybeSingle();
      if (inv) matchedInv = inv;
    }

    const raw = {
      id: data.id,
      created_at: data.created_at,
      slug: data.data?.slug || data.id,
      ...pData,
      inventory: matchedInv || null,
      inventory_id: matchedInv?.id || pData.inventory_id || null,
      stock: matchedInv !== null && matchedInv.current_stock !== undefined ? Number(matchedInv.current_stock) : pData.stock,
    };

    return normalizeProduct(raw);
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
  const { data: oldData } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (oldData) {
    try {
      const adminApi = (await import('../admin/lib/api')).default;
      if (adminApi && typeof adminApi.adjustOrderStock === 'function') {
        await adminApi.adjustOrderStock(id, oldData.status, status, 'System');
      }
    } catch (e) {
      console.warn('Stock adjustment notice:', e);
    }
  }

  invalidateCache();
  return data;
}
