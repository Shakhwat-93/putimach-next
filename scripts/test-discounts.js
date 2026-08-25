// scripts/test-discounts.js
const assert = require('assert');

// Pure engine logic simulation for test runner
function isItemMatchingTarget(item, target) {
  if (!target || target.type === 'all') return true;
  const targetIds = (target.ids || []).map(id => String(id).trim().toLowerCase());
  if (targetIds.length === 0) return true;

  const productId = String(item.product?.id || '').trim().toLowerCase();
  const productSlug = String(item.product?.slug || '').trim().toLowerCase();
  const category = String(item.product?.category || '').trim().toLowerCase();
  const collections = Array.isArray(item.product?.collections)
    ? item.product.collections.map(c => String(c).trim().toLowerCase())
    : [];

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

function evaluateDiscount(discount, cartItems, customerContext = {}, mockUsages = {}) {
  const now = new Date();
  if (!discount || !Array.isArray(cartItems) || cartItems.length === 0) {
    return { valid: false, error: 'Cart is empty or discount is invalid.', discount_amount: 0, free_shipping: false, subtotal: 0 };
  }

  const totalCartSubtotal = cartItems.reduce((sum, item) => sum + (Number(item.product?.price) || 0) * (Number(item.quantity) || 1), 0);
  const totalCartQuantity = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  if (discount.status === 'disabled' || discount.status === 'draft') {
    return { valid: false, error: 'This discount is currently inactive.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
  }

  if (discount.start_date && now < new Date(discount.start_date)) {
    return { valid: false, error: 'This promotion is scheduled for the future.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
  }

  if (discount.end_date && now > new Date(discount.end_date)) {
    return { valid: false, error: 'This discount code has expired.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
  }

  if (discount.total_usage_limit && (discount.usage_count || 0) >= discount.total_usage_limit) {
    return { valid: false, error: 'This discount has reached its maximum total usage limit.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
  }

  const customerId = customerContext.phone || customerContext.email;
  if (discount.customer_eligibility === 'registered' && customerContext.is_guest) {
    return { valid: false, error: 'Please log in to your account to use this promotion.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
  }

  if (discount.per_customer_usage_limit && customerId) {
    const customerUsed = mockUsages[discount.id]?.[customerId] || 0;
    if (customerUsed >= discount.per_customer_usage_limit) {
      return { valid: false, error: 'You have already reached the maximum usage limit for this coupon.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }
  }

  let calculatedDiscount = 0;
  let freeShipping = false;

  if (discount.type === 'amount_off_products') {
    const qualifyingItems = cartItems.filter(item => isItemMatchingTarget(item, discount.target));
    if (qualifyingItems.length === 0) {
      return { valid: false, error: 'This discount does not apply to any items in your cart.', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }

    const qSub = qualifyingItems.reduce((s, i) => s + (i.product.price || 0) * (i.quantity || 1), 0);
    const qQty = qualifyingItems.reduce((s, i) => s + (i.quantity || 1), 0);

    if (discount.min_requirement_type === 'min_amount' && qSub < (discount.min_requirement_value || 0)) {
      return { valid: false, error: `Add more to qualify`, discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }
    if (discount.min_requirement_type === 'min_quantity' && qQty < (discount.min_requirement_value || 0)) {
      return { valid: false, error: `Add more items to qualify`, discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }

    const isPct = discount.value_type === 'percentage';
    const rate = Number(discount.value) || 0;

    for (const item of qualifyingItems) {
      const price = item.product.price || 0;
      const qty = item.quantity || 1;
      calculatedDiscount += isPct ? Math.round((price * (rate / 100)) * qty) : Math.min(price * qty, rate * qty);
    }
  } else if (discount.type === 'buy_x_get_y' && discount.bxgy_rule) {
    const { customer_buys, customer_gets, max_applications_per_order } = discount.bxgy_rule;
    const isSameTarget = (!customer_buys.target || customer_buys.target.type === 'all') &&
                         (!customer_gets.target || customer_gets.target.type === 'all');

    const buyItems = cartItems.filter(item => isItemMatchingTarget(item, customer_buys.target));
    const buyQty = buyItems.reduce((s, i) => s + (i.quantity || 1), 0);
    const buyThreshold = Number(customer_buys.value) || 1;
    const getQtyThreshold = Number(customer_gets.quantity) || 1;

    let apps = 0;
    if (isSameTarget && customer_buys.type === 'quantity') {
      const bundleSize = buyThreshold + getQtyThreshold;
      if (buyQty < bundleSize) {
        return { valid: false, error: 'Buy X requirement not met', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
      }
      apps = Math.floor(buyQty / bundleSize);
    } else {
      if (buyQty < buyThreshold) {
        return { valid: false, error: 'Buy X requirement not met', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
      }
      apps = Math.floor(buyQty / buyThreshold);
    }

    if (max_applications_per_order) apps = Math.min(apps, max_applications_per_order);

    const getItems = cartItems.filter(item => isItemMatchingTarget(item, customer_gets.target));
    const getQty = getItems.reduce((s, i) => s + (i.quantity || 1), 0);

    if (getQty === 0) {
      return { valid: false, error: 'Add reward item to cart', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }

    const unitsToReward = isSameTarget && customer_buys.type === 'quantity'
      ? apps * getQtyThreshold
      : Math.min(getQty, apps * getQtyThreshold);
    let left = unitsToReward;

    for (const item of getItems) {
      if (left <= 0) break;
      const applyQty = Math.min(item.quantity, left);
      const price = item.product.price;
      if (customer_gets.reward_type === 'free') {
        calculatedDiscount += price * applyQty;
      } else if (customer_gets.reward_type === 'percentage') {
        calculatedDiscount += Math.round(price * (customer_gets.reward_value / 100) * applyQty);
      } else {
        calculatedDiscount += Math.min(price * applyQty, customer_gets.reward_value * applyQty);
      }
      left -= applyQty;
    }
  } else if (discount.type === 'amount_off_order') {
    if (discount.min_requirement_type === 'min_amount' && totalCartSubtotal < (discount.min_requirement_value || 0)) {
      return { valid: false, error: 'Min order amount not met', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }
    if (discount.min_requirement_type === 'min_quantity' && totalCartQuantity < (discount.min_requirement_value || 0)) {
      return { valid: false, error: 'Min order quantity not met', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }

    const isPct = discount.value_type === 'percentage';
    const rate = Number(discount.value) || 0;
    calculatedDiscount = isPct ? Math.round(totalCartSubtotal * (rate / 100)) : Math.min(totalCartSubtotal, rate);
  } else if (discount.type === 'free_shipping') {
    if (discount.min_requirement_type === 'min_amount' && totalCartSubtotal < (discount.min_requirement_value || 0)) {
      return { valid: false, error: 'Min order amount for free shipping not met', discount_amount: 0, free_shipping: false, subtotal: totalCartSubtotal };
    }
    freeShipping = true;
  }

  return {
    valid: true,
    discount_amount: calculatedDiscount,
    free_shipping: freeShipping,
    subtotal: totalCartSubtotal,
    final_subtotal: Math.max(0, totalCartSubtotal - calculatedDiscount)
  };
}

console.log('--- RUNNING 28 DISCOUNT SYSTEM TEST SCENARIOS ---');

// Mock Data
const hoodie = { id: 'prod_hoodie', slug: 'hoodie', name: 'Heavyweight Hoodie', price: 1500, category: 'hoodies', collections: ['winter-drop'] };
const tee = { id: 'prod_tee', slug: 'tee', name: 'Graphic Tee', price: 800, category: 't-shirts', collections: ['summer-drop'] };
const cap = { id: 'prod_cap', slug: 'cap', name: 'Dad Cap', price: 400, category: 'accessories', collections: ['accessories'] };

let passed = 0;

// Test 1: Percentage product discount (20% off)
const t1 = evaluateDiscount({
  type: 'amount_off_products',
  value_type: 'percentage',
  value: 20,
  target: { type: 'all', ids: [] },
  status: 'active'
}, [{ product: hoodie, quantity: 2 }]);
assert.strictEqual(t1.valid, true);
assert.strictEqual(t1.discount_amount, 600); // 20% of 3000 = 600
passed++;

// Test 2: Fixed product discount (৳200 off)
const t2 = evaluateDiscount({
  type: 'amount_off_products',
  value_type: 'fixed_amount',
  value: 200,
  target: { type: 'all', ids: [] },
  status: 'active'
}, [{ product: hoodie, quantity: 2 }]);
assert.strictEqual(t2.discount_amount, 400); // 200 * 2 = 400
passed++;

// Test 3: Collection targeting discount
const t3 = evaluateDiscount({
  type: 'amount_off_products',
  value_type: 'percentage',
  value: 10,
  target: { type: 'specific_collections', ids: ['winter-drop'] },
  status: 'active'
}, [{ product: hoodie, quantity: 1 }, { product: tee, quantity: 1 }]);
assert.strictEqual(t3.discount_amount, 150); // 10% of 1500 only (hoodie)
passed++;

// Test 4: Category targeting discount
const t4 = evaluateDiscount({
  type: 'amount_off_products',
  value_type: 'percentage',
  value: 50,
  target: { type: 'specific_categories', ids: ['accessories'] },
  status: 'active'
}, [{ product: hoodie, quantity: 1 }, { product: cap, quantity: 1 }]);
assert.strictEqual(t4.discount_amount, 200); // 50% of 400 = 200
passed++;

// Test 5: Variant targeting
const variantHoodie = { ...hoodie, variants: [{ sku: 'RR-HD-BLK-M', size: 'M', color: 'Black' }] };
const t5 = evaluateDiscount({
  type: 'amount_off_products',
  value_type: 'fixed_amount',
  value: 300,
  target: { type: 'specific_variants', ids: ['RR-HD-BLK-M'] },
  status: 'active'
}, [{ product: variantHoodie, size: 'M', color: 'Black', quantity: 1 }]);
assert.strictEqual(t5.discount_amount, 300);
passed++;

// Test 6: Percentage order discount (10% off orders above 2000)
const t6 = evaluateDiscount({
  type: 'amount_off_order',
  value_type: 'percentage',
  value: 10,
  min_requirement_type: 'min_amount',
  min_requirement_value: 2000,
  status: 'active'
}, [{ product: hoodie, quantity: 2 }]); // 3000 subtotal
assert.strictEqual(t6.discount_amount, 300);
passed++;

// Test 7: Fixed order discount (৳500 off)
const t7 = evaluateDiscount({
  type: 'amount_off_order',
  value_type: 'fixed_amount',
  value: 500,
  min_requirement_type: 'min_amount',
  min_requirement_value: 2000,
  status: 'active'
}, [{ product: hoodie, quantity: 2 }]);
assert.strictEqual(t7.discount_amount, 500);
passed++;

// Test 8: Buy 1 Get 1 Free (BOGO)
const t8 = evaluateDiscount({
  type: 'buy_x_get_y',
  bxgy_rule: {
    customer_buys: { type: 'quantity', value: 1, target: { type: 'all', ids: [] } },
    customer_gets: { quantity: 1, target: { type: 'all', ids: [] }, reward_type: 'free' }
  },
  status: 'active'
}, [{ product: tee, quantity: 2 }]); // 2 tees in cart -> 1 free (800)
assert.strictEqual(t8.discount_amount, 800);
passed++;

// Test 9: Buy 2 Get 1 Free
const t9 = evaluateDiscount({
  type: 'buy_x_get_y',
  bxgy_rule: {
    customer_buys: { type: 'quantity', value: 2, target: { type: 'all', ids: [] } },
    customer_gets: { quantity: 1, target: { type: 'all', ids: [] }, reward_type: 'free' }
  },
  status: 'active'
}, [{ product: tee, quantity: 3 }]); // 3 tees -> 1 free (800)
assert.strictEqual(t9.discount_amount, 800);
passed++;

// Test 10: Buy 2 Shirts -> Get 1 Cap 50% OFF
const t10 = evaluateDiscount({
  type: 'buy_x_get_y',
  bxgy_rule: {
    customer_buys: { type: 'quantity', value: 2, target: { type: 'specific_categories', ids: ['t-shirts'] } },
    customer_gets: { quantity: 1, target: { type: 'specific_categories', ids: ['accessories'] }, reward_type: 'percentage', reward_value: 50 }
  },
  status: 'active'
}, [{ product: tee, quantity: 2 }, { product: cap, quantity: 1 }]);
assert.strictEqual(t10.discount_amount, 200); // 50% of 400 = 200
passed++;

// Test 11: Product combination promotion (Buy Hoodie -> Get Cap Free)
const t11 = evaluateDiscount({
  type: 'buy_x_get_y',
  bxgy_rule: {
    customer_buys: { type: 'quantity', value: 1, target: { type: 'specific_products', ids: ['hoodie'] } },
    customer_gets: { quantity: 1, target: { type: 'specific_products', ids: ['cap'] }, reward_type: 'free' }
  },
  status: 'active'
}, [{ product: hoodie, quantity: 1 }, { product: cap, quantity: 1 }]);
assert.strictEqual(t11.discount_amount, 400);
passed++;

// Test 12: Minimum purchase amount not met
const t12 = evaluateDiscount({
  type: 'amount_off_order',
  value_type: 'fixed_amount',
  value: 300,
  min_requirement_type: 'min_amount',
  min_requirement_value: 2000,
  status: 'active'
}, [{ product: tee, quantity: 1 }]); // 800 subtotal < 2000
assert.strictEqual(t12.valid, false);
passed++;

// Test 13: Minimum quantity requirement not met
const t13 = evaluateDiscount({
  type: 'amount_off_order',
  value_type: 'percentage',
  value: 15,
  min_requirement_type: 'min_quantity',
  min_requirement_value: 3,
  status: 'active'
}, [{ product: tee, quantity: 2 }]); // 2 items < 3
assert.strictEqual(t13.valid, false);
passed++;

// Test 14: Total usage limit reached
const t14 = evaluateDiscount({
  type: 'amount_off_order',
  value: 200,
  total_usage_limit: 10,
  usage_count: 10,
  status: 'active'
}, [{ product: hoodie, quantity: 1 }]);
assert.strictEqual(t14.valid, false);
passed++;

// Test 15: Per-customer usage limit reached
const t15 = evaluateDiscount({
  id: 'disc_vip',
  type: 'amount_off_order',
  value: 200,
  per_customer_usage_limit: 1,
  status: 'active'
}, [{ product: hoodie, quantity: 1 }], { phone: '01827000000' }, { disc_vip: { '01827000000': 1 } });
assert.strictEqual(t15.valid, false);
passed++;

// Test 16: Expired discount
const t16 = evaluateDiscount({
  type: 'amount_off_order',
  value: 200,
  end_date: '2020-01-01T00:00:00Z',
  status: 'active'
}, [{ product: hoodie, quantity: 1 }]);
assert.strictEqual(t16.valid, false);
passed++;

// Test 17: Scheduled future discount
const t17 = evaluateDiscount({
  type: 'amount_off_order',
  value: 200,
  start_date: '2099-01-01T00:00:00Z',
  status: 'active'
}, [{ product: hoodie, quantity: 1 }]);
assert.strictEqual(t17.valid, false);
passed++;

// Test 18: Disabled discount
const t18 = evaluateDiscount({
  type: 'amount_off_order',
  value: 200,
  status: 'disabled'
}, [{ product: hoodie, quantity: 1 }]);
assert.strictEqual(t18.valid, false);
passed++;

// Test 19: Draft discount
const t19 = evaluateDiscount({
  type: 'amount_off_order',
  value: 200,
  status: 'draft'
}, [{ product: hoodie, quantity: 1 }]);
assert.strictEqual(t19.valid, false);
passed++;

// Test 20: Free shipping waiver
const t20 = evaluateDiscount({
  type: 'free_shipping',
  min_requirement_type: 'min_amount',
  min_requirement_value: 1000,
  status: 'active'
}, [{ product: hoodie, quantity: 1 }]);
assert.strictEqual(t20.valid, true);
assert.strictEqual(t20.free_shipping, true);
passed++;

// Test 21: Max applications cap on BXGY (Buy 1 Get 1 Cap limit 2)
const t21 = evaluateDiscount({
  type: 'buy_x_get_y',
  bxgy_rule: {
    customer_buys: { type: 'quantity', value: 1, target: { type: 'all', ids: [] } },
    customer_gets: { quantity: 1, target: { type: 'all', ids: [] }, reward_type: 'free' },
    max_applications_per_order: 2
  },
  status: 'active'
}, [{ product: tee, quantity: 10 }]); // 10 tees in cart, but max 2 free
assert.strictEqual(t21.discount_amount, 1600); // 2 * 800
passed++;

// Test 22: Registered customer only requirement on Guest
const t22 = evaluateDiscount({
  type: 'amount_off_order',
  value: 100,
  customer_eligibility: 'registered',
  status: 'active'
}, [{ product: hoodie, quantity: 1 }], { is_guest: true });
assert.strictEqual(t22.valid, false);
passed++;

// Test 23: Registered customer logged in
const t23 = evaluateDiscount({
  type: 'amount_off_order',
  value: 100,
  value_type: 'fixed_amount',
  customer_eligibility: 'registered',
  status: 'active'
}, [{ product: hoodie, quantity: 1 }], { is_guest: false, email: 'arif@example.com' });
assert.strictEqual(t23.valid, true);
assert.strictEqual(t23.discount_amount, 100);
passed++;

// Test 24: Non-negative total protection
const t24 = evaluateDiscount({
  type: 'amount_off_order',
  value_type: 'fixed_amount',
  value: 5000,
  status: 'active'
}, [{ product: cap, quantity: 1 }]); // 400 subtotal < 5000
assert.strictEqual(t24.final_subtotal, 0); // Not negative
passed++;

// Test 25: Case-insensitive targeting match
const t25 = isItemMatchingTarget({ product: { category: 'Hoodies' } }, { type: 'specific_categories', ids: ['hoodies'] });
assert.strictEqual(t25, true);
passed++;

// Test 26: Cart item removal recalculation
const cartAfterRemoval = [{ product: cap, quantity: 1 }]; // removed hoodie
const t26 = evaluateDiscount({
  type: 'amount_off_products',
  value: 20,
  value_type: 'percentage',
  target: { type: 'specific_categories', ids: ['hoodies'] },
  status: 'active'
}, cartAfterRemoval);
assert.strictEqual(t26.valid, false);
passed++;

// Test 27: Buy X Get Y missing reward item prompt
const t27 = evaluateDiscount({
  type: 'buy_x_get_y',
  bxgy_rule: {
    customer_buys: { type: 'quantity', value: 2, target: { type: 'specific_categories', ids: ['hoodies'] } },
    customer_gets: { quantity: 1, target: { type: 'specific_categories', ids: ['accessories'] }, reward_type: 'free' }
  },
  status: 'active'
}, [{ product: hoodie, quantity: 2 }]); // no cap in cart yet
assert.strictEqual(t27.valid, false);
assert(t27.error.includes('reward item'));
passed++;

// Test 28: Zero subtotal safety
const t28 = evaluateDiscount({ type: 'amount_off_order', value: 10, status: 'active' }, []);
assert.strictEqual(t28.valid, false);
passed++;

console.log(`✅ ALL ${passed} / 28 TEST SCENARIOS PASSED WITH 100% ACCURACY!`);
