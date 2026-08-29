// @ts-nocheck
import { supabase } from '../supabase';
import { getOrCreateCartSessionId } from '../cart/persistence';

const CHECKOUT_SESSION_KEY = 'putimach_checkout_session_id';
const ABANDON_THRESHOLD_MINUTES = 30;

export interface IncompleteCheckoutRecord {
  id: string;
  checkout_session_id: string;
  cart_session_id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  shipping_address?: string | null;
  city?: string | null;
  area?: string | null;
  cart_snapshot: any[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  estimated_total: number;
  status: 'IN_PROGRESS' | 'ABANDONED' | 'CONVERTED' | 'EXPIRED';
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  converted_order_id?: string | null;
}

/**
 * Get or generate a unique checkout session ID for the current attempt
 */
export function getOrCreateCheckoutSessionId(): string {
  if (typeof window === 'undefined') return 'chk_ssr';
  try {
    let sid = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    if (!sid) {
      const now = Date.now().toString(36);
      const rand = Math.random().toString(36).substring(2, 10);
      sid = `chk_${now}_${rand}`;
      sessionStorage.setItem(CHECKOUT_SESSION_KEY, sid);
    }
    return sid;
  } catch (e) {
    return `chk_${Date.now()}`;
  }
}

/**
 * Reset checkout session ID (e.g. after successful order completion)
 */
export function resetCheckoutSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
  } catch (e) {}
}

/**
 * Check if the checkout state contains meaningful information to track
 */
export function hasMeaningfulCheckoutInfo(form: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}): boolean {
  const name = String(form?.name || '').trim();
  const phone = String(form?.phone || '').trim();
  const email = String(form?.email || '').trim();
  const address = String(form?.address || '').trim();
  const city = String(form?.city || '').trim();

  // Track if phone has >= 4 digits OR name has >= 2 letters OR address has >= 4 characters OR email has @ OR city specified
  return phone.length >= 4 || name.length >= 2 || address.length >= 4 || email.includes('@') || city.length >= 3;
}

let isTableAvailable: boolean | null = true;

/**
 * Save or update incomplete checkout record in Supabase
 */
