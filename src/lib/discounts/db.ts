// @ts-nocheck
import { supabase } from '../supabase';
import { Discount } from './types';

const DISCOUNTS_KEY = 'store_discounts';
const USAGES_KEY = 'discount_usages';

/**
 * Fetch all discounts from Supabase site_settings repository
 */
export async function getDiscounts(): Promise<Discount[]> {
  try {
    let rawData = null;
    const { data: sData, error: sErr } = await supabase
      .from('site_settings')
      .select('data')
      .eq('id', DISCOUNTS_KEY)
      .maybeSingle();

    if (sData?.data) {
      rawData = sData.data;
    } else {
      const { data: cData } = await supabase
        .from('cb_settings')
        .select('data')
        .eq('id', DISCOUNTS_KEY)
        .maybeSingle();
      rawData = cData?.data;
    }

    if (Array.isArray(rawData)) {
      return rawData;
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch discounts:', err);
    return [];
  }
}

/**
 * Fetch a single discount by ID
 */
export async function getDiscountById(id: string): Promise<Discount | null> {
  const discounts = await getDiscounts();
  return discounts.find(d => d.id === id) || null;
}

/**
 * Fetch a discount by coupon code (case-insensitive)
 */
export async function getDiscountByCode(code: string): Promise<Discount | null> {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  const discounts = await getDiscounts();
  return discounts.find(d => d.method === 'code' && d.code?.trim().toUpperCase() === cleanCode) || null;
}

/**
 * Fetch all active automatic discounts
 */
export async function getAutomaticDiscounts(): Promise<Discount[]> {
  const discounts = await getDiscounts();
  return discounts.filter(d => d.method === 'automatic' && d.status === 'active');
}

/**
 * Save or update a discount
 */
export async function saveDiscount(discount: Discount): Promise<Discount> {
  const discounts = await getDiscounts();
  const index = discounts.findIndex(d => d.id === discount.id);
  
  const now = new Date().toISOString();
  const updatedDiscount: Discount = {
    ...discount,
    updated_at: now,
    created_at: discount.created_at || now,
    usage_count: discount.usage_count || 0
  };

  let updatedList: Discount[];
  if (index >= 0) {
    updatedList = [...discounts];
    updatedList[index] = updatedDiscount;
  } else {
    updatedList = [updatedDiscount, ...discounts];
  }

  // Persist to site_settings and cb_settings
  try {
    const { error: sErr } = await supabase
      .from('site_settings')
      .upsert({
        id: DISCOUNTS_KEY,
        data: updatedList,
        updated_at: now
      });

    if (sErr) throw sErr;

    try {
      await supabase
        .from('cb_settings')
        .upsert({
          id: DISCOUNTS_KEY,
          data: updatedList
        });
    } catch (_) {}

    return updatedDiscount;
  } catch (err) {
    console.error('Failed to save discount:', err);
    throw err;
  }
}

/**
 * Delete a discount by ID
 */
export async function deleteDiscount(id: string): Promise<boolean> {
  const discounts = await getDiscounts();
  const updatedList = discounts.filter(d => d.id !== id);

  try {
    const now = new Date().toISOString();
    await supabase
      .from('site_settings')
      .upsert({
        id: DISCOUNTS_KEY,
        data: updatedList,
        updated_at: now
      });

    try {
      await supabase
        .from('cb_settings')
        .upsert({
          id: DISCOUNTS_KEY,
          data: updatedList
        });
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('Failed to delete discount:', err);
    return false;
  }
}

/**
 * Fetch all usage records
 */
export async function getDiscountUsages(): Promise<Array<{ discount_id: string; customer_key: string; order_id: string; used_at: string }>> {
  try {
    const { data: sData } = await supabase
      .from('site_settings')
      .select('data')
      .eq('id', USAGES_KEY)
      .maybeSingle();

    if (Array.isArray(sData?.data)) {
      return sData.data;
    }
    return [];
  } catch (err) {
    console.warn('Failed to load discount usages:', err);
    return [];
  }
}

/**
 * Check how many times a specific customer (by email or phone) has used a discount
 */
export async function getCustomerUsageCount(discountId: string, customerIdentifier?: string): Promise<number> {
  if (!customerIdentifier) return 0;
  const usages = await getDiscountUsages();
  const cleanKey = customerIdentifier.trim().toLowerCase();
  return usages.filter(u => u.discount_id === discountId && u.customer_key.toLowerCase() === cleanKey).length;
}

/**
 * Record a discount usage atomically on order creation
 */
export async function recordDiscountUsage(discountId: string, customerIdentifier: string, orderId: string): Promise<void> {
  try {
    const [discounts, usages] = await Promise.all([
      getDiscounts(),
      getDiscountUsages()
    ]);

    // 1. Increment usage count in discount object
    const targetIdx = discounts.findIndex(d => d.id === discountId);
    if (targetIdx >= 0) {
      discounts[targetIdx] = {
        ...discounts[targetIdx],
        usage_count: (discounts[targetIdx].usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      };

      await supabase.from('site_settings').upsert({
        id: DISCOUNTS_KEY,
        data: discounts,
        updated_at: new Date().toISOString()
      });
    }

    // 2. Append usage record
    const newUsage = {
      discount_id: discountId,
      customer_key: (customerIdentifier || 'guest').trim().toLowerCase(),
      order_id: orderId,
      used_at: new Date().toISOString()
    };

    const updatedUsages = [newUsage, ...usages];
    await supabase.from('site_settings').upsert({
      id: USAGES_KEY,
      data: updatedUsages,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to record discount usage:', err);
  }
}
