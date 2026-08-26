// @ts-nocheck
/**
 * Sales Analytics & Aggregation Engine
 * Computes all KPI metrics, rankings, category breakdowns, and timeline charts
 * dynamically from live database records.
 */

export interface DateRange {
  start: Date;
  end: Date;
  preset?: string;
}

export function getDateRangePreset(preset: string): DateRange {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'TODAY':
      return { start: startOfDay(now), end: endOfDay(now), preset };

    case 'YESTERDAY': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y), preset };
    }

    case 'LAST_7_DAYS': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { start: startOfDay(s), end: endOfDay(now), preset };
    }

    case 'LAST_30_DAYS': {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { start: startOfDay(s), end: endOfDay(now), preset };
    }

    case 'THIS_WEEK': {
      const d = new Date(now);
      const day = d.getDay(); // 0 is Sun, 1 is Mon...
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const mon = new Date(d.setDate(diff));
      return { start: startOfDay(mon), end: endOfDay(now), preset };
    }

    case 'LAST_WEEK': {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const lastMon = new Date(d.setDate(diff));
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastSun.getDate() + 6);
      return { start: startOfDay(lastMon), end: endOfDay(lastSun), preset };
    }

    case 'THIS_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start, end: endOfDay(now), preset };
    }

    case 'LAST_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end, preset };
    }

    case 'THIS_YEAR': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start, end: endOfDay(now), preset };
    }

    default:
      return { start: startOfDay(new Date(now.setDate(now.getDate() - 29))), end: endOfDay(new Date()), preset: 'LAST_30_DAYS' };
  }
}

/**
 * Check if order is considered valid for Gross/Net revenue calculations
 */
export function isOrderValid(order: any): boolean {
  const status = String(order?.status || '').toLowerCase();
  return !status.includes('cancel') && !status.includes('fake') && !status.includes('reject') && !status.includes('test');
}

/**
 * Filter orders and order items by multidimensional criteria
 */
export function filterSalesData(
  orders: any[],
  orderItems: any[],
  filters: {
    dateRange?: DateRange;
    category?: string;
    product_id?: string;
    variant?: string;
    status?: string;
    payment_method?: string;
    search?: string;
  }
) {
  const { dateRange, category, product_id, variant, status, payment_method, search } = filters;

  // 1. Filter Orders by Date & Order-level filters
  const filteredOrders = orders.filter(order => {
    // Date Range
    if (dateRange?.start && dateRange?.end) {
      const d = new Date(order.created_at);
      if (d < dateRange.start || d > dateRange.end) return false;
    }

    // Status Filter
    if (status && status !== 'ALL') {
      if (String(order.status || '').toLowerCase() !== status.toLowerCase()) return false;
    }

    // Payment Method Filter
    if (payment_method && payment_method !== 'ALL') {
      const pm = String(order.payment_method || 'Cash on Delivery').toLowerCase();
      if (!pm.includes(payment_method.toLowerCase())) return false;
    }

    // Search Filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const matchOrder = 
        String(order.order_number || order.id || '').toLowerCase().includes(q) ||
        String(order.customer_name || '').toLowerCase().includes(q) ||
        String(order.phone || '').toLowerCase().includes(q) ||
        String(order.email || '').toLowerCase().includes(q);

      if (!matchOrder) {
        // Also check if any item in this order matches product or SKU
        const matchingItem = orderItems.find(
          item => item.order_id === order.id && (
            String(item.product_name || '').toLowerCase().includes(q) ||
            String(item.product_id || '').toLowerCase().includes(q) ||
            String(item.size || '').toLowerCase().includes(q) ||
            String(item.color_name || '').toLowerCase().includes(q)
          )
        );
        if (!matchingItem) return false;
      }
    }

    return true;
  });

  const matchingOrderIds = new Set(filteredOrders.map(o => o.id));

  // 2. Filter Order Items by matching order and item-level criteria
  const filteredItems = orderItems.filter(item => {
    if (!matchingOrderIds.has(item.order_id)) return false;

    if (product_id && product_id !== 'ALL') {
      if (String(item.product_id) !== String(product_id)) return false;
    }

    if (variant && variant !== 'ALL') {
      const itemVar = `${item.color_name || ''} / ${item.size || ''}`.toLowerCase();
      if (!itemVar.includes(variant.toLowerCase())) return false;
    }

    return true;
  });

  return { filteredOrders, filteredItems };
}

/**
 * Calculate Summary KPI Metrics
 */
