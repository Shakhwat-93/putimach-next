// @ts-nocheck
import { 
  Discount, 
  CartItemForDiscount, 
  DiscountCustomerContext, 
  DiscountEvaluationResult, 
  DiscountItemAllocation 
} from './types';
import { getCustomerUsageCount } from './db';

/**
 * Check if a product item matches a discount target definition
 */
export function isItemMatchingTarget(item: CartItemForDiscount, target?: { type: string; ids: string[] }): boolean {
  if (!target || target.type === 'all') return true;

  const targetIds = (target.ids || []).map(id => String(id).trim().toLowerCase());
  if (targetIds.length === 0) return true;

  const productId = String(item.product?.id || '').trim().toLowerCase();
  const productSlug = String(item.product?.slug || '').trim().toLowerCase();
  const category = String(item.product?.category || '').trim().toLowerCase();
  const collections = Array.isArray(item.product?.collections)
    ? item.product.collections.map(c => String(c).trim().toLowerCase())
    : [];

  // Match variants by SKU if specified
  const size = String(item.size || '').trim().toLowerCase();
  const color = String(item.color || '').trim().toLowerCase();
  const variantSkus = Array.isArray(item.product?.variants)
    ? item.product.variants
        .filter(v => (!v.size || v.size.toLowerCase() === size) && (!v.color || v.color.toLowerCase() === color))
        .map(v => String(v.sku || '').trim().toLowerCase())
    : [];

  switch (target.type) {
    case 'specific_products':
      return targetIds.includes(productId) || targetIds.includes(productSlug);

    case 'specific_categories':
      return targetIds.includes(category);

    case 'specific_collections':
      return collections.some(col => targetIds.includes(col));

    case 'specific_variants':
      return variantSkus.some(sku => targetIds.includes(sku)) || targetIds.includes(`${productSlug}-${color}-${size}`);

    default:
      return true;
  }
}

/**
 * Evaluates a single discount rule against a cart
 */
