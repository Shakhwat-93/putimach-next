import { NextResponse } from 'next/server';
import { getDiscountByCode, getAutomaticDiscounts } from '@/lib/discounts/db';
import { evaluateDiscount, findBestAutomaticDiscount } from '@/lib/discounts/engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, items = [], customer = {} } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Cart is empty.',
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: 0,
        final_subtotal: 0
      });
    }

    // Scenario A: Manual coupon code validation
    if (code && typeof code === 'string' && code.trim()) {
      const cleanCode = code.trim().toUpperCase();
      const discount = await getDiscountByCode(cleanCode);

      if (!discount) {
        return NextResponse.json({
          valid: false,
          error: `Discount code "${cleanCode}" is invalid.`,
          discount_amount: 0,
          free_shipping: false,
          item_allocations: [],
          subtotal: 0,
          final_subtotal: 0
        });
      }

      const evaluation = await evaluateDiscount(discount, items, customer);
      return NextResponse.json(evaluation);
    }

    // Scenario B: Automatic discount check
    const automaticDiscounts = await getAutomaticDiscounts();
    if (automaticDiscounts.length > 0) {
      const bestAuto = await findBestAutomaticDiscount(items, customer, automaticDiscounts);
      if (bestAuto) {
        return NextResponse.json(bestAuto);
      }
    }

    // No coupon code and no automatic discount qualified
    const subtotal = items.reduce((s: number, i: any) => s + (Number(i.product?.price) || 0) * (Number(i.quantity) || 1), 0);
    return NextResponse.json({
      valid: false,
      discount_amount: 0,
      free_shipping: false,
      item_allocations: [],
      subtotal,
      final_subtotal: subtotal
    });

  } catch (err: any) {
    console.error('Discount validation error:', err);
    return NextResponse.json(
      { valid: false, error: 'Failed to evaluate discount: ' + (err?.message || 'Server error') },
      { status: 500 }
    );
  }
}
