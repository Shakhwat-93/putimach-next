// @ts-nocheck
import * as XLSX from 'xlsx';
import { DateRange } from './salesEngine';

/**
 * Clean & Format Currency for exports
 */
const fmtMoney = (val: number | string) => {
  const num = Number(val) || 0;
  return `৳${num.toLocaleString('en-BD')}`;
};

/**
 * Trigger browser file download
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. EXPORT TO CSV
 */
export function exportSalesToCSV(params: {
  orders: any[];
  orderItems: any[];
  dateRange: DateRange;
  filenamePrefix?: string;
}) {
  const { orders, orderItems, dateRange, filenamePrefix = 'sales_report' } = params;

  // Build row headers
  const headers = [
    'Order ID',
    'Order Date',
    'Customer Name',
    'Phone',
    'Email',
    'Product Name',
    'SKU',
    'Variant / Size / Color',
    'Quantity',
    'Unit Price (BDT)',
    'Line Total (BDT)',
    'Order Discount (BDT)',
    'Order Total (BDT)',
    'Order Status',
    'Payment Method',
    'City / Area'
  ];

  const rows = [];

  // Group order items by order ID for detailed breakdown
  const itemsByOrder = new Map<string, any[]>();
  orderItems.forEach(item => {
    if (!itemsByOrder.has(item.order_id)) {
      itemsByOrder.set(item.order_id, []);
    }
    itemsByOrder.get(item.order_id)!.push(item);
  });

  orders.forEach(order => {
    const items = itemsByOrder.get(order.id) || [];
    const dateStr = new Date(order.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (items.length > 0) {
      items.forEach(item => {
        const variantStr = [item.color_name, item.size].filter(Boolean).join(' / ') || 'Standard';
        rows.push([
          order.order_number || order.id,
          dateStr,
          order.customer_name || 'Guest Customer',
          order.phone || '',
          order.email || '',
          item.product_name || 'Product',
          item.product_id || '',
          variantStr,
          item.quantity || 1,
          item.unit_price || 0,
          item.subtotal || (item.unit_price * (item.quantity || 1)),
          order.discount || 0,
          order.amount ?? order.total ?? order.subtotal ?? 0,
          order.status || 'Pending',
          order.payment_method || 'Cash on Delivery',
          [order.city, order.area, order.address].filter(Boolean).join(', ') || ''
        ]);
      });
    } else {
      rows.push([
        order.order_number || order.id,
        dateStr,
        order.customer_name || 'Guest Customer',
        order.phone || '',
        order.email || '',
        order.product_name || 'Order',
        '',
        order.size || 'Standard',
        order.quantity || 1,
        order.amount ?? order.subtotal ?? order.total ?? 0,
        order.amount ?? order.subtotal ?? order.total ?? 0,
        order.discount || 0,
        order.amount ?? order.total ?? order.subtotal ?? 0,
        order.status || 'Pending',
        order.payment_method || 'Cash on Delivery',
        [order.city, order.area, order.address].filter(Boolean).join(', ') || ''
      ]);
    }
  });

  // Convert to CSV string with escaping
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens Bangla/BDT cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
  triggerBrowserDownload(blob, filename);
}

/**
 * 2. EXPORT TO XLSX (Multi-Sheet Workbook)
 */
export function exportSalesToXLSX(params: {
  summary: any;
  topProducts: any[];
  topVariants: any[];
  categoryStats: any[];
  customerStats: any[];
  orders: any[];
  orderItems: any[];
  dateRange: DateRange;
  filenamePrefix?: string;
}) {
  const {
    summary,
    topProducts,
    topVariants,
    categoryStats,
    customerStats,
    orders,
    orderItems,
    dateRange,
    filenamePrefix = 'sales_report'
  } = params;

  const workbook = XLSX.utils.book_new();

  // ── Sheet 1: Summary KPIs ──
  const summaryData = [
    ['RUST & REVIVE / PUTIMACH — SALES REPORT SUMMARY'],
    ['Generated Date', new Date().toLocaleString('en-GB')],
    ['Reporting Period', `${dateRange.start.toLocaleDateString('en-GB')} to ${dateRange.end.toLocaleDateString('en-GB')}`],
    [],
    ['METRIC', 'VALUE'],
    ['Gross Revenue', summary.totalRevenue],
    ['Net Sales', summary.netSales],
    ['Total Valid Orders', summary.totalOrders],
    ['Total Units Sold', summary.itemsSold],
    ['Average Order Value (AOV)', summary.aov],
    ['Total Discounts Applied', summary.totalDiscount],
    ['Cancelled Orders Count', summary.cancelledOrdersCount],
    ['Cancelled Revenue', summary.cancelledRevenue],
    ['Returned Orders Count', summary.returnedOrdersCount],
    ['Returned Revenue', summary.returnedRevenue]
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sales Summary');

  // ── Sheet 2: Top Products ──
  const productsData = [
    ['Rank', 'Product Name', 'SKU / ID', 'Category', 'Units Sold', 'Orders Count', 'Gross Revenue', 'Average Selling Price'],
    ...topProducts.map((p, idx) => [
      idx + 1,
      p.product_name,
      p.sku || p.product_id,
      p.category || 'General',
      p.units_sold,
      p.orders_count,
      p.revenue,
      p.avg_price
    ])
  ];
  const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');

  // ── Sheet 3: Order Details ──
  const itemsByOrder = new Map<string, any[]>();
  orderItems.forEach(item => {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id)!.push(item);
  });

  const ordersData = [
    ['Order Number', 'Date', 'Customer Name', 'Phone', 'Email', 'Product', 'Variant', 'Qty', 'Unit Price', 'Line Total', 'Discount', 'Order Total', 'Status', 'Payment Method', 'City'],
  ];

  orders.forEach(order => {
    const items = itemsByOrder.get(order.id) || [];
    const dateStr = new Date(order.created_at).toLocaleDateString('en-GB');

    if (items.length > 0) {
      items.forEach(item => {
        ordersData.push([
          order.order_number || order.id,
          dateStr,
          order.customer_name || 'Guest Customer',
          order.phone || '',
          order.email || '',
          item.product_name || 'Product',
          [item.color_name, item.size].filter(Boolean).join(' / ') || 'Standard',
          item.quantity || 1,
          item.unit_price || 0,
          item.subtotal || ((item.unit_price || 0) * (item.quantity || 1)),
          order.discount || 0,
          order.amount ?? order.total ?? order.subtotal ?? 0,
          order.status || 'Pending',
          order.payment_method || 'Cash on Delivery',
          [order.city, order.area, order.address].filter(Boolean).join(', ') || ''
        ]);
      });
    } else {
      ordersData.push([
        order.order_number || order.id,
        dateStr,
        order.customer_name || 'Guest Customer',
        order.phone || '',
        order.email || '',
        order.product_name || 'Order',
        order.size || 'Standard',
        order.quantity || 1,
        order.amount ?? order.subtotal ?? order.total ?? 0,
        order.amount ?? order.subtotal ?? order.total ?? 0,
        order.discount || 0,
        order.amount ?? order.total ?? order.subtotal ?? 0,
        order.status || 'Pending',
        order.payment_method || 'Cash on Delivery',
        [order.city, order.area, order.address].filter(Boolean).join(', ') || ''
      ]);
    }
  });
  const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Order Details');

  // ── Sheet 4: Category Performance ──
  const categoryData = [
    ['Category Name', 'Orders Count', 'Units Sold', 'Total Revenue', 'Share of Sales (%)'],
    ...categoryStats.map(c => [
      c.category,
      c.orders_count,
      c.units_sold,
      c.revenue,
      `${c.share_percent}%`
    ])
  ];
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Performance');

  // ── Sheet 5: Customer Performance ──
  const customerData = [
    ['Customer Name', 'Phone', 'Email', 'Orders Count', 'Items Purchased', 'Total Spent', 'Average Order Value (AOV)', 'Last Order Date'],
    ...customerStats.map(c => [
      c.customer_name,
      c.phone,
      c.email || '',
      c.orders_count,
      c.items_purchased,
      c.total_spent,
      c.aov,
      new Date(c.last_order_at).toLocaleDateString('en-GB')
    ])
  ];
  const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Performance');

  // Write and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
  triggerBrowserDownload(blob, filename);
}