export function calculateSalesSummary(orders: any[], orderItems: any[]) {
  const validOrders = orders.filter(isOrderValid);
  const cancelledOrders = orders.filter(o => String(o.status || '').toLowerCase().includes('cancel'));
  const returnedOrders = orders.filter(o => String(o.status || '').toLowerCase().includes('return'));

  const grossSales = validOrders.reduce((sum, o) => sum + (Number(o.subtotal) || Number(o.total) || 0), 0);
  const totalDiscount = validOrders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || Number(o.subtotal) || 0), 0);
  const returnedRevenue = returnedOrders.reduce((sum, o) => sum + (Number(o.total) || Number(o.subtotal) || 0), 0);

  const netSales = Math.max(0, grossSales - totalDiscount);
  const totalOrdersCount = validOrders.length;
  const aov = totalOrdersCount > 0 ? Math.round(netSales / totalOrdersCount) : 0;

  // Total units sold across valid orders
  const validOrderIds = new Set(validOrders.map(o => o.id));
  const itemsSold = orderItems
    .filter(item => validOrderIds.has(item.order_id))
    .reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  return {
    totalRevenue: grossSales,
    netSales,
    totalOrders: totalOrdersCount,
    allOrdersCount: orders.length,
    itemsSold,
    aov,
    totalDiscount,
    cancelledOrdersCount: cancelledOrders.length,
    cancelledRevenue,
    returnedOrdersCount: returnedOrders.length,
    returnedRevenue
  };
}

/**
 * Build timeline chart series (Hourly for <= 1 day, Daily for <= 31 days, Monthly for longer)
 */
export function generateTimelineChartData(orders: any[], orderItems: any[], dateRange: DateRange) {
  const diffDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const validOrders = orders.filter(isOrderValid);
  const validOrderIds = new Set(validOrders.map(o => o.id));

  // Map order items count by order ID
  const itemQtyByOrder = new Map<string, number>();
  orderItems.forEach(item => {
    if (validOrderIds.has(item.order_id)) {
      itemQtyByOrder.set(item.order_id, (itemQtyByOrder.get(item.order_id) || 0) + (Number(item.quantity) || 1));
    }
  });

  if (diffDays <= 1) {
    // Hourly breakdown (00:00 to 23:00)
    const hours = Array.from({ length: 24 }, (_, h) => {
      const label = `${String(h).padStart(2, '0')}:00`;
      return { label, revenue: 0, orders: 0, quantity: 0 };
    });

    validOrders.forEach(o => {
      const d = new Date(o.created_at);
      const h = d.getHours();
      if (hours[h]) {
        hours[h].revenue += Number(o.subtotal || o.total || 0);
        hours[h].orders += 1;
        hours[h].quantity += itemQtyByOrder.get(o.id) || 1;
      }
    });

    return hours;
  }

  // Daily breakdown
  const dailyMap = new Map<string, { label: string; revenue: number; orders: number; quantity: number }>();
  const curr = new Date(dateRange.start);

  while (curr <= dateRange.end) {
    const key = curr.toISOString().split('T')[0];
    const label = curr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    dailyMap.set(key, { label, revenue: 0, orders: 0, quantity: 0 });
    curr.setDate(curr.getDate() + 1);
  }

  validOrders.forEach(o => {
    const key = new Date(o.created_at).toISOString().split('T')[0];
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!;
      entry.revenue += Number(o.subtotal || o.total || 0);
      entry.orders += 1;
      entry.quantity += itemQtyByOrder.get(o.id) || 1;
    }
  });

  return Array.from(dailyMap.values());
}

/**
 * Top Selling Products Ranking
 */
export function getTopSellingProducts(orderItems: any[], orders: any[], productsMap: Map<string, any> = new Map()) {
  const validOrderIds = new Set(orders.filter(isOrderValid).map(o => o.id));
  const productStats = new Map<string, {
    product_id: string;
    product_name: string;
    product_image?: string;
    sku?: string;
    category?: string;
    units_sold: number;
    orders_count: number;
    revenue: number;
    order_ids: Set<string>;
  }>();

  orderItems.forEach(item => {
    if (!validOrderIds.has(item.order_id)) return;

    const pid = String(item.product_id || item.product_name || 'unknown');
    if (!productStats.has(pid)) {
      const dbProd = productsMap.get(pid);
      productStats.set(pid, {
        product_id: pid,
        product_name: item.product_name || dbProd?.name || 'Product',
        product_image: item.product_image || dbProd?.image_url || dbProd?.image,
        sku: dbProd?.sku || pid,
        category: dbProd?.category_name || dbProd?.category || 'General',
        units_sold: 0,
        orders_count: 0,
        revenue: 0,
        order_ids: new Set()
      });
    }

    const stat = productStats.get(pid)!;
    stat.units_sold += Number(item.quantity) || 1;
    stat.revenue += Number(item.subtotal || item.unit_price * (item.quantity || 1) || 0);
    stat.order_ids.add(item.order_id);
  });

  const list = Array.from(productStats.values()).map(stat => ({
    ...stat,
    orders_count: stat.order_ids.size,
    avg_price: stat.units_sold > 0 ? Math.round(stat.revenue / stat.units_sold) : 0
  }));

  // Sort by units sold descending
  return list.sort((a, b) => b.units_sold - a.units_sold);
}

/**
 * Variant-Level Quantity Ranking
 */