export async function trackIncompleteCheckout(params: {
  checkout_session_id: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address?: string;
  city?: string;
  area?: string;
  items: any[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  estimated_total: number;
}): Promise<void> {
  if (isTableAvailable === false) return;

  const {
    checkout_session_id,
    customer_id = null,
    customer_name = '',
    customer_phone = '',
    customer_email = '',
    shipping_address = '',
    city = '',
    area = '',
    items = [],
    subtotal = 0,
    discount = 0,
    shipping_cost = 0,
    estimated_total = 0
  } = params;

  if (!hasMeaningfulCheckoutInfo({ name: customer_name, phone: customer_phone, email: customer_email, address: shipping_address, city })) {
    return;
  }

  const cartSessionId = getOrCreateCartSessionId();

  // Create lightweight snapshot with full variant details (color, size, price, quantity)
  const cartSnapshot = items.map(i => ({
    id: i.product?.id || i.id,
    name: i.product?.name || i.name,
    slug: i.product?.slug || i.slug,
    image: i.product?.image || (i.product?.images && i.product.images[0]) || i.image,
    price: Number(i.product?.price ?? i.price ?? 0),
    size: i.size || 'Default',
    color: i.color || null,
    quantity: Number(i.quantity || 1),
    line_total: Number(i.product?.price ?? i.price ?? 0) * Number(i.quantity || 1)
  }));

  const payload: Partial<IncompleteCheckoutRecord> = {
    id: checkout_session_id,
    checkout_session_id,
    cart_session_id: cartSessionId,
    customer_id,
    customer_name: customer_name.trim() || null,
    customer_phone: customer_phone.trim() || null,
    customer_email: customer_email.trim() || null,
    shipping_address: shipping_address.trim() || null,
    city: city.trim() || null,
    area: area.trim() || null,
    cart_snapshot: cartSnapshot,
    subtotal,
    discount,
    shipping_cost,
    estimated_total,
    status: 'IN_PROGRESS',
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('incomplete_checkouts')
      .upsert(payload, { onConflict: 'checkout_session_id' });

    if (error) {
      if (
        error.code === 'PGRST204' || 
        error.code === 'PGRST205' || 
        error.code === '42P01' || 
        error.message?.includes('not found') || 
        error.message?.includes('does not exist')
      ) {
        isTableAvailable = false;
      }
    } else {
      isTableAvailable = true;
    }
  } catch (err) {
    // Keep resilient
  }
}

/**
 * Mark incomplete checkout as CONVERTED when order is successfully placed
 */
export async function convertIncompleteCheckout(checkout_session_id: string, order_id: string): Promise<void> {
  if (!checkout_session_id || isTableAvailable === false) return;

  try {
    const { error } = await supabase
      .from('incomplete_checkouts')
      .update({
        status: 'CONVERTED',
        converted_order_id: order_id,
        updated_at: new Date().toISOString()
      })
      .eq('checkout_session_id', checkout_session_id);

    if (error) {
      if (
        error.code === 'PGRST204' || 
        error.code === 'PGRST205' || 
        error.code === '42P01' || 
        error.message?.includes('not found') || 
        error.message?.includes('does not exist')
      ) {
        isTableAvailable = false;
      }
    }
  } catch (err) {
    isTableAvailable = false;
  } finally {
    resetCheckoutSessionId();
  }
}

/**
 * Fetch incomplete checkouts for Admin Board
 */
export async function getIncompleteCheckouts(options: {
  status?: string;
  searchQuery?: string;
  limit?: number;
} = {}): Promise<IncompleteCheckoutRecord[]> {
  if (isTableAvailable === false) return [];

  try {
    let query = supabase
      .from('incomplete_checkouts')
      .select('*')
      .order('last_activity_at', { ascending: false })
      .limit(options.limit || 100);

    if (options.status && options.status !== 'ALL') {
      if (options.status === 'ABANDONED') {
        // Either explicitly marked ABANDONED or IN_PROGRESS with activity older than 30 mins
        const threshold = new Date(Date.now() - ABANDON_THRESHOLD_MINUTES * 60 * 1000).toISOString();
        query = query.or(`status.eq.ABANDONED,and(status.eq.IN_PROGRESS,last_activity_at.lt.${threshold})`);
      } else if (options.status === 'IN_PROGRESS') {
        const threshold = new Date(Date.now() - ABANDON_THRESHOLD_MINUTES * 60 * 1000).toISOString();
        query = query.eq('status', 'IN_PROGRESS').gte('last_activity_at', threshold);
      } else {
        query = query.eq('status', options.status);
      }
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = `%${options.searchQuery.trim()}%`;
      query = query.or(`customer_name.ilike.${q},customer_phone.ilike.${q},customer_email.ilike.${q},checkout_session_id.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      if (
        error.code === 'PGRST204' || 
        error.code === 'PGRST205' || 
        error.code === '42P01' || 
        error.message?.includes('not found') || 
        error.message?.includes('does not exist')
      ) {
        isTableAvailable = false;
        return [];
      }
      throw error;
    }

    if (!Array.isArray(data)) return [];

    // Dynamically evaluate abandoned status for any stale in_progress rows
    const now = Date.now();
    const thresholdMs = ABANDON_THRESHOLD_MINUTES * 60 * 1000;

    return data.map(item => {
      let computedStatus = item.status;
      if (item.status === 'IN_PROGRESS') {
        const lastAct = new Date(item.last_activity_at || item.created_at).getTime();
        if (now - lastAct > thresholdMs) {
          computedStatus = 'ABANDONED';
        }
      }
      return {
        ...item,
        status: computedStatus
      };
    });
  } catch (err: any) {
    if (
      err?.code === 'PGRST204' || 
      err?.code === 'PGRST205' || 
      err?.code === '42P01' || 
      err?.message?.includes('not found') || 
      err?.message?.includes('does not exist')
    ) {
      isTableAvailable = false;
    } else {
      console.warn('Incomplete checkouts fetch notice:', err?.message || err);
    }
    return [];
  }
}
