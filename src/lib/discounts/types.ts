export type DiscountType = 
  | 'amount_off_products'  // Product/Variant/Collection discount (% or Fixed ৳)
  | 'buy_x_get_y'          // Buy X units/amount -> Get Y units free or discounted
  | 'amount_off_order'     // % or Fixed ৳ off entire order
  | 'free_shipping';       // Waives delivery charges if qualified

export type DiscountMethod = 'code' | 'automatic';

export type DiscountValueType = 'percentage' | 'fixed_amount';

export type DiscountStatus = 'active' | 'draft' | 'scheduled' | 'expired' | 'disabled';

export interface DiscountTarget {
  type: 'all' | 'specific_products' | 'specific_collections' | 'specific_categories' | 'specific_variants';
  ids: string[]; // Product slugs/IDs, category slugs, collection names, or variant SKUs
}

export interface BuyXGetYRule {
  customer_buys: {
    type: 'quantity' | 'amount';
    value: number; // e.g. 2 items or ৳2000
    target: DiscountTarget;
  };
  customer_gets: {
    quantity: number; // e.g. 1
    target: DiscountTarget;
    reward_type: 'free' | 'percentage' | 'fixed_amount';
    reward_value?: number; // 100 for free, 50 for 50% off, 200 for ৳200 off
  };
  max_applications_per_order?: number; // e.g. maximum 3 times per order
}

export interface DiscountCombinationRules {
  combine_with_product_discounts: boolean;
  combine_with_order_discounts: boolean;
  combine_with_shipping_discounts: boolean;
}

export interface Discount {
  id: string;
  title: string;
  code?: string; // Uppercase, unique (if method === 'code')
  method: DiscountMethod;
  type: DiscountType;
  status: DiscountStatus;
  
  // Value (for amount_off_products and amount_off_order)
  value_type?: DiscountValueType;
  value?: number;
  
  // Targeting
  target?: DiscountTarget;
  
  // Buy X Get Y Rule (if type === 'buy_x_get_y')
  bxgy_rule?: BuyXGetYRule;
  
  // Minimum Requirements
  min_requirement_type: 'none' | 'min_amount' | 'min_quantity';
  min_requirement_value?: number;
  
  // Customer Eligibility
  customer_eligibility: 'all' | 'registered' | 'guest' | 'specific_customers';
  eligible_customer_ids?: string[]; // email or phone numbers
  
  // Usage Limits
  total_usage_limit?: number | null;
  per_customer_usage_limit?: number | null;
  usage_count: number;
  
  // Schedule (UTC ISO strings)
  start_date: string;
  end_date?: string | null;
  
  // Combination Rules
  combinations: DiscountCombinationRules;
  
  created_at: string;
  updated_at: string;
}

export interface CartItemForDiscount {
  key?: string;
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    category?: string;
    collections?: string[];
    image?: string;
    in_stock?: boolean;
    variants?: any[];
  };
  size?: string;
  color?: string;
  quantity: number;
}

export interface DiscountCustomerContext {
  id?: string;
  email?: string;
  phone?: string;
  is_guest?: boolean;
}

export interface DiscountItemAllocation {
  item_key?: string;
  product_id: string;
  product_name: string;
  size?: string;
  color?: string;
  quantity_discounted: number;
  original_unit_price: number;
  discounted_unit_price: number;
  total_discount: number;
}

export interface DiscountEvaluationResult {
  valid: boolean;
  error?: string;
  discount?: Discount;
  discount_code?: string;
  discount_title?: string;
  discount_type?: DiscountType;
  discount_amount: number;
  free_shipping: boolean;
  item_allocations: DiscountItemAllocation[];
  subtotal: number;
  final_subtotal: number;
  savings_message?: string;
  qualifies_automatically?: boolean;
}