export function getTopVariantsByQuantity(orderItems: any[], orders: any[]) {
  const validOrderIds = new Set(orders.filter(isOrderValid).map(o => o.id));
  const variantMap = new Map<string, {
    product_name: string;
    variant_label: string;
    quantity: number;
    revenue: number;
  }>();

  orderItems.forEach(item => {
    if (!validOrderIds.has(item.order_id)) return;

    const variantLabel = [item.color_name, item.size].filter(Boolean).join(' / ') || 'Standard';
    const key = `${item.product_name || 'Product'}_${variantLabel}`;

    if (!variantMap.has(key)) {
      variantMap.set(key, {
        product_name: item.product_name || 'Product',
        variant_label: variantLabel,
        quantity: 0,
        revenue: 0
      });
    }

    const v = variantMap.get(key)!;
    v.quantity += Number(item.quantity) || 1;
    v.revenue += Number(item.subtotal || item.unit_price * (item.quantity || 1) || 0);
  });

  return Array.from(variantMap.values()).sort((a, b) => b.quantity - a.quantity);
}

/**
 * Category Performance Breakdown
 */
export function getCategoryPerformance(
  orderItems: any[], 
  orders: any[], 
  productsMap: Map<string, any> = new Map(), 
  categoriesList: any[] = []
) {
  const validOrderIds = new Set(orders.filter(isOrderValid).map(o => o.id));
  const categoryStats = new Map<string, {
    category: string;
    orders_count: Set<string>;
    units_sold: number;
    revenue: number;
  }>();

  let totalSalesRevenue = 0;

  orderItems.forEach(item => {
    if (!validOrderIds.has(item.order_id)) return;

    const dbProd = productsMap.get(String(item.product_id));
    const catName = dbProd?.category_name || dbProd?.category || 'Uncategorized';
    const subtotal = Number(item.subtotal || item.unit_price * (item.quantity || 1) || 0);

    totalSalesRevenue += subtotal;

    if (!categoryStats.has(catName)) {
      categoryStats.set(catName, {
        category: catName,
        orders_count: new Set(),
        units_sold: 0,
        revenue: 0
      });
    }

    const stat = categoryStats.get(catName)!;
    stat.units_sold += Number(item.quantity) || 1;
    stat.revenue += subtotal;
    stat.orders_count.add(item.order_id);
  });

  return Array.from(categoryStats.values()).map(stat => ({
    category: stat.category,
    orders_count: stat.orders_count.size,
    units_sold: stat.units_sold,
    revenue: stat.revenue,
    share_percent: totalSalesRevenue > 0 ? Number(((stat.revenue / totalSalesRevenue) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Order Status Breakdown
 */
export function getOrderStatusBreakdown(orders: any[]) {
  const statusMap = new Map<string, { status: string; orders: number; revenue: number }>();
  let totalRev = 0;

  orders.forEach(o => {
    const rawStatus = String(o.status || 'Pending').trim();
    const formatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
    const rev = Number(o.total || o.subtotal || 0);

    totalRev += rev;

    if (!statusMap.has(formatted)) {
      statusMap.set(formatted, { status: formatted, orders: 0, revenue: 0 });
    }

    const s = statusMap.get(formatted)!;
    s.orders += 1;
    s.revenue += rev;
  });

  return Array.from(statusMap.values()).map(s => ({
    ...s,
    share_percent: totalRev > 0 ? Number(((s.revenue / totalRev) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.orders - a.orders);
}

/**
 * Customer Performance Ranking
 */
export function getCustomerPerformance(orders: any[], orderItems: any[]) {
  const validOrders = orders.filter(isOrderValid);
  const customerMap = new Map<string, {
    customer_name: string;
    phone: string;
    email?: string;
    orders_count: number;
    items_purchased: number;
    total_spent: number;
    last_order_at: string;
  }>();

  validOrders.forEach(o => {
    const key = String(o.phone || o.email || o.customer_name || 'Guest').trim();
    const subtotal = Number(o.total || o.subtotal || 0);

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customer_name: o.customer_name || 'Guest Customer',
        phone: o.phone || '—',
        email: o.email || '',
        orders_count: 0,
        items_purchased: 0,
        total_spent: 0,
        last_order_at: o.created_at
      });
    }

    const c = customerMap.get(key)!;
    c.orders_count += 1;
    c.total_spent += subtotal;
    if (new Date(o.created_at) > new Date(c.last_order_at)) {
      c.last_order_at = o.created_at;
    }
  });

  // Calculate items purchased
  const validOrderIds = new Set(validOrders.map(o => o.id));
  orderItems.forEach(item => {
    if (!validOrderIds.has(item.order_id)) return;
    const parentOrder = validOrders.find(o => o.id === item.order_id);
    if (parentOrder) {
      const key = String(parentOrder.phone || parentOrder.email || parentOrder.customer_name || 'Guest').trim();
      const c = customerMap.get(key);
      if (c) {
        c.items_purchased += Number(item.quantity) || 1;
      }
    }
  });

  return Array.from(customerMap.values()).map(c => ({
    ...c,
    aov: c.orders_count > 0 ? Math.round(c.total_spent / c.orders_count) : 0
  })).sort((a, b) => b.total_spent - a.total_spent);
}