export async function evaluateDiscount(
  discount: Discount,
  cartItems: CartItemForDiscount[],
  customerContext: DiscountCustomerContext = {}
): Promise<DiscountEvaluationResult> {
  const now = new Date();

  // Basic validation of inputs
  if (!discount || !Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      valid: false,
      error: 'Cart is empty or discount is invalid.',
      discount_amount: 0,
      free_shipping: false,
      item_allocations: [],
      subtotal: 0,
      final_subtotal: 0
    };
  }

  // Calculate cart metrics
  const totalCartSubtotal = cartItems.reduce((sum, item) => sum + (Number(item.product?.price) || 0) * (Number(item.quantity) || 1), 0);
  const totalCartQuantity = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // 1. Status Check
  if (discount.status === 'disabled' || discount.status === 'draft') {
    return {
      valid: false,
      error: 'This discount code is currently inactive.',
      discount_amount: 0,
      free_shipping: false,
      item_allocations: [],
      subtotal: totalCartSubtotal,
      final_subtotal: totalCartSubtotal
    };
  }

  // 2. Schedule Check
  if (discount.start_date) {
    const startDate = new Date(discount.start_date);
    if (now < startDate) {
      const formattedStart = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return {
        valid: false,
        error: `This promotion starts on ${formattedStart}.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }
  }

  if (discount.end_date) {
    const endDate = new Date(discount.end_date);
    if (now > endDate) {
      return {
        valid: false,
        error: 'This discount code has expired.',
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }
  }

  // 3. Total Usage Limit Check
  if (discount.total_usage_limit && discount.total_usage_limit > 0) {
    if ((discount.usage_count || 0) >= discount.total_usage_limit) {
      return {
        valid: false,
        error: 'This discount has reached its maximum total usage limit.',
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }
  }

  // 4. Customer Eligibility & Per-Customer Usage Check
  const customerIdentifier = customerContext.phone || customerContext.email;
  if (discount.customer_eligibility === 'specific_customers' && Array.isArray(discount.eligible_customer_ids)) {
    const cleanIds = discount.eligible_customer_ids.map(id => id.trim().toLowerCase());
    const isMatched = (customerContext.email && cleanIds.includes(customerContext.email.trim().toLowerCase())) ||
                      (customerContext.phone && cleanIds.includes(customerContext.phone.trim().toLowerCase()));
    if (!isMatched) {
      return {
        valid: false,
        error: 'This discount is exclusive to eligible customer accounts.',
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }
  }

  if (discount.customer_eligibility === 'registered' && customerContext.is_guest) {
    return {
      valid: false,
      error: 'Please log in to your account to use this promotion.',
      discount_amount: 0,
      free_shipping: false,
      item_allocations: [],
      subtotal: totalCartSubtotal,
      final_subtotal: totalCartSubtotal
    };
  }

  if (discount.per_customer_usage_limit && discount.per_customer_usage_limit > 0 && customerIdentifier) {
    try {
      const usedCount = await getCustomerUsageCount(discount.id, customerIdentifier);
      if (usedCount >= discount.per_customer_usage_limit) {
        return {
          valid: false,
          error: 'You have already reached the maximum usage limit for this coupon.',
          discount_amount: 0,
          free_shipping: false,
          item_allocations: [],
          subtotal: totalCartSubtotal,
          final_subtotal: totalCartSubtotal
        };
      }
    } catch (_) {}
  }

  // 5. Evaluate Specific Discount Types
  let calculatedDiscount = 0;
  let freeShipping = false;
  const allocations: DiscountItemAllocation[] = [];

  // TYPE A: AMOUNT OFF PRODUCTS
  if (discount.type === 'amount_off_products') {
    const qualifyingItems = cartItems.filter(item => isItemMatchingTarget(item, discount.target));

    if (qualifyingItems.length === 0) {
      return {
        valid: false,
        error: 'This discount does not apply to any items in your cart.',
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    const qualifyingSubtotal = qualifyingItems.reduce((s, i) => s + (Number(i.product?.price) || 0) * (Number(i.quantity) || 1), 0);
    const qualifyingQty = qualifyingItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

    // Minimum requirement
    if (discount.min_requirement_type === 'min_amount' && qualifyingSubtotal < (discount.min_requirement_value || 0)) {
      const diff = (discount.min_requirement_value || 0) - qualifyingSubtotal;
      return {
        valid: false,
        error: `Add ৳${diff.toLocaleString()} more of eligible items to qualify.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    if (discount.min_requirement_type === 'min_quantity' && qualifyingQty < (discount.min_requirement_value || 0)) {
      const diff = (discount.min_requirement_value || 0) - qualifyingQty;
      return {
        valid: false,
        error: `Add ${diff} more eligible ${diff === 1 ? 'item' : 'items'} to qualify.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    // Calculate product discount
    const isPercentage = discount.value_type === 'percentage';
    const rate = Number(discount.value) || 0;

    for (const item of qualifyingItems) {
      const itemUnitPrice = Number(item.product?.price) || 0;
      const qty = Number(item.quantity) || 1;
      let itemDiscount = 0;

      if (isPercentage) {
        itemDiscount = Math.round((itemUnitPrice * (rate / 100)) * qty);
      } else {
        // Fixed amount per item
        itemDiscount = Math.min(itemUnitPrice * qty, rate * qty);
      }

      calculatedDiscount += itemDiscount;
      allocations.push({
        item_key: item.key,
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.size,
        color: item.color,
        quantity_discounted: qty,
        original_unit_price: itemUnitPrice,
        discounted_unit_price: Math.max(0, itemUnitPrice - (itemDiscount / qty)),
        total_discount: itemDiscount
      });
    }
  }

  // TYPE B: BUY X GET Y (BXGY)
  else if (discount.type === 'buy_x_get_y' && discount.bxgy_rule) {
    const { customer_buys, customer_gets, max_applications_per_order } = discount.bxgy_rule;

    // Check if buy target and get target are identical or overlapping (e.g. BOGO on all products or same category)
    const isSameTarget = (!customer_buys.target || customer_buys.target.type === 'all') &&
                         (!customer_gets.target || customer_gets.target.type === 'all');

    const buyItems = cartItems.filter(item => isItemMatchingTarget(item, customer_buys.target));
    const totalBuyQty = buyItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
    const totalBuySubtotal = buyItems.reduce((s, i) => s + (Number(i.product?.price) || 0) * (Number(i.quantity) || 1), 0);

    const requiredBuyThreshold = Number(customer_buys.value) || 1;
    const requiredGetQty = Number(customer_gets.quantity) || 1;
    let applicationsCount = 0;

    if (isSameTarget && customer_buys.type === 'quantity') {
      const bundleSize = requiredBuyThreshold + requiredGetQty;
      if (totalBuyQty < bundleSize) {
        const diff = bundleSize - totalBuyQty;
        return {
          valid: false,
          error: `Add ${diff} more ${diff === 1 ? 'item' : 'items'} to qualify for Buy ${requiredBuyThreshold} Get ${requiredGetQty}.`,
          discount_amount: 0,
          free_shipping: false,
          item_allocations: [],
          subtotal: totalCartSubtotal,
          final_subtotal: totalCartSubtotal
        };
      }
      applicationsCount = Math.floor(totalBuyQty / bundleSize);
    } else if (customer_buys.type === 'amount') {
      if (totalBuySubtotal < requiredBuyThreshold) {
        const diff = requiredBuyThreshold - totalBuySubtotal;
        return {
          valid: false,
          error: `Add ৳${diff.toLocaleString()} more of qualifying items for Buy X Get Y.`,
          discount_amount: 0,
          free_shipping: false,
          item_allocations: [],
          subtotal: totalCartSubtotal,
          final_subtotal: totalCartSubtotal
        };
      }
      applicationsCount = Math.floor(totalBuySubtotal / requiredBuyThreshold);
    } else {
      if (totalBuyQty < requiredBuyThreshold) {
        const diff = requiredBuyThreshold - totalBuyQty;
        return {
          valid: false,
          error: `Add ${diff} more qualifying ${diff === 1 ? 'item' : 'items'} to unlock promotion.`,
          discount_amount: 0,
          free_shipping: false,
          item_allocations: [],
          subtotal: totalCartSubtotal,
          final_subtotal: totalCartSubtotal
        };
      }
      applicationsCount = Math.floor(totalBuyQty / requiredBuyThreshold);
    }

    if (max_applications_per_order && max_applications_per_order > 0) {
      applicationsCount = Math.min(applicationsCount, max_applications_per_order);
    }

    // 2. Qualifying "Gets" in cart
    const getItems = cartItems.filter(item => isItemMatchingTarget(item, customer_gets.target));
    const totalGetQty = getItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

    if (getItems.length === 0 || totalGetQty === 0) {
      return {
        valid: false,
        error: `You qualify! Please add the reward item to your cart to receive the promotion.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    // Calculate maximum rewardable units
    const unitsToReward = isSameTarget && customer_buys.type === 'quantity'
      ? applicationsCount * requiredGetQty
      : Math.min(totalGetQty, applicationsCount * requiredGetQty);
    let unitsLeftToReward = unitsToReward;

    // Apply reward starting from cheapest matching items first for fair e-commerce logic
    const sortedGetItems = [...getItems].sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0));

    for (const item of sortedGetItems) {
      if (unitsLeftToReward <= 0) break;
      const itemUnitPrice = Number(item.product?.price) || 0;
      const qtyAvailable = Number(item.quantity) || 1;
      const rewardQtyOnItem = Math.min(qtyAvailable, unitsLeftToReward);

      let itemDiscount = 0;
      if (customer_gets.reward_type === 'free') {
        itemDiscount = itemUnitPrice * rewardQtyOnItem;
      } else if (customer_gets.reward_type === 'percentage') {
        const pct = Number(customer_gets.reward_value) || 100;
        itemDiscount = Math.round(itemUnitPrice * (pct / 100) * rewardQtyOnItem);
      } else {
        const fix = Number(customer_gets.reward_value) || itemUnitPrice;
        itemDiscount = Math.min(itemUnitPrice * rewardQtyOnItem, fix * rewardQtyOnItem);
      }

      calculatedDiscount += itemDiscount;
      unitsLeftToReward -= rewardQtyOnItem;

      allocations.push({
        item_key: item.key,
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.size,
        color: item.color,
        quantity_discounted: rewardQtyOnItem,
        original_unit_price: itemUnitPrice,
        discounted_unit_price: Math.max(0, itemUnitPrice - (itemDiscount / rewardQtyOnItem)),
        total_discount: itemDiscount
      });
    }
  }

  // TYPE C: AMOUNT OFF ORDER
  else if (discount.type === 'amount_off_order') {
    // Check minimum requirement
    if (discount.min_requirement_type === 'min_amount' && totalCartSubtotal < (discount.min_requirement_value || 0)) {
      const diff = (discount.min_requirement_value || 0) - totalCartSubtotal;
      return {
        valid: false,
        error: `Add ৳${diff.toLocaleString()} more to your order to apply this discount.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    if (discount.min_requirement_type === 'min_quantity' && totalCartQuantity < (discount.min_requirement_value || 0)) {
      const diff = (discount.min_requirement_value || 0) - totalCartQuantity;
      return {
        valid: false,
        error: `Add ${diff} more ${diff === 1 ? 'item' : 'items'} to qualify for order discount.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    const isPercentage = discount.value_type === 'percentage';
    const rate = Number(discount.value) || 0;

    if (isPercentage) {
      calculatedDiscount = Math.round(totalCartSubtotal * (rate / 100));
    } else {
      calculatedDiscount = Math.min(totalCartSubtotal, rate);
    }
  }

  // TYPE D: FREE SHIPPING
  else if (discount.type === 'free_shipping') {
    // Check minimum requirement
    if (discount.min_requirement_type === 'min_amount' && totalCartSubtotal < (discount.min_requirement_value || 0)) {
      const diff = (discount.min_requirement_value || 0) - totalCartSubtotal;
      return {
        valid: false,
        error: `Add ৳${diff.toLocaleString()} more to qualify for Free Shipping.`,
        discount_amount: 0,
        free_shipping: false,
        item_allocations: [],
        subtotal: totalCartSubtotal,
        final_subtotal: totalCartSubtotal
      };
    }

    freeShipping = true;
  }

  // Safety caps: discount cannot exceed cart subtotal
  calculatedDiscount = Math.min(totalCartSubtotal, Math.max(0, calculatedDiscount));
  const finalSubtotal = Math.max(0, totalCartSubtotal - calculatedDiscount);

  // Generate friendly savings message
  let savingsMsg = '';
  if (calculatedDiscount > 0) {
    savingsMsg = `Saved ৳${calculatedDiscount.toLocaleString()}`;
  }
  if (freeShipping) {
    savingsMsg = savingsMsg ? `${savingsMsg} + Free Delivery` : 'Free Delivery applied';
  }

  return {
    valid: true,
    discount,
    discount_code: discount.code || undefined,
    discount_title: discount.title,
    discount_type: discount.type,
    discount_amount: calculatedDiscount,
    free_shipping: freeShipping,
    item_allocations: allocations,
    subtotal: totalCartSubtotal,
    final_subtotal: finalSubtotal,
    savings_message: savingsMsg
  };
}

/**
 * Automatically evaluates all active automatic discounts and selects the best promotion
 */
export async function findBestAutomaticDiscount(
  cartItems: CartItemForDiscount[],
  customerContext: DiscountCustomerContext = {},
  availableAutomaticDiscounts: Discount[] = []
): Promise<DiscountEvaluationResult | null> {
  if (!availableAutomaticDiscounts || availableAutomaticDiscounts.length === 0 || !cartItems || cartItems.length === 0) {
    return null;
  }

  const results: DiscountEvaluationResult[] = [];

  for (const disc of availableAutomaticDiscounts) {
    try {
      const res = await evaluateDiscount(disc, cartItems, customerContext);
      if (res.valid && (res.discount_amount > 0 || res.free_shipping)) {
        results.push({ ...res, qualifies_automatically: true });
      }
    } catch (_) {}
  }

  if (results.length === 0) return null;

  // Deterministic selection: Pick highest monetary discount, or free shipping
  results.sort((a, b) => {
    if (b.discount_amount !== a.discount_amount) {
      return b.discount_amount - a.discount_amount;
    }
    if (b.free_shipping && !a.free_shipping) return 1;
    if (a.free_shipping && !b.free_shipping) return -1;
    return 0;
  });

  return results[0];
}
