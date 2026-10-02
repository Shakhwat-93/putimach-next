export interface MappedInvoiceItem {
  id?: string | number;
  name: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sku?: string;
  image?: string;
}

export interface MappedInvoiceData {
  orderId: string;
  orderNumber: string;
  dateFormatted: string;
  timeFormatted: string;
  rawDate: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryArea?: string;
  courierName?: string;
  trackingId?: string;
  items: MappedInvoiceItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  advancePaid: number;
  grandTotal: number;
  cashToCollect: number;
  paymentMethod: string;
  paymentStatus: string;
  isPaid: boolean;
  orderNote?: string;
  status: string;
  rawOrder: any;
}

export interface BrandInfo {
  name: string;
  logo?: string;
  phone: string;
  email?: string;
  address: string;
  website?: string;
  slogan?: string;
  bin?: string;
  terms?: string;
}

export interface InvoicePrintToggles {
  showLogo?: boolean;
  showImages?: boolean;
  showPrices?: boolean;
  showBarcode?: boolean;
  showTerms?: boolean;
  showSignature?: boolean;
  monochrome?: boolean;
}

export type InvoicePrintFormat = 'a4-invoice' | 'thermal-pos-58mm' | 'thermal-pos-80mm' | 'thermal-sticker-4x6' | 'a4-grid-2up';
