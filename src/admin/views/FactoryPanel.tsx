'use client';
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import './FactoryPanel.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { OrderEditModal } from '../components/OrderEditModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { Loader2, CheckCircle, PackageSearch, Zap, AlertTriangle, Package, Edit2, Download, FileSpreadsheet, CalendarDays, Truck, History } from 'lucide-react';
import { PremiumSearch } from '../components/PremiumSearch';
import { usePersistentState } from '../utils/persistentState';
import { getToyBoxStockKey } from '../utils/productCatalog';
import { useRouteOrderReadState } from '../hooks/useRouteOrderReadState';
import * as XLSX from 'xlsx';
import { BulkExportModal } from '../components/BulkExportModal';

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};
const FACTORY_PAGE_SIZE = 10;

const getVisiblePageNumbers = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const formatExportDate = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisMonth', label: 'This Month' }
];

const EXPORT_PRESETS = [
  { id: 'sinceLast', label: 'Since Last Export' },
  ...DATE_PRESETS
];

const EXPORT_HISTORY_KEY = 'factory:confirmed-export-history';

const getRangeBoundary = (value, boundary) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  if (boundary === 'start') {
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

const parseDateTimeRangeBoundary = (value, boundary) => {
  if (!value) return null;

  if (value.length === 10) {
    return getRangeBoundary(value, boundary);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toDateTimeLocalValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const formatExportWindow = (from, to, fallback = 'All Time') => {
  const start = from ? formatExportDate(from) : '';
  const end = to ? formatExportDate(to) : '';

  if (start && end) return `${start} - ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return fallback;
};

const matchesDatePreset = (value, preset) => {
  if (!value || preset === 'all') return true;

  const orderDate = new Date(value);
  if (Number.isNaN(orderDate.getTime())) return false;

  const now = new Date();

  if (preset === 'today') {
    return now.getTime() - orderDate.getTime() <= 24 * 60 * 60 * 1000;
  }

  if (preset === 'yesterday') {
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return orderDate >= yesterdayStart && orderDate < yesterdayEnd;
  }

  if (preset === 'thisMonth') {
    return (
      orderDate.getFullYear() === now.getFullYear() &&
      orderDate.getMonth() === now.getMonth()
    );
  }

  return true;
};

const matchesCustomDateRange = (value, startDate, endDate) => {
  if (!value) return false;

  const orderDate = new Date(value);
  if (Number.isNaN(orderDate.getTime())) return false;

  if (startDate && orderDate < startDate) {
    return false;
  }

  if (endDate && orderDate > endDate) {
    return false;
  }

  return true;
};

const formatProductSummary = (order) => {
  const items = Array.isArray(order?.ordered_items) ? order.ordered_items : [];

  if (items.length === 0) {
    const fallbackQty = Number(order?.quantity) || 1;
    return `${order?.product_name || ''} x${fallbackQty}`.trim();
  }

  return items
    .map((item) => {
      const name = item?.name || order?.product_name || 'Item';
      const quantity = Number(item?.quantity) || 1;
      const size = item?.size ? ` (${item.size})` : '';
      return `${name}${size} x${quantity}`;
    })
    .join(', ');
};

const getOrderQuantity = (order) => {
  if (Number(order?.quantity) > 0) return Number(order.quantity);

  const items = getOrderItems(order);
  if (items.length === 0) return 1;

  return items.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0);
};

const getOrderItems = (order) => {
  if (Array.isArray(order?.order_lines_payload) && order.order_lines_payload.length > 0) {
    return order.order_lines_payload;
  }

  if (Array.isArray(order?.ordered_items) && order.ordered_items.length > 0) {
    return order.ordered_items.filter((item) => item && typeof item === 'object');
  }

  return [];
};

const parseEmbeddedDeliveryCharge = (value) => {
  const text = String(value || '');
  const matches = [...text.matchAll(/(\d{2,5})/g)];
  if (matches.length === 0) return null;

  const parsed = Number(matches[matches.length - 1][1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getDeliveryCharge = (order) => {
  const directCharge = Number(order?.delivery_charge);
  if (directCharge > 0) return directCharge;

  const summaryCharge = Number(order?.pricing_summary?.delivery_charge);
  if (summaryCharge > 0) return summaryCharge;

  const embeddedCharge = parseEmbeddedDeliveryCharge(order?.shipping_zone);
  if (embeddedCharge !== null) return embeddedCharge;

  return order?.shipping_zone === 'Inside Dhaka' ? 60 : 130;
};

const getProductPrice = (order) => {
  const items = getOrderItems(order);
  const firstPricedItem = items.find((item) => {
    const unitPrice = Number(item?.unit_price ?? item?.price);
    const lineTotal = Number(item?.line_total);
    return unitPrice > 0 || lineTotal > 0;
  });

  if (firstPricedItem) {
    const unitPrice = Number(firstPricedItem.unit_price ?? firstPricedItem.price);
    if (unitPrice > 0) return unitPrice;

    const quantity = Number(firstPricedItem.quantity) || 1;
    const lineTotal = Number(firstPricedItem.line_total);
    if (lineTotal > 0) return Math.round((lineTotal / quantity) * 100) / 100;
  }

  const pricingSubtotal = Number(order?.pricing_summary?.subtotal);
  const quantity = getOrderQuantity(order);
  if (pricingSubtotal > 0) return Math.round((pricingSubtotal / Math.max(1, quantity)) * 100) / 100;

  const total = Number(order?.amount) || 0;
  const deliveryCharge = getDeliveryCharge(order);
  return Math.round((Math.max(0, total - deliveryCharge) / Math.max(1, quantity)) * 100) / 100;
};

const getTotalAmount = (order) => {
  const total = Number(order?.amount);
  if (total > 0) return total;

  return getProductPrice(order) + getDeliveryCharge(order);
};

const getProductText = (order) => {
  const itemText = Array.isArray(order?.ordered_items)
    ? order.ordered_items.map((item) => [
        item?.name,
        item?.product_name,
        item?.color,
        item?.variant,
        item?.size
      ].filter(Boolean).join(' ')).join(' ')
    : '';

  return [
    order?.product_name,
    order?.size,
    itemText,
    formatProductSummary(order)
  ].filter(Boolean).join(' ');
};

const getOrderShortForm = (order) => {
  const idPrefix = String(order?.id || '').match(/^#?([A-Z]{2,12})[-_]/i)?.[1];
  if (idPrefix && idPrefix.toUpperCase() !== 'ORD') {
    return idPrefix.toUpperCase();
  }

  const productText = getProductText(order).toLowerCase();
  if (productText.includes('toy box') || productText.includes('toybox')) return 'TB';
  if (productText.includes('sunglass') || productText.includes('sunglasses')) return 'Sunglass';
  if (productText.includes('travel bag') || productText.includes('canvas') || productText.includes('bag')) return 'STB';

  return order?.product_name || '';
};

const getColorCode = (order) => {
  const productText = getProductText(order).toLowerCase();
  const knownColors = [
    'black', 'beige', 'silver', 'golden', 'gold', 'blue', 'red',
    'green', 'white', 'brown', 'gray', 'grey', 'pink', 'purple', 'cream'
  ];

  const matches = knownColors.filter((color) => (
    new RegExp(`\\b${color}\\b`, 'i').test(productText)
  ));

  return [...new Set(matches.map((color) => (color === 'gold' ? 'golden' : color)))].join(', ');
};

const EXPORT_COLUMNS = [
  'DATE',
  'NOTE',
  'NAME',
  'ADDRESS',
  'inside and outside',
  'Phone',
  'code',
  'CODE',
  'Source',
  'QTY(TOY)',
  'QTY(MPB)',
  'ORG QTY',
  'MMB',
  'STB BAG',
  'OTHER',
  'toy box am',
  'MPB AM',
  'ORG AM',
  'MMB AM',
  'BAG',
  'OTHER (AM)',
  'DELIVERY CHARGE',
  'Total amount'
];

const EXPORT_QTY_COLUMNS = {
  toy: 'QTY(TOY)',
  mpb: 'QTY(MPB)',
  org: 'ORG QTY',
  mmb: 'MMB',
  stb: 'STB BAG',
  other: 'OTHER'
};

const EXPORT_AMOUNT_COLUMNS = {
  toy: 'toy box am',
  mpb: 'MPB AM',
  org: 'ORG AM',
  mmb: 'MMB AM',
  stb: 'BAG',
  other: 'OTHER (AM)'
};

const formatSheetDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatExportPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.replace(/^88/, '').replace(/^0/, '');
};

const formatExportZone = (value = '') => {
  const text = String(value || '').replace(/\(?৳?\d{2,5}\)?/g, '').replace(/\s+/g, ' ').trim();
  const normalized = text.toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('inside') || normalized === 'dhaka') return 'Dhaka';
  if (normalized.includes('outside')) return 'Outside Dhaka';
  return text;
};

const formatExportSource = (value = '') => {
  const source = String(value || '').trim();
  if (!source) return '';
  if (source.toLowerCase() === 'website') return 'NEW WEB';
  return source.toUpperCase();
};

const getItemText = (item, order) => [
  item?.name,
  item?.product_name,
  item?.product,
  item?.title,
  item?.variant,
  item?.color,
  item?.size,
  order?.product_name,
  order?.size
].filter(Boolean).join(' ');

const getExportCategory = (text = '') => {
  const normalized = String(text || '').toLowerCase();
  if (normalized.includes('toy box') || normalized.includes('toybox')) return 'toy';
  if (normalized.includes('mpb') || normalized.includes('multipurpose') || normalized.includes('multi purpose')) return 'mpb';
  if (normalized.includes('org') || normalized.includes('organizer') || normalized.includes('organiser')) return 'org';
  if (normalized.includes('mmb') || normalized.includes('mini')) return 'mmb';
  if (normalized.includes('stb') || normalized.includes('travel bag') || normalized.includes('canvas') || /\bbag\b/.test(normalized)) return 'stb';
  return 'other';
};

const getExportCode = (order) => {
  const category = getExportCategory(getProductText(order));
  if (category === 'toy') return 'Toy Box';
  if (category === 'mpb') return 'MPB';
  if (category === 'org') return 'ORG';
  if (category === 'mmb') return 'MMB';
  if (category === 'stb') return 'Travel bag';
  return order?.product_name || 'OTHER';
};

const toTitleCase = (value = '') => String(value || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');

const getExportVariantCode = (order) => {
  const shortCode = getOrderShortForm(order);
  const colors = toTitleCase(getColorCode(order));
  return [shortCode, colors].filter(Boolean).join(' ').trim();
};

const getItemQuantity = (item) => Math.max(1, Number(item?.quantity ?? item?.qty) || 1);

const getItemAmount = (item) => {
  const quantity = getItemQuantity(item);
  const lineTotal = Number(item?.line_total ?? item?.total ?? item?.amount);
  if (lineTotal > 0) return lineTotal;

  const unitPrice = Number(item?.unit_price ?? item?.price);
  if (unitPrice > 0) return unitPrice * quantity;

  return 0;
};

const buildConfirmedExportRow = (order) => {
  const row = Object.fromEntries(EXPORT_COLUMNS.map((column) => [column, '']));
  const deliveryCharge = getDeliveryCharge(order);
  const totalAmount = getTotalAmount(order);
  const productAmount = Math.max(0, totalAmount - deliveryCharge);
  const items = getOrderItems(order);

  row.DATE = formatSheetDate(order.created_at);
  row.NOTE = order.notes || '';
  row.NAME = order.customer_name || '';
  row.ADDRESS = order.address || '';
  row['inside and outside'] = formatExportZone(order.shipping_zone);
  row.Phone = formatExportPhone(order.phone);
  row.code = getExportCode(order);
  row.CODE = getExportVariantCode(order);
  row.Source = formatExportSource(order.source);
  row['DELIVERY CHARGE'] = deliveryCharge || '';
  row['Total amount'] = totalAmount || '';

  if (items.length === 0) {
    const category = getExportCategory(getProductText(order));
    row[EXPORT_QTY_COLUMNS[category]] = getOrderQuantity(order);
    row[EXPORT_AMOUNT_COLUMNS[category]] = productAmount || '';
    return row;
  }

  let allocatedAmount = 0;
  items.forEach((item) => {
    const category = getExportCategory(getItemText(item, order));
    const qtyColumn = EXPORT_QTY_COLUMNS[category];
    const amountColumn = EXPORT_AMOUNT_COLUMNS[category];
    const quantity = getItemQuantity(item);
    const amount = getItemAmount(item);

    row[qtyColumn] = (Number(row[qtyColumn]) || 0) + quantity;
    if (amount > 0) {
      row[amountColumn] = (Number(row[amountColumn]) || 0) + amount;
      allocatedAmount += amount;
    }
  });

  if (allocatedAmount === 0) {
    const category = getExportCategory(getProductText(order));
    row[EXPORT_AMOUNT_COLUMNS[category]] = productAmount || '';
  }

  return row;
};

export const FactoryPanel = () => {
  const { confirmDialog, alertDialog, showSuccess, showError, ConfirmDialogComponent } = useConfirmDialog();
  const { orders, toyBoxes, autoDistributeOrders, updateOrderStatus, dispatchToCourier, dispatchToPathao } = useOrders();
  const { updatePresenceContext, profile, user } = useAuth();

  const [courierPending, setCourierPending] = useState({});

  const handleSteadfastDispatch = (e, order) => {
    if (e) e.stopPropagation();
    const orderId = order.id;
    if (courierPending[orderId]) return;

    const doDispatch = async () => {
      setCourierPending(prev => ({ ...prev, [orderId]: 'steadfast' }));
      try {
        await dispatchToCourier(orderId);
        showSuccess('Order successfully submitted to Steadfast!', 'Dispatch Successful');
      } catch (err) {
        showError(err.message, 'Steadfast Dispatch Failed');
      } finally {
        setCourierPending(prev => { const next = { ...prev }; delete next[orderId]; return next; });
      }
    };

    const stock = getStockStatus(order);
    if (!stock.matched) {
      confirmDialog({
        title: 'Low Stock Warning',
        description: 'This order does not have full stock in inventory. Do you still want to dispatch to Steadfast?',
        confirmLabel: 'Dispatch Anyway',
        isDanger: true,
        onConfirm: doDispatch,
      });
    } else {
      doDispatch();
    }
  };

  const handlePathaoDispatch = (e, order) => {
    if (e) e.stopPropagation();
    const orderId = order.id;
    if (courierPending[orderId]) return;

    const doDispatch = async () => {
      setCourierPending(prev => ({ ...prev, [orderId]: 'pathao' }));
      try {
        await dispatchToPathao(orderId);
        showSuccess('Order successfully submitted to Pathao!', 'Dispatch Successful');
      } catch (err) {
        showError(err.message, 'Pathao Dispatch Failed');
      } finally {
        setCourierPending(prev => { const next = { ...prev }; delete next[orderId]; return next; });
      }
    };

    const stock = getStockStatus(order);
    if (!stock.matched) {
      confirmDialog({
        title: 'Low Stock Warning',
        description: 'This order does not have full stock in inventory. Do you still want to dispatch to Pathao?',
        confirmLabel: 'Dispatch Anyway',
        isDanger: true,
        onConfirm: doDispatch,
      });
    } else {
      doDispatch();
    }
  };

  const handleBulkSteadfastDispatch = () => {
    const ids = [...selectedConfirmedIds];
    if (ids.length === 0) return;
    confirmDialog({
      title: 'Bulk Steadfast Dispatch',
      description: `Send all ${ids.length} selected orders to Steadfast?`,
      confirmLabel: 'Send All',
      onConfirm: async () => {
        setIsMovingSelectedConfirmed(true);
        let successCount = 0; let failCount = 0;
        for (const orderId of ids) {
          try { await dispatchToCourier(orderId); successCount++; }
          catch (err) { console.error(`Failed #${orderId}:`, err); failCount++; }
        }
        setIsMovingSelectedConfirmed(false);
        setSelectedConfirmedIds([]);
        alertDialog({
          title: 'Bulk Dispatch Complete',
          message: `✅ Sent to Steadfast: ${successCount}${failCount > 0 ? `\n❌ Failed: ${failCount}` : ''}`,
          type: failCount > 0 ? 'warning' : 'success',
        });
      },
    });
  };

  const handleBulkPathaoDispatch = () => {
    const ids = [...selectedConfirmedIds];
    if (ids.length === 0) return;
    confirmDialog({
      title: 'Bulk Pathao Dispatch',
      description: `Send all ${ids.length} selected orders to Pathao?`,
      confirmLabel: 'Send All',
      onConfirm: async () => {
        setIsMovingSelectedConfirmed(true);
        let successCount = 0; let failCount = 0;
        for (const orderId of ids) {
          try { await dispatchToPathao(orderId); successCount++; }
          catch (err) { console.error(`Failed #${orderId}:`, err); failCount++; }
        }
        setIsMovingSelectedConfirmed(false);
        setSelectedConfirmedIds([]);
        alertDialog({
          title: 'Bulk Dispatch Complete',
          message: `✅ Sent to Pathao: ${successCount}${failCount > 0 ? `\n❌ Failed: ${failCount}` : ''}`,
          type: failCount > 0 ? 'warning' : 'success',
        });
      },
    });
  };

  useEffect(() => {
    updatePresenceContext('Reviewing Confirmed Orders');
  }, [updatePresenceContext]);
  
  const [searchTerm, setSearchTerm] = usePersistentState('panel:factory:search', '');
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState(null);
  const [activeTab, setActiveTab] = usePersistentState('panel:factory:tab', 'confirmed'); // 'confirmed' | 'queued'
  const [datePreset, setDatePreset] = usePersistentState('panel:factory:date-preset', 'all');
  const [dateFrom, setDateFrom] = usePersistentState('panel:factory:date-from', '');
  const [dateTo, setDateTo] = usePersistentState('panel:factory:date-to', '');
  const [currentPage, setCurrentPage] = useState(1);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exportDatePreset, setExportDatePreset] = useState('sinceLast');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportHistory, setExportHistory] = useState(() => {
    try {
      const raw = (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem(EXPORT_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [lastExportedBatch, setLastExportedBatch] = useState(null);
  const [isMovingExportBatch, setIsMovingExportBatch] = useState(false);
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [selectedConfirmedIds, setSelectedConfirmedIds] = useState([]);
  const [isMovingSelectedConfirmed, setIsMovingSelectedConfirmed] = useState(false);

  useEffect(() => {
    try {
      (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem(EXPORT_HISTORY_KEY, JSON.stringify(exportHistory.slice(0, 20)));
    } catch {
      // Export history is a convenience layer; exporting should not depend on storage.
    }
  }, [exportHistory]);

  const handleOpenEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleRowClick = (order) => {
    markOrderRead(order);
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  // Confirmed = incoming, Factory Queue = waiting for stock
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const rangeStartDate = useMemo(() => getRangeBoundary(dateFrom, 'start'), [dateFrom]);
  const rangeEndDate = useMemo(() => getRangeBoundary(dateTo, 'end'), [dateTo]);
  const hasCustomRange = Boolean(dateFrom || dateTo);

  const matchesActiveDateFilter = (value) => {
    if (hasCustomRange) {
      return matchesCustomDateRange(value, rangeStartDate, rangeEndDate);
    }

    return matchesDatePreset(value, datePreset);
  };

  const matchesPanelFilters = (order) => (
    (
      order.id.toLowerCase().includes(normalizedSearchTerm) ||
      (order.product_name || '').toLowerCase().includes(normalizedSearchTerm) ||
      (order.customer_name || '').toLowerCase().includes(normalizedSearchTerm)
    ) &&
    matchesActiveDateFilter(order.created_at)
  );

  const matchesSearchFilter = (order) => (
    order.id.toLowerCase().includes(normalizedSearchTerm) ||
    (order.product_name || '').toLowerCase().includes(normalizedSearchTerm) ||
    (order.customer_name || '').toLowerCase().includes(normalizedSearchTerm)
  );

  const confirmedOrders = orders.filter(
    (order) => order.status === 'Confirmed' && matchesPanelFilters(order)
  );

  const queuedOrders = orders.filter(
    (order) => order.status === 'Factory Queue' && matchesPanelFilters(order)
  );

  const displayOrders = activeTab === 'confirmed' ? confirmedOrders : queuedOrders;
  const { isOrderUnread, markOrderRead, unreadCount } = useRouteOrderReadState(`confirmed-panel:${activeTab}`, displayOrders);
  const latestExportHistory = exportHistory[0] || null;
  const latestConfirmedExportHistory = exportHistory.find((item) => item.tab === 'confirmed') || null;
  const exportRangeStartDate = useMemo(() => parseDateTimeRangeBoundary(exportDateFrom, 'start'), [exportDateFrom]);
  const exportRangeEndDate = useMemo(() => parseDateTimeRangeBoundary(exportDateTo, 'end'), [exportDateTo]);
  const exportHasCustomRange = exportDatePreset !== 'sinceLast' && Boolean(exportDateFrom || exportDateTo);
  const totalPages = Math.max(1, Math.ceil(displayOrders.length / FACTORY_PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * FACTORY_PAGE_SIZE;
    return displayOrders.slice(startIndex, startIndex + FACTORY_PAGE_SIZE);
  }, [displayOrders, currentPage]);
  const visiblePages = useMemo(() => getVisiblePageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, datePreset, dateFrom, dateTo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedConfirmedIds((prev) => {
      const next = prev.filter((id) => confirmedOrders.some((order) => order.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [confirmedOrders]);

  useEffect(() => {
    if (activeTab !== 'confirmed') {
      setSelectedConfirmedIds([]);
    }
  }, [activeTab]);

  const selectedConfirmedOrders = useMemo(
    () => confirmedOrders.filter((order) => selectedConfirmedIds.includes(order.id)),
    [confirmedOrders, selectedConfirmedIds]
  );

  const paginatedConfirmedIds = useMemo(
    () => paginatedOrders
      .filter((order) => order.status === 'Confirmed')
      .map((order) => order.id),
    [paginatedOrders]
  );

  const isCurrentPageSelected = paginatedConfirmedIds.length > 0 &&
    paginatedConfirmedIds.every((id) => selectedConfirmedIds.includes(id));

  const handleSelectConfirmedOrder = (orderId) => {
    setSelectedConfirmedIds((prev) => (
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    ));
  };

  const handleSelectConfirmedPage = () => {
    if (isCurrentPageSelected) {
      setSelectedConfirmedIds((prev) => prev.filter((id) => !paginatedConfirmedIds.includes(id)));
      return;
    }

    setSelectedConfirmedIds((prev) => Array.from(new Set([...prev, ...paginatedConfirmedIds])));
  };

  const handleMoveSelectedToBulkExported = () => {
    if (selectedConfirmedOrders.length === 0) return;
    confirmDialog({
      title: 'Move to Bulk Exported',
      description: `Move ${selectedConfirmedOrders.length} selected confirmed orders to Bulk Exported?`,
      confirmLabel: 'Move',
      onConfirm: async () => {
        setIsMovingSelectedConfirmed(true);
        try {
          for (const order of selectedConfirmedOrders) {
            await updateOrderStatus(order.id, 'Bulk Exported');
          }
          setSelectedConfirmedIds([]);
          setDistributeResult({
            distributed: selectedConfirmedOrders.length,
            queued: 0,
            total: selectedConfirmedOrders.length,
            sourceStatus: 'Manual move to Bulk Exported'
          });
          setTimeout(() => setDistributeResult(null), 6000);
        } catch (error) {
          console.error('Selected confirmed move failed:', error);
          showError(error.message, 'Move Failed');
        } finally {
          setIsMovingSelectedConfirmed(false);
        }
      },
    });
  };

  // Stock availability check helper
  const getStockStatus = (order) => {
    const items = order.ordered_items || [];
    const isToyBox = (order.product_name || '').toUpperCase().includes('TOY BOX');
    if (!isToyBox || items.length === 0) return { matched: true, label: 'Auto Pass', missing: [] };

    const stockMap = {};
    toyBoxes.forEach((box) => {
      stockMap[getToyBoxStockKey(box.product_name || 'TOY BOX', box.toy_box_number)] = Number(box.stock_quantity) || 0;
    });

    const missing = items.filter(item => {
      const boxNum = typeof item === 'object' ? item.toyBoxNumber : item;
      if (boxNum == null) return false;
      const productName = typeof item === 'object' ? (item.name || order.product_name || 'TOY BOX') : 'TOY BOX';
      return (stockMap[getToyBoxStockKey(productName, boxNum)] || 0) < 1;
    });

    return {
      matched: missing.length === 0,
      label: missing.length === 0 ? 'Stock OK' : `${missing.length} Missing`,
      missing
    };
  };

  const handleAutoDistribute = async () => {
    setIsDistributing(true);
    setDistributeResult(null);
    try {
      const result = await autoDistributeOrders();
      setDistributeResult(result);
      setTimeout(() => setDistributeResult(null), 8000);
    } catch (error) {
      console.error('Auto distribute error:', error);
      setDistributeResult({ error: error.message });
    } finally {
      setIsDistributing(false);
    }
  };

  const handleManualSend = async (orderId) => {
    await updateOrderStatus(orderId, 'Courier Ready');
  };

  const handleRetryDistribute = async (orderId) => {
    await updateOrderStatus(orderId, 'Confirmed');
  };

  const getExportOrders = (preset, from, to) => {
    const startDate = parseDateTimeRangeBoundary(from, 'start');
    const endDate = parseDateTimeRangeBoundary(to, 'end');
    const hasRange = preset !== 'sinceLast' && Boolean(from || to);
    const targetStatus = activeTab === 'confirmed' ? 'Confirmed' : 'Factory Queue';
    const sinceLastStart = preset === 'sinceLast' && activeTab === 'confirmed' && latestConfirmedExportHistory?.exported_until
      ? new Date(latestConfirmedExportHistory.exported_until)
      : null;
    const sinceLastEnd = preset === 'sinceLast'
      ? (endDate || new Date())
      : null;

    return orders.filter((order) => {
      if (order.status !== targetStatus) {
        return false;
      }

      if (!matchesSearchFilter(order)) {
        return false;
      }

      if (preset === 'sinceLast') {
        return matchesCustomDateRange(order.created_at, sinceLastStart, sinceLastEnd);
      }

      if (hasRange) {
        return matchesCustomDateRange(order.created_at, startDate, endDate);
      }

      return matchesDatePreset(order.created_at, preset);
    });
  };

  const exportPreviewOrders = useMemo(
    () => getExportOrders(exportDatePreset, exportDateFrom, exportDateTo),
    [orders, activeTab, normalizedSearchTerm, exportDatePreset, exportDateFrom, exportDateTo, latestConfirmedExportHistory?.exported_until]
  );

  const handlePresetChange = (presetId) => {
    setDatePreset(presetId);
    setDateFrom('');
    setDateTo('');
  };

  const handleDateRangeChange = (field, value) => {
    setDatePreset('all');

    if (field === 'from') {
      setDateFrom(value);
      return;
    }

    setDateTo(value);
  };

  const handleClearDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setDatePreset('all');
  };

  const handleOpenExportModal = () => {
    const defaultPreset = activeTab === 'confirmed' ? 'sinceLast' : datePreset;
    setExportDatePreset(defaultPreset);
    setExportDateFrom('');
    setExportDateTo(defaultPreset === 'sinceLast' ? toDateTimeLocalValue(new Date()) : '');
    setLastExportedBatch(null);
    setIsExportModalOpen(true);
  };

  const handleExportPresetChange = (presetId) => {
    setExportDatePreset(presetId);
    setExportDateFrom('');
    setExportDateTo(presetId === 'sinceLast' ? toDateTimeLocalValue(new Date()) : '');
  };

  const handleExportDateRangeChange = (field, value) => {
    if (!(exportDatePreset === 'sinceLast' && field === 'to')) {
      setExportDatePreset('all');
    }

    if (field === 'from') {
      setExportDateFrom(value);
      return;
    }

    setExportDateTo(value);
  };

  const handleClearExportDateRange = () => {
    setExportDatePreset(activeTab === 'confirmed' ? 'sinceLast' : 'all');
    setExportDateFrom('');
    setExportDateTo(activeTab === 'confirmed' ? toDateTimeLocalValue(new Date()) : '');
  };

  const handleBulkExport = async () => {
    if (exportPreviewOrders.length === 0) return;
    setIsExportingBatch(true);
    const exportedAt = new Date().toISOString();
    const exportedBy = profile?.name || user?.user_metadata?.full_name || user?.email || 'Unknown User';
    const sortedExportOrders = [...exportPreviewOrders].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    const lastOrder = sortedExportOrders[sortedExportOrders.length - 1] || null;
    const explicitEnd = exportRangeEndDate && !Number.isNaN(exportRangeEndDate.getTime())
      ? exportRangeEndDate.toISOString()
      : exportedAt;
    const explicitStart = exportDatePreset === 'sinceLast'
      ? latestConfirmedExportHistory?.exported_until || null
      : (exportRangeStartDate && !Number.isNaN(exportRangeStartDate.getTime()) ? exportRangeStartDate.toISOString() : null);

    const exportRows = sortedExportOrders.map(buildConfirmedExportRow);

    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: EXPORT_COLUMNS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'confirmed' ? 'Confirmed Orders' : 'Queued Orders');

    const dateLabel = new Date().toISOString().split('T')[0];
    const tabLabel = activeTab === 'confirmed' ? 'confirmed' : 'queue';
    const rangeLabel = exportHasCustomRange
      ? `range-${(exportDateFrom || 'start').replace(':', '')}-to-${(exportDateTo || 'now').replace(':', '')}`
      : (exportDatePreset === 'sinceLast' ? 'since-last-export' : (exportDatePreset === 'all' ? 'all-time' : exportDatePreset.toLowerCase()));
    XLSX.writeFile(workbook, `confirmed-panel-${tabLabel}-${rangeLabel}-${dateLabel}.xlsx`);

    const batch = {
      id: `export-${Date.now()}`,
      tab: activeTab,
      exported_at: exportedAt,
      exported_by: exportedBy,
      exported_from: explicitStart,
      exported_until: explicitEnd,
      preset: exportDatePreset,
      order_count: sortedExportOrders.length,
      order_ids: sortedExportOrders.map((order) => order.id),
      last_order_id: lastOrder?.id || null,
      last_order_created_at: lastOrder?.created_at || null,
      moved_to_courier_at: null,
      moved_to_courier_by: null
    };

    try {
      let updatedBatch = batch;

      if (activeTab === 'confirmed') {
        const movedAt = new Date().toISOString();
        for (const order of sortedExportOrders) {
          if (order.status === 'Confirmed') {
            // Sequential updates keep load low while live orders continue coming in.
            await updateOrderStatus(order.id, 'Bulk Exported');
          }
        }

        updatedBatch = {
          ...batch,
          moved_to_courier_at: movedAt,
          moved_to_courier_by: exportedBy,
          moved_count: sortedExportOrders.length
        };
      }

      setLastExportedBatch(updatedBatch);
      setExportHistory((prev) => [updatedBatch, ...prev].slice(0, 20));
    } catch (error) {
      console.error('Export batch move failed:', error);
      setLastExportedBatch(batch);
      setExportHistory((prev) => [batch, ...prev].slice(0, 20));
      showError(`Export downloaded, but moving orders failed: ${error.message}`, 'Partial Failure');
    } finally {
      setIsExportingBatch(false);
    }
  };

  const handleMoveExportedToCourier = () => {
    if (!lastExportedBatch?.order_ids?.length || activeTab !== 'confirmed') return;

    const targetOrders = orders.filter((order) =>
      lastExportedBatch.order_ids.includes(order.id) &&
      order.status === 'Confirmed'
    );

    if (targetOrders.length === 0) {
      showInfo('No confirmed orders from this export batch are left to move.', 'Nothing to Move');
      return;
    }

    confirmDialog({
      title: 'Move Exported Orders',
      description: `Move ${targetOrders.length} exported orders to Bulk Exported?`,
      confirmLabel: 'Move',
      onConfirm: async () => {
        setIsMovingExportBatch(true);
        const movedBy = profile?.name || user?.user_metadata?.full_name || user?.email || 'Unknown User';
        const movedAt = new Date().toISOString();

        try {
          for (const order of targetOrders) {
            // Sequential updates keep load low on the live order system.
            await updateOrderStatus(order.id, 'Bulk Exported');
          }

          const updatedBatch = {
            ...lastExportedBatch,
            moved_to_courier_at: movedAt,
            moved_to_courier_by: movedBy,
            moved_count: targetOrders.length
          };

          setLastExportedBatch(updatedBatch);
          setExportHistory((prev) => prev.map((item) => (
            item.id === updatedBatch.id ? updatedBatch : item
          )));
        } catch (error) {
          console.error('Moving exported orders failed:', error);
          showError(error.message, 'Move Failed');
        } finally {
          setIsMovingExportBatch(false);
        }
      },
    });
  };

  const exportScopeLabel = exportHasCustomRange
    ? 'Custom Date & Time'
    : EXPORT_PRESETS.find((preset) => preset.id === exportDatePreset)?.label;
  const exportWindowLabel = exportHasCustomRange
    ? formatExportWindow(exportRangeStartDate, exportRangeEndDate, 'Custom Date & Time')
    : exportDatePreset === 'sinceLast'
      ? formatExportWindow(latestConfirmedExportHistory?.exported_until, exportRangeEndDate || new Date(), latestConfirmedExportHistory ? 'Since Last Export' : 'New export window')
      : exportScopeLabel;

  return (
    <motion.div 
      className="p-3 sm:p-4 md:p-8 space-y-6 bg-background min-h-screen font-sans w-full max-w-full overflow-x-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Confirmed Panel</h1>
          <p className="text-muted-foreground mt-1 text-sm">Confirmed order review, distribution and inventory verification hub.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleOpenExportModal}
            className="rounded-xl px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2"
          >
            <FileSpreadsheet size={18} />
            <span>Bulk Export ({confirmedOrders.length})</span>
            <Download size={16} />
          </Button>
        </div>
      </header>

      {/* Result Toast */}
      <AnimatePresence>
        {distributeResult && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-3 p-4 rounded-xl border font-medium ${distributeResult.error ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}
          >
            {distributeResult.error ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>
              {distributeResult.error ? `Error: ${distributeResult.error}` : (
                <>
                  Distribution complete! <strong>{distributeResult.distributed}</strong> Approvals, 
                  <strong> {distributeResult.queued}</strong> Queued for stock.
                </>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="flex items-center gap-4 p-5 animate-slide-up border-border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600"><Package size={22} /></div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Confirmed</span>
              <span className="block text-2xl font-bold text-foreground">{confirmedOrders.length}</span>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="flex items-center gap-4 p-5 animate-slide-up border-border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600"><AlertTriangle size={22} /></div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Total Queued</span>
              <span className="block text-2xl font-bold text-foreground">{queuedOrders.length}</span>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="flex items-center gap-4 p-5 animate-slide-up border-border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600"><CheckCircle size={22} /></div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Bulk Exported</span>
              <span className="block text-2xl font-bold text-foreground">{orders.filter(o => o.status === 'Bulk Exported').length}</span>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Tab Toggle - Scrollable pill strip without layout overflow */}
      <div className="w-full max-w-full overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2 w-max bg-secondary/30 p-1.5 rounded-2xl border border-border">
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'confirmed' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`} 
            onClick={() => setActiveTab('confirmed')}
          >
            <Package size={16} /> Confirmed ({confirmedOrders.length})
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'queued' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`} 
            onClick={() => setActiveTab('queued')}
          >
            <AlertTriangle size={16} /> Queue ({queuedOrders.length})
          </button>
        </div>
      </div>

      <Card className="flex flex-col gap-4 border-border overflow-hidden">
        {/* Filter bar: column mobile, row desktop */}
        <div className="flex flex-col md:flex-row gap-4 p-4 md:items-center bg-card">
          <div className="flex-1">
            <PremiumSearch
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name or product..."
              suggestions={
                searchTerm ? orders.filter(o => 
                  o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (o.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 5).map(o => ({
                  id: o.id,
                  label: o.customer_name,
                  sub: `${o.id} • ${o.product_name}`,
                  type: 'order',
                  original: o
                })) : []
              }
              onSuggestionClick={(item) => {
                if (item.type === 'order') {
                  handleRowClick(item.original);
                }
              }}
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-2">
                <CalendarDays size={14} />
                <span>FILTER</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!hasCustomRange && datePreset === preset.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="factory-date-from">From</label>
                <input
                  id="factory-date-from"
                  type="date"
                  className="bg-secondary/50 border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={dateFrom}
                  onChange={(event) => handleDateRangeChange('from', event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="factory-date-to">To</label>
                <input
                  id="factory-date-to"
                  type="date"
                  className="bg-secondary/50 border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={dateTo}
                  onChange={(event) => handleDateRangeChange('to', event.target.value)}
                />
              </div>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 disabled:opacity-50"
                onClick={handleClearDateRange}
                disabled={!hasCustomRange && datePreset === 'all'}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {unreadCount > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold" title="Orders not opened in this Confirmed panel tab">
              {unreadCount} unread
            </span>
          )}
          <span className="bg-secondary px-2 py-0.5 rounded-md text-xs font-medium border border-border">
            {hasCustomRange ? 'Custom Range' : DATE_PRESETS.find((preset) => preset.id === datePreset)?.label}
          </span>
          <span>{displayOrders.length} records found</span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-2xl border-t border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                {activeTab === 'confirmed' && (
                  <th className="p-3 text-center w-12">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      checked={isCurrentPageSelected}
                      onChange={handleSelectConfirmedPage}
                      disabled={paginatedConfirmedIds.length === 0 || isMovingSelectedConfirmed}
                      aria-label="Select visible confirmed orders"
                    />
                  </th>
                )}
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipient</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Focus Products</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Status</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {paginatedOrders.map(order => {
                  const stock = getStockStatus(order);
                  const isToyBox = (order.product_name || '').toUpperCase().includes('TOY BOX');
                  
                  return (
                    <motion.tr 
                      key={order.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-secondary/30 transition-colors cursor-pointer group ${isOrderUnread(order) ? 'bg-primary/5' : ''}`}
                      onClick={() => handleRowClick(order)}
                    >
                      {activeTab === 'confirmed' && (
                        <td className="p-3 text-center" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            checked={selectedConfirmedIds.includes(order.id)}
                            onChange={() => handleSelectConfirmedOrder(order.id)}
                            disabled={isMovingSelectedConfirmed || order.status !== 'Confirmed'}
                            aria-label={`Select order ${order.id}`}
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread order" />}
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">#{(order.id || '').replace('ORD-', '')}</span>
                          {isOrderUnread(order) && <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{order.customer_name}</span>
                          <span className="text-xs text-muted-foreground">{order.phone}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{order.product_name}</span>
                            {order.size && <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md">T-{order.size}</span>}
                          </div>
                          {isToyBox && (order.ordered_items || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(order.ordered_items || []).map((item, idx) => {
                                const boxNum = typeof item === 'object' ? item.toyBoxNumber : item;
                                if (boxNum == null) return null;
                                const productName = typeof item === 'object' ? (item.name || order.product_name || 'TOY BOX') : 'TOY BOX';
                                const stockKey = getToyBoxStockKey(productName, boxNum);
                                const stockQty = toyBoxes.find((box) => getToyBoxStockKey(box.product_name || 'TOY BOX', box.toy_box_number) === stockKey)?.stock_quantity || 0;
                                const isOut = stockQty < 1;

                                return (
                                  <span key={`${order.id}-item-${idx}`} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isOut ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-secondary text-secondary-foreground border-border'}`}>
                                    {item?.name ? `${item.name.charAt(0)}${boxNum}` : `#${boxNum}`}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${stock.matched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stock.matched ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {stock.matched ? 'Full Stock' : `${stock.missing.length} Missing`}
                          </span>
                          {!stock.matched && (
                             <span className="text-[10px] text-muted-foreground">Awaiting replenishment</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(order); }} title="Adjust Order">
                            <Edit2 size={16} />
                          </button>
                          {order.status === 'Factory Queue' && (
                            <button className="flex items-center justify-center p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" onClick={(e) => { e.stopPropagation(); handleRetryDistribute(order.id); }} title="Recheck Inventory">
                               <Zap size={16} />
                             </button>
                          )}
                          {order.status === 'Confirmed' && (
                            <>
                              <button 
                                className="flex items-center justify-center p-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                                onClick={(e) => handleSteadfastDispatch(e, order)}
                                disabled={Boolean(courierPending[order.id])}
                                title="Send to Steadfast"
                              >
                                {courierPending[order.id] === 'steadfast' ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                              </button>
                              <button 
                                className="flex items-center justify-center p-2 rounded-lg text-orange-600 bg-orange-100 hover:bg-orange-200 transition-colors disabled:opacity-50"
                                onClick={(e) => handlePathaoDispatch(e, order)}
                                disabled={Boolean(courierPending[order.id])}
                                title="Send to Pathao"
                              >
                                {courierPending[order.id] === 'pathao' ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {displayOrders.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'confirmed' ? 6 : 5} className="p-12 text-center">
                    <motion.div 
                      className="flex flex-col items-center justify-center text-muted-foreground"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <PackageSearch size={48} className="opacity-20 mb-4" />
                      <h3 className="text-lg font-bold text-foreground">No records found</h3>
                      <p className="text-sm mt-1">
                        {activeTab === 'confirmed' 
                          ? 'Incoming confirmed orders will appear here for verification.' 
                          : 'Queue is empty. No orders are currently blocked due to stock.'}
                      </p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3 px-4 py-2">
          <AnimatePresence mode="popLayout">
            {paginatedOrders.map(order => {
              const stock = getStockStatus(order);
              const isToyBox = (order.product_name || '').toUpperCase().includes('TOY BOX');
              
              return (
                <motion.div 
                  key={order.id} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-card rounded-2xl border p-4 shadow-sm relative ${isOrderUnread(order) ? 'border-primary/30' : 'border-border'}`}
                  onClick={() => handleRowClick(order)}
                >
                  {isOrderUnread(order) && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                      <div className="absolute top-2 -right-6 bg-primary text-primary-foreground text-[8px] font-bold py-0.5 px-6 transform rotate-45 uppercase tracking-wider">
                        New
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {activeTab === 'confirmed' && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-border text-primary focus:ring-primary h-5 w-5"
                            checked={selectedConfirmedIds.includes(order.id)}
                            onChange={() => handleSelectConfirmedOrder(order.id)}
                            disabled={isMovingSelectedConfirmed || order.status !== 'Confirmed'}
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-foreground text-lg">#{(order.id || '').replace('ORD-', '')}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_name} • {order.phone}</div>
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(order); }}>
                      <Edit2 size={18} />
                    </button>
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-3 mb-3 border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-foreground">{order.product_name}</div>
                      {order.size && <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md ml-2 shrink-0">T-{order.size}</span>}
                    </div>
                    
                    {isToyBox && (order.ordered_items || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                        {(order.ordered_items || []).map((item, idx) => {
                          const boxNum = typeof item === 'object' ? item.toyBoxNumber : item;
                          if (boxNum == null) return null;
                          const productName = typeof item === 'object' ? (item.name || order.product_name || 'TOY BOX') : 'TOY BOX';
                          const stockKey = getToyBoxStockKey(productName, boxNum);
                          const stockQty = toyBoxes.find((box) => getToyBoxStockKey(box.product_name || 'TOY BOX', box.toy_box_number) === stockKey)?.stock_quantity || 0;
                          const isOut = stockQty < 1;

                          return (
                            <span key={`${order.id}-item-${idx}`} className={`text-xs font-bold px-2 py-1 rounded-md border ${isOut ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-secondary text-secondary-foreground border-border'}`}>
                              {item?.name ? `${item.name.charAt(0)}${boxNum}` : `#${boxNum}`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${stock.matched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stock.matched ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {stock.matched ? 'Full Stock' : `${stock.missing.length} Missing`}
                      </span>
                    </div>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {order.status === 'Factory Queue' && (
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors" onClick={() => handleRetryDistribute(order.id)}>
                           <Zap size={14} /> Recheck
                         </button>
                      )}
                      {order.status === 'Confirmed' && (
                        <>
                          <button 
                            className="flex items-center justify-center p-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                            onClick={(e) => handleSteadfastDispatch(e, order)}
                            disabled={Boolean(courierPending[order.id])}
                          >
                            {courierPending[order.id] === 'steadfast' ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                          </button>
                          <button 
                            className="flex items-center justify-center p-2 rounded-lg text-orange-600 bg-orange-100 hover:bg-orange-200 transition-colors disabled:opacity-50"
                            onClick={(e) => handlePathaoDispatch(e, order)}
                            disabled={Boolean(courierPending[order.id])}
                          >
                            {courierPending[order.id] === 'pathao' ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {displayOrders.length === 0 && (
            <div className="p-10 text-center bg-card rounded-2xl border border-border">
              <PackageSearch size={40} className="mx-auto text-muted-foreground opacity-30 mb-3" />
              <h3 className="font-bold text-foreground">No records found</h3>
            </div>
          )}
        </div>

        {displayOrders.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-border bg-card gap-4 text-sm">
            <div className="text-muted-foreground text-center md:text-left">
              Showing {(currentPage - 1) * FACTORY_PAGE_SIZE + 1}-
              {Math.min(currentPage * FACTORY_PAGE_SIZE, displayOrders.length)} of {displayOrders.length} records
            </div>
            <div className="flex items-center gap-1">
              <button
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] px-1">
                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors shrink-0 ${currentPage === pageNumber ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <button
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Action Bar - Sticky at bottom */}
      <AnimatePresence>
        {activeTab === 'confirmed' && selectedConfirmedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 md:relative md:bottom-auto rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-xl p-3 flex flex-col md:flex-row md:items-center justify-between z-20 gap-3"
          >
            <div className="flex items-center justify-between md:justify-start gap-4">
              <div className="text-sm">
                <strong className="text-foreground text-lg">{selectedConfirmedIds.length}</strong>
                <span className="text-muted-foreground ml-2">orders selected</span>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
                onClick={() => setSelectedConfirmedIds([])}
                disabled={isMovingSelectedConfirmed}
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="primary"
                onClick={handleBulkSteadfastDispatch}
                disabled={isMovingSelectedConfirmed || selectedConfirmedOrders.length === 0}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
              >
                {isMovingSelectedConfirmed ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                <span>Bulk Steadfast</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handleBulkPathaoDispatch}
                disabled={isMovingSelectedConfirmed || selectedConfirmedOrders.length === 0}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
              >
                {isMovingSelectedConfirmed ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                <span>Bulk Pathao</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OrderEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        order={selectedOrder} 
      />

      <BulkExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        confirmedOrders={orders.filter(o => o.status === 'Confirmed')}
        allOrders={orders}
        selectedIds={selectedConfirmedIds}
        onStatusChange={updateOrderStatus}
        exportedBy={profile?.name || user?.user_metadata?.full_name || user?.email || 'User'}
      />

      <OrderDetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        order={selectedOrder}
        onEdit={handleOpenEditModal}
      />

      {ConfirmDialogComponent}
    </motion.div>
  );
};

