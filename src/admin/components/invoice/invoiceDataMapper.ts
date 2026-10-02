import { MappedInvoiceData, MappedInvoiceItem } from './types';

/**
 * Clean internal tags (e.g. "[Email: xxx]") from customer notes
 */
function cleanNoteText(note?: string | null): string {
  if (!note) return '';
  let cleaned = String(note);
  if (cleaned.startsWith('[Email: ')) {
    cleaned = cleaned.replace(/^\[Email:\s*([^\]]+)\]\s*\n?/, '');
  }
  return cleaned.trim();
}

/**
 * Safely parse JSON array or return existing array
 */
function parseArrayField(field: any): any[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Universal Order-to-Invoice Data Mapper
 * Ensures unified financial calculations, dates, and item normalization
 * across Standard A4, 58mm Thermal, and 80mm Thermal formats.
 */
export function mapOrderToInvoiceData(order: any): MappedInvoiceData {
  if (!order || typeof order !== 'object') {
    return {
      orderId: 'N/A',
      orderNumber: 'N/A',
      dateFormatted: new Date().toLocaleDateString('en-GB'),
      timeFormatted: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }),
      rawDate: new Date().toISOString(),
      customerName: 'Valued Customer',
      customerPhone: 'N/A',
      deliveryAddress: 'N/A',
      items: [],
      itemCount: 0,
      subtotal: 0,
      discount: 0,
      deliveryCharge: 0,
      advancePaid: 0,
      grandTotal: 0,
      cashToCollect: 0,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'UNPAID / COD',
      isPaid: false,
      status: 'pending',
      rawOrder: order,
    };
  }

  // 1. Order ID & Reference
  const rawId = order.id || order.order_id || order.orderId || '';
  const orderId = String(rawId || 'ORD-000');
  const orderNumber = String(order.order_number || order.invoice_number || rawId || 'ORD-000');

  // 2. Date & Time
  const dateVal = order.created_at || order.order_date || order.date || Date.now();
  const parsedDate = new Date(dateVal);
  const isValidDate = !isNaN(parsedDate.getTime());
  const dateObj = isValidDate ? parsedDate : new Date();

  const dateFormatted = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeFormatted = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // 3. Customer Info
  const customerName = String(
    order.customer_name || order.name || order.shipping_name || order.recipient_name || 'Valued Customer'
  ).trim();

  const customerPhone = String(
    order.phone || order.customer_phone || order.recipient_phone || order.mobile || 'N/A'
  ).trim();

  const deliveryAddress = String(
    order.address || order.customer_address || order.shipping_address || order.delivery_address || 'N/A'
  ).trim();

  const deliveryArea = String(
    order.shipping_zone || order.delivery_area || order.city || order.zone || ''
  ).trim() || undefined;

  const courierName = String(
    order.courier_name || order.courier || order.shipping_method || ''
  ).trim() || undefined;

  const trackingId = String(
    order.tracking_id || order.consignment_id || order.courier_assigned_id || ''
  ).trim() || undefined;

  // 4. Products / Items normalization
  const rawLines = parseArrayField(order.order_lines_payload);
  const rawOrdered = parseArrayField(order.ordered_items);
  const rawItems = parseArrayField(order.items);

  let rawList: any[] = [];
  if (rawLines.length > 0) {
    rawList = rawLines;
  } else if (rawOrdered.length > 0) {
    rawList = rawOrdered;
  } else if (rawItems.length > 0) {
    rawList = rawItems;
  }

  const items: MappedInvoiceItem[] = [];

  if (rawList.length > 0) {
    rawList.forEach((it, idx) => {
      if (!it || typeof it !== 'object') return;

      const name = String(it.name || it.product_name || it.title || `Item #${idx + 1}`).trim();
      const qty = Math.max(1, Number(it.quantity || it.qty || 1));
      
      // Determine unit price and line total accurately
      let unitPrice = 0;
      let lineTotal = 0;

      if (it.unit_price !== undefined && it.unit_price !== null) {
        unitPrice = Number(it.unit_price) || 0;
        lineTotal = it.line_total !== undefined ? Number(it.line_total) || 0 : unitPrice * qty;
      } else if (it.price !== undefined && it.price !== null) {
        const p = Number(it.price) || 0;
        // Check if price already represents line total or unit price
        if (it.line_total !== undefined) {
          unitPrice = p;
          lineTotal = Number(it.line_total) || 0;
        } else {
          unitPrice = p;
          lineTotal = unitPrice * qty;
        }
      } else if (it.line_total !== undefined) {
        lineTotal = Number(it.line_total) || 0;
        unitPrice = qty > 0 ? lineTotal / qty : lineTotal;
      }

      const size = String(
        it.selectedSize || it.selected_size || it.size || it.variant_size || ''
      ).trim() || undefined;

      const color = String(
        it.selectedColor || it.selected_color || it.color || it.color_name || it.variant_color || ''
      ).trim() || undefined;

      const sku = String(it.sku || it.barcode || '').trim() || undefined;
      const image = String(it.image || it.image_url || it.product_image || '').trim() || undefined;

      items.push({
        id: it.id || idx + 1,
        name,
        size,
        color,
        quantity: qty,
        unitPrice,
        lineTotal,
        sku,
        image,
      });
    });
  }

  // Fallback if no array was found: extract from top-level order properties
  if (items.length === 0) {
    const singleName = String(order.product_name || order.productTitle || 'Item Ordered').trim();
    const singleQty = Math.max(1, Number(order.quantity || 1));
    const singlePrice = Number(order.price || order.unit_price || order.product_price || 0);
    const singleTotal = singlePrice > 0 ? singlePrice * singleQty : Number(order.subtotal || order.total || 0);

    const singleSize = String(order.selected_size || order.size || '').trim() || undefined;
    const singleColor = String(order.selected_color || order.color || '').trim() || undefined;
    const singleSku = String(order.sku || '').trim() || undefined;
    const singleImg = String(order.image || order.product_image || '').trim() || undefined;

    items.push({
      id: 1,
      name: singleName,
      size: singleSize,
      color: singleColor,
      quantity: singleQty,
      unitPrice: singlePrice > 0 ? singlePrice : (singleTotal / singleQty),
      lineTotal: singleTotal,
      sku: singleSku,
      image: singleImg,
    });
  }

  // 5. Financial Calculations
  const calculatedItemsTotal = items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  const subtotal = order.subtotal !== undefined && Number(order.subtotal) > 0
    ? Number(order.subtotal)
    : calculatedItemsTotal;

  const deliveryCharge = Number(
    order.delivery_charge ??
    order.shipping_cost ??
    order.delivery_fee ??
    order.shipping_fee ??
    order.pricing_summary?.delivery_charge ??
    0
  );

  const discount = Number(
    order.discount_amount ??
    order.discount ??
    order.coupon_discount ??
    order.pricing_summary?.discount ??
    0
  );

  const advancePaid = Number(
    order.advance_paid ??
    order.advance ??
    order.paid_amount ??
    0
  );

  const rawGrandTotal = order.total_amount ?? order.total ?? order.grand_total ?? order.amount;
  const grandTotal = rawGrandTotal !== undefined && Number(rawGrandTotal) > 0
    ? Number(rawGrandTotal)
    : Math.max(0, subtotal + deliveryCharge - discount);

  // Status & Paid Determination
  const statusStr = String(order.status || 'pending').toLowerCase();
  const paymentStatusRaw = String(order.payment_status || '').toLowerCase();
  const isPaid = statusStr === 'delivered' || 
                 statusStr.includes('completed') || 
                 paymentStatusRaw === 'paid' || 
                 (advancePaid >= grandTotal && grandTotal > 0);

  const cashToCollect = isPaid ? 0 : Math.max(0, grandTotal - advancePaid);

  let paymentMethod = String(order.payment_method || order.payment_type || '').trim();
  if (!paymentMethod) {
    if (advancePaid > 0 && advancePaid < grandTotal) {
      paymentMethod = 'Partial Advance + COD';
    } else if (isPaid) {
      paymentMethod = 'Online / Pre-Paid';
    } else {
      paymentMethod = 'Cash on Delivery';
    }
  }

  let paymentStatus = 'CASH ON DELIVERY';
  if (isPaid) {
    paymentStatus = 'PAID';
  } else if (advancePaid > 0) {
    paymentStatus = `PARTIAL (৳${advancePaid.toLocaleString()} paid)`;
  } else if (paymentStatusRaw) {
    paymentStatus = paymentStatusRaw.toUpperCase();
  }

  const orderNote = cleanNoteText(order.notes || order.note || order.special_instructions || order.customer_note);

  return {
    orderId,
    orderNumber,
    dateFormatted,
    timeFormatted,
    rawDate: dateObj.toISOString(),
    customerName,
    customerPhone,
    deliveryAddress,
    deliveryArea,
    courierName,
    trackingId,
    items,
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    subtotal,
    discount,
    deliveryCharge,
    advancePaid,
    grandTotal,
    cashToCollect,
    paymentMethod,
    paymentStatus,
    isPaid,
    orderNote: orderNote || undefined,
    status: order.status || 'pending',
    rawOrder: order,
  };
}
