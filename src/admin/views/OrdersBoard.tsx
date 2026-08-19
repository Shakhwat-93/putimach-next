'use client';
// @ts-nocheck
import { useState, useMemo, useRef, useEffect } from 'react';
import './OrdersBoard.css';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Globe, ChevronDown, ChevronLeft, ChevronRight, CheckCircle, Clock, Printer, Trash2, X, AlertTriangle, Edit2, Plus, Download, Calendar, MoreHorizontal, Phone, Sparkles, Copy, MessageCircle } from 'lucide-react';
import CurrencyIcon from '../components/CurrencyIcon';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { PremiumSearch } from '../components/PremiumSearch';
import { Input } from '../components/Input';
import { DateRangePicker } from '../components/DateRangePicker';
import { OrderRow } from '../components/OrderRow';
import { OrderEditModal } from '../components/OrderEditModal';
import BulkOrderCreator from '../components/BulkOrderCreator';
import OrdersSkeleton from '@/components/skeletons/admin/OrdersSkeleton';

import api from '../lib/api';
import { getProductCheckpoints } from '../utils/productCatalog';
import { useRouteOrderReadState } from '../hooks/useRouteOrderReadState';
import { ExportModal } from '../components/ExportModal';
import { PrintStudioModal } from '../components/PrintStudioModal';

const ORDER_STATUSES = [
  'New',
  'Pending Call',
  'Final Call Pending',
  'Confirmed',
  'Bulk Exported',
  'Courier Submitted',
  'Factory Processing',
  'Completed',
  'Fake Order',
  'Cancelled',
  'Test'
];

const SOURCES = ['Website', 'Facebook', 'Instagram', 'Direct'];

let DELIVERY_ZONES = [
  { value: 'Inside Dhaka', charge: 80 },
  { value: 'Sub Dhaka', charge: 100 },
  { value: 'Outside Dhaka', charge: 150 }
];

const BD_PHONE_REGEX = /^01\d{9}$/;

export const OrdersBoard = () => {
  const { confirmDialog, showError, showSuccess, alertDialog, ConfirmDialogComponent } = useConfirmDialog();
  const { userRoles, isAdmin, hasAnyRole, updatePresenceContext } = useAuth();
  
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('data').eq('id', 'home_page').maybeSingle();
        if (data && data.data) {
          DELIVERY_ZONES = [
            { value: 'Inside Dhaka', charge: Number(data.data.shippingInsideDhaka || 80) },
            { value: 'Sub Dhaka', charge: Number(data.data.shippingSubDhaka || 100) },
            { value: 'Outside Dhaka', charge: Number(data.data.shippingOutsideDhaka || 150) }
          ];
        }
      } catch (err) {
        console.error('Error fetching dynamic shipping rates:', err);
      }
    };
    fetchRates();
  }, []);

  useEffect(() => {
    updatePresenceContext('Browsing Orders');
    
    // Check for global "New Order" trigger
    if (searchParams.get('openModal') === 'new') {
      setIsNewOrderModalOpen(true);
    }

    const handleGlobalNewOrder = () => setIsNewOrderModalOpen(true);
    window.addEventListener('open-new-order-modal', handleGlobalNewOrder);
    
    return () => window.removeEventListener('open-new-order-modal', handleGlobalNewOrder);
  }, [updatePresenceContext, searchParams]);

  const { 
    orders, loading, page, setPage, setFilters, 
    fetchOrderLogs, fetchStats, stats, addOrder, deleteOrder, fraudFlags, automationFlags,
    pageSize, filters, updateOrderStatus, autoDistributeOrders, toyBoxes, inventory
  } = useOrders();
  const inventoryProductCheckpoints = useMemo(() => getProductCheckpoints(inventory), [inventory]);

  const filteredOrders = useMemo(() => {
    const search = String(filters.searchTerm || '').trim().toLowerCase();
    const productName = String(filters.productName || '').trim().toLowerCase();
    const dateStart = filters.dateRange?.start ? new Date(filters.dateRange.start).getTime() : null;
    const dateEnd = filters.dateRange?.end ? new Date(filters.dateRange.end).getTime() : null;

    return (Array.isArray(orders) ? orders : []).filter((order) => {
      if (filters.status && filters.status !== 'All' && order.status !== filters.status) return false;
      if (filters.source && filters.source !== 'All' && order.source !== filters.source) return false;
      if (productName && !String(order.product_name || '').toLowerCase().includes(productName)) return false;

      if (dateStart || dateEnd) {
        const orderTime = order.created_at ? new Date(order.created_at).getTime() : 0;
        if (dateStart && orderTime < dateStart) return false;
        if (dateEnd && orderTime > dateEnd) return false;
      }

      if (search) {
        const searchable = [
          order.id,
          order.customer_name,
          order.phone,
          order.product_name,
          order.address
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(search)) return false;
      }

      return true;
    });
  }, [filters, orders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);
  const duplicateWarnings = useMemo(() => {
    const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').replace(/^88/, '');
    const normalizeName = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizeIp = (ip) => String(ip || '').trim().toLowerCase();
    const buildMap = (normalizer, minLength = 1) => {
      const map = new Map();
      (Array.isArray(orders) ? orders : []).forEach((order) => {
        const key = normalizer(order);
        if (!key || key.length < minLength) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(order);
      });
      return map;
    };

    const phoneMap = buildMap((order) => normalizePhone(order.phone), 6);
    const nameMap = buildMap((order) => normalizeName(order.customer_name), 3);
    const ipMap = buildMap((order) => normalizeIp(order.ip_address), 3);
    const warnings = {};

    (Array.isArray(orders) ? orders : []).forEach((order) => {
      const matches = [];
      const phoneMatches = phoneMap.get(normalizePhone(order.phone)) || [];
      const nameMatches = nameMap.get(normalizeName(order.customer_name)) || [];
      const ipMatches = ipMap.get(normalizeIp(order.ip_address)) || [];

      if (phoneMatches.length > 1) matches.push({ label: 'Phone', count: phoneMatches.length });
      if (nameMatches.length > 1) matches.push({ label: 'Name', count: nameMatches.length });
      if (ipMatches.length > 1) matches.push({ label: 'IP', count: ipMatches.length });

      if (matches.length > 0) {
        warnings[order.id] = {
          matches,
          label: matches.map(match => match.label).join(' + '),
          title: `Duplicate detected by ${matches.map(match => `${match.label} (${match.count})`).join(', ')}`
        };
      }
    });

    return warnings;
  }, [orders]);
  const { isOrderUnread, markOrderRead, unreadCount } = useRouteOrderReadState('orders-board', filteredOrders);

  useEffect(() => {
    const queryParams = new URLSearchParams("");
    const statusFromRoute = queryParams.get('status');
    const normalizedStatus = statusFromRoute === 'All'
      ? 'All'
      : ORDER_STATUSES.includes(statusFromRoute) ? statusFromRoute : null;

    if (normalizedStatus && filters.status !== normalizedStatus) {
      setFilters(prev => ({ ...prev, status: normalizedStatus }));
    }
  }, ["", filters.status, setFilters]);

  const [distributing, setDistributing] = useState(false);
  const [deepLinkOrder, setDeepLinkOrder] = useState(null);
  const [productBreakdown, setProductBreakdown] = useState([]);
  const [isLoadingProductBreakdown, setIsLoadingProductBreakdown] = useState(false);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [isLoadingStatusBreakdown, setIsLoadingStatusBreakdown] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isBulkCreatorOpen, setIsBulkCreatorOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [printStudioOrders, setPrintStudioOrders] = useState([]);

  const handleOpenPrintStudio = (singleOrder = null) => {
    if (singleOrder) {
      setPrintStudioOrders([singleOrder]);
    } else {
      const selected = (orders || []).filter(o => selectedOrderIds.includes(o.id));
      setPrintStudioOrders(selected);
    }
    setIsPrintStudioOpen(true);
  };

  // Deep Link Observer: Handle direct order modal triggers
  useEffect(() => {
    const viewOrderId = searchParams.get('viewOrder');
    
    if (viewOrderId) {
      const existing = orders.find(o => o.id === viewOrderId);
      if (existing) {
        markOrderRead(existing);
        setSelectedOrderId(viewOrderId);
        setIsDetailsModalOpen(true);
        router.replace(pathname);
      } else {
        api.getOrderById(viewOrderId).then(order => {
          setDeepLinkOrder(order);
          markOrderRead(order);
          setSelectedOrderId(viewOrderId);
          setIsDetailsModalOpen(true);
          router.replace(pathname);
        }).catch(err => console.error('Deep link fetch error:', err));
      }
    }
  }, [searchParams, orders, router, pathname, markOrderRead]);

  const handleSelectOrder = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pageIds = pagedOrders.map(o => o.id);
    const isPageSelected = pageIds.length > 0 && pageIds.every(id => selectedOrderIds.includes(id));

    if (isPageSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleClearSelection = () => {
      setSelectedOrderIds([]);
  };

  const handleBulkStatusChange = async (status) => {};

  // ── Single Order Delete ──
  const handleSingleDelete = async (order) => {
    const confirmed = await confirmDialog({
      title: '🗑️ Delete Order?',
      message: `Are you sure you want to permanently delete order #${order.id} (${order.customer_name})? This cannot be undone.`,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteOrder(order.id);
      setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
      showSuccess(`Order #${order.id} deleted successfully.`);
    } catch (err) {
      showError('Failed to delete order. Please try again.');
    }
  };

  // ── Bulk Delete (selected orders) ──
  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    const confirmed = await confirmDialog({
      title: `🗑️ Delete ${selectedOrderIds.length} Orders?`,
      message: `This will permanently delete ${selectedOrderIds.length} selected orders from the database. This action CANNOT be undone. Are you sure?`,
      confirmText: `Delete ${selectedOrderIds.length} Orders`,
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    let deletedCount = 0;
    let failedCount = 0;
    for (const orderId of selectedOrderIds) {
      try {
        await deleteOrder(orderId);
        deletedCount++;
      } catch {
        failedCount++;
      }
    }
    setSelectedOrderIds([]);
    if (failedCount > 0) {
      showError(`Deleted ${deletedCount} orders. Failed to delete ${failedCount} orders.`);
    } else {
      showSuccess(`Successfully deleted ${deletedCount} orders.`);
    }
  };

  // ── Filter-wise / Status-wise Delete ──
  const handleDeleteByFilter = async () => {
    const count = filteredOrders.length;
    if (count === 0) {
      showError('No orders match the current filter to delete.');
      return;
    }
    const filterDesc = filters.status && filters.status !== 'All'
      ? `status "${filters.status}"`
      : filters.productName
      ? `product "${filters.productName}"`
      : 'current filter';

    const confirmed = await confirmDialog({
      title: `🗑️ Delete All ${count} Filtered Orders?`,
      message: `You are about to permanently delete ALL ${count} orders matching ${filterDesc}. This CANNOT be undone. Type DELETE to confirm.`,
      confirmText: `Delete All ${count} Orders`,
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    let deletedCount = 0;
    let failedCount = 0;
    const ids = filteredOrders.map(o => o.id);
    for (const orderId of ids) {
      try {
        await deleteOrder(orderId);
        deletedCount++;
      } catch {
        failedCount++;
      }
    }
    setSelectedOrderIds([]);
    if (failedCount > 0) {
      showError(`Deleted ${deletedCount} orders. Failed to delete ${failedCount} orders.`);
    } else {
      showSuccess(`Successfully deleted ${deletedCount} filtered orders.`);
    }
  };

  const handleOpenEditModal = (order) => {
    setSelectedOrderForEdit(order);
    setIsEditModalOpen(true);
  };

  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusTabsRef = useRef(null);
  const checkpointsRef = useRef(null);

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const currentOrder = useMemo(() =>
    orders.find(o => o.id === selectedOrderId) || deepLinkOrder,
    [orders, selectedOrderId, deepLinkOrder]
  );


  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    address: '',
    shipping_zone: '',
    source: 'Website',
    notes: '',
    order_lines: [],
    duplicate_policy: 'merge'
  });
  const [lineDraft, setLineDraft] = useState({
    product_name: '',
    size: '',
    quantity: '1',
    unit_price: '',
    toybox_serial: ''
  });
  const [editingLineId, setEditingLineId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const selectedZone = DELIVERY_ZONES.find(zone => zone.value === formData.shipping_zone) || null;
  const deliveryCharge = selectedZone?.charge || 0;
  const orderSubtotal = (formData.order_lines || []).reduce((sum, line) => sum + (Number(line.line_total) || 0), 0);
  const payableTotal = orderSubtotal + deliveryCharge;

  const createLineId = () => `ln-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const normalizeLineDraft = () => {
    const qty = Math.max(1, parseInt(lineDraft.quantity, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(lineDraft.unit_price) || 0);
    const isToyBox = lineDraft.product_name === 'TOY BOX';
    const serialValue = isToyBox ? String(lineDraft.toybox_serial || '').trim() : '';
    const lineKey = `${lineDraft.product_name}|${lineDraft.size || ''}|${serialValue}|${unitPrice}`;

    return {
      qty,
      unitPrice,
      isToyBox,
      serialValue,
      lineKey
    };
  };

  const resetLineDraft = () => {
    setLineDraft({
      product_name: '',
      size: '',
      quantity: '1',
      unit_price: '',
      toybox_serial: ''
    });
    setEditingLineId(null);
  };

  const addOrUpdateLineItem = () => {
    const nextErrors = {};
    const { qty, unitPrice, isToyBox, serialValue, lineKey } = normalizeLineDraft();

    if (!lineDraft.product_name) nextErrors.line_product = 'Select a product first.';
    if (isToyBox && !serialValue) nextErrors.line_serial = 'Select a Toy Box serial.';
    if (qty < 1) nextErrors.line_quantity = 'Quantity must be at least 1.';
    if (unitPrice < 0) nextErrors.line_price = 'Unit price cannot be negative.';

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...nextErrors }));
      return;
    }

    const candidateLine = {
      line_id: editingLineId || createLineId(),
      product_name: lineDraft.product_name,
      size: lineDraft.size,
      quantity: qty,
      unit_price: unitPrice,
      toybox_serial: serialValue,
      line_key: lineKey,
      line_total: qty * unitPrice
    };

    setFormData(prev => {
      let lines = [...(prev.order_lines || [])];

      if (editingLineId) {
        lines = lines.map(line => line.line_id === editingLineId ? candidateLine : line);
      } else if (prev.duplicate_policy === 'merge') {
        const existingIndex = lines.findIndex(line => line.line_key === candidateLine.line_key);
        if (existingIndex !== -1) {
          const existing = lines[existingIndex];
          const mergedQty = (existing.quantity || 0) + candidateLine.quantity;
          lines[existingIndex] = {
            ...existing,
            quantity: mergedQty,
            line_total: mergedQty * (existing.unit_price || 0)
          };
        } else {
          lines.push(candidateLine);
        }
      } else {
        lines.push(candidateLine);
      }

      return { ...prev, order_lines: lines };
    });

    setFormErrors(prev => ({
      ...prev,
      line_product: '',
      line_serial: '',
      line_quantity: '',
      line_price: '',
      order_lines: ''
    }));
    resetLineDraft();
  };

  const handleEditLine = (line) => {
    setEditingLineId(line.line_id);
    setLineDraft({
      product_name: line.product_name || '',
      size: line.size || '',
      quantity: String(line.quantity || 1),
      unit_price: String(line.unit_price ?? ''),
      toybox_serial: line.toybox_serial || ''
    });
  };

  const handleRemoveLine = (lineId) => {
    setFormData(prev => ({
      ...prev,
      order_lines: (prev.order_lines || []).filter(line => line.line_id !== lineId)
    }));
  };

  const updateLineQuantity = (lineId, qty) => {
    const safeQty = Math.max(1, qty || 1);
    setFormData(prev => ({
      ...prev,
      order_lines: (prev.order_lines || []).map(line => line.line_id === lineId
        ? { ...line, quantity: safeQty, line_total: safeQty * (line.unit_price || 0) }
        : line)
    }));
  };

  const handleAutoDistribute = () => {
    confirmDialog({
      title: 'Auto Distribute Orders',
      description: 'Start automatic distribution? This will confirm orders strictly based on inventory availability.',
      confirmLabel: 'Start Distribution',
      onConfirm: async () => {
        setDistributing(true);
        try {
          const result = await autoDistributeOrders('Confirmed');
          alertDialog({
            title: 'Distribution Complete',
            message: `Courier ready: ${result.distributed}, Queued: ${result.queued}`,
            type: 'success',
          });
        } catch (error) {
          console.error('Distribution failed:', error);
          showError('Distribution engine encountered an error.', 'Distribution Failed');
        } finally {
          setDistributing(false);
        }
      },
    });
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'New': return 'new';
      case 'Pending Call': return 'pending-call';
      case 'Final Call Pending': return 'final-call-pending';
      case 'Confirmed': return 'confirmed';
      case 'Bulk Exported': return 'bulk-exported';
      case 'Fake Order': return 'fake-order';
      case 'Cancelled': return 'cancelled';
      case 'Courier Submitted': return 'courier';
      case 'Factory Processing': return 'factory';
      case 'Completed': return 'completed';
      case 'Test': return 'test';
      default: return 'default';
    }
  };

  const handleNewOrderSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    const normalizedPhone = (formData.phone || '').replace(/\D/g, '');
    if (!formData.customer_name.trim()) nextErrors.customer_name = 'Customer name is required.';
    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!BD_PHONE_REGEX.test(normalizedPhone)) {
      nextErrors.phone = 'Phone number must start with 01 and be exactly 11 digits.';
    }
    if (!formData.address.trim()) nextErrors.address = 'Delivery address is required.';
    if (!formData.shipping_zone) nextErrors.shipping_zone = 'Select a delivery zone to continue.';
    if (!formData.order_lines || formData.order_lines.length === 0) nextErrors.order_lines = 'Add at least one product line item.';

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});

    try {
      const totalQuantity = (formData.order_lines || []).reduce((sum, line) => sum + (line.quantity || 0), 0);
      const firstLine = formData.order_lines?.[0];
      const toyboxSerials = (formData.order_lines || [])
        .filter(line => line.product_name === 'TOY BOX' && line.toybox_serial)
        .map(line => Number(line.toybox_serial));

      await addOrder({
        customer_name: formData.customer_name,
        phone: normalizedPhone,
        address: formData.address,
        shipping_zone: formData.shipping_zone,
        delivery_charge: deliveryCharge,
        product_name: (formData.order_lines || []).length > 1 ? `Multi Item (${formData.order_lines.length})` : (firstLine?.product_name || ''),
        size: firstLine?.size || '',
        source: formData.source,
        notes: formData.notes,
        status: 'New',
        amount: payableTotal,
        quantity: totalQuantity || 1,
        ordered_items: toyboxSerials,
        order_lines_payload: formData.order_lines,
        pricing_summary: {
          subtotal: orderSubtotal,
          delivery_charge: deliveryCharge,
          payable_total: payableTotal
        }
      });

      // Reset filters so the new order is visible
      setFilters(prev => ({ ...prev, searchTerm: '', status: 'All', productName: '' }));

      setIsNewOrderModalOpen(false);
      setFormData({
        customer_name: '',
        phone: '',
        address: '',
        shipping_zone: '',
        source: 'Website',
        notes: '',
        order_lines: [],
        duplicate_policy: 'merge'
      });
      resetLineDraft();
      setFormErrors({});
    } catch (error) {
      console.error('Failed to create order:', error);
      showError('Failed to create order. Please try again.', 'Order Creation Failed');
    }
  };

  const handleRowClick = (order) => {
    markOrderRead(order);
    setSelectedOrderId(order.id);
    setIsDetailsModalOpen(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const copyPhoneNumber = (event, phone) => {
    event.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(String(phone));
  };

  const getWhatsAppLink = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('880')) return `https://wa.me/${digits}`;
    if (digits.startsWith('0')) return `https://wa.me/88${digits}`;
    return `https://wa.me/${digits}`;
  };


  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  useEffect(() => {
    let isActive = true;

    const loadProductBreakdown = async () => {
      setIsLoadingProductBreakdown(true);
      try {
        const data = await api.getOrderProductBreakdown({
          ...filters,
          productName: ''
        });

        if (isActive) {
          setProductBreakdown(data || []);
        }
      } catch (error) {
        console.error('Failed to load product breakdown:', error);
        if (isActive) {
          setProductBreakdown([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingProductBreakdown(false);
        }
      }
    };

    const timer = window.setTimeout(loadProductBreakdown, 180);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [filters.dateRange, filters.searchTerm, filters.source, filters.status]);

  useEffect(() => {
    let isActive = true;

    const loadStatusBreakdown = async () => {
      setIsLoadingStatusBreakdown(true);
      try {
        const data = await api.getOrderStatusBreakdown({
          ...filters,
          status: 'All'
        });

        if (isActive) {
          setStatusBreakdown(data || []);
        }
      } catch (error) {
        console.error('Failed to load status breakdown:', error);
        if (isActive) {
          setStatusBreakdown([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingStatusBreakdown(false);
        }
      }
    };

    const timer = window.setTimeout(loadStatusBreakdown, 180);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [filters.dateRange, filters.productName, filters.searchTerm, filters.source]);

  const inventoryColorMap = useMemo(
    () => new Map(
      inventoryProductCheckpoints
        .filter((item) => item.id !== 'all')
        .map((item) => [item.name, item.color])
    ),
    [inventoryProductCheckpoints]
  );

  const getFallbackProductColor = (productName = '') => {
    const palette = ['#0d9488', '#22c55e', '#f97316', '#06b6d4', '#e11d48', '#8b5cf6', '#14b8a6', '#f59e0b'];
    const hash = String(productName)
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const visibleProductBreakdown = useMemo(() => {
    const fallbackBreakdown = Array.from(
      filteredOrders.reduce((acc, order) => {
        const productName = String(order?.product_name || 'Unknown Product').trim() || 'Unknown Product';
        acc.set(productName, (acc.get(productName) || 0) + 1);
        return acc;
      }, new Map())
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    const source = productBreakdown.length > 0 ? productBreakdown : fallbackBreakdown;
    const totalOrdersForBreakdown = source.reduce((sum, item) => sum + item.count, 0);

    return [
      {
        id: 'all',
        name: 'All Products',
        color: '#64748b',
        count: totalOrdersForBreakdown
      },
      ...source.map((item) => ({
        id: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: item.name,
        color: inventoryColorMap.get(item.name) || getFallbackProductColor(item.name),
        count: item.count
      }))
    ];
  }, [filteredOrders, inventoryColorMap, productBreakdown]);

  const statusTabs = useMemo(() => {
    const counts = new Map(statusBreakdown.map((item) => [item.status, item.count]));
    const totalOrdersForStatuses = statusBreakdown.reduce((sum, item) => sum + item.count, 0);

    return [
      { value: 'All', label: 'All Orders', count: totalOrdersForStatuses },
      ...ORDER_STATUSES.map((status) => ({
        value: status,
        label: status,
        count: counts.get(status) || 0
      }))
    ];
  }, [statusBreakdown]);


  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">
              Orders Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
              {filteredOrders.length} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage live customer orders, COD payments, stock allocation, and dispatch lifecycles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => fetchOrders(page)}
            className="rounded-xl h-9 px-3.5 text-xs font-bold gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>

          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="rounded-xl h-9 px-3.5 text-xs font-bold gap-2"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </Button>
          
          <Button 
            type="button"
            onClick={() => {
              setSelectedOrderForEdit(null);
              setIsNewOrderModalOpen(true);
            }}
            size="sm"
            className="rounded-xl h-9 px-4 text-xs font-bold gap-2 shadow-sm"
          >
            <Plus size={15} />
            <span>New Order</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Search & Filter Box (Matching Screenshot) ── */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs">
        {/* Full-width Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <PremiumSearch
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search by customer name, order #, or phone..."
              suggestions={
                filters.searchTerm ? orders.filter(o => 
                  o.id.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                  o.customer_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                  o.phone?.includes(filters.searchTerm)
                ).slice(0, 5).map(o => ({
                  id: o.id,
                  label: o.customer_name,
                  sub: o.id,
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

          <select
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium h-10 shrink-0"
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
          >
            <option value="All">All Sources</option>
            {SOURCES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => handleFilterChange('dateRange', range)}
          />
        </div>

        {/* Status Tabs Pills (Matching Screenshot) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 flex-nowrap items-center pt-1">
          {statusTabs.map((tab) => {
            const isSelected = filters.status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs' 
                    : 'bg-card border border-border/70 text-muted-foreground hover:bg-secondary hover:text-foreground font-medium'
                }`}
                onClick={() => handleFilterChange('status', tab.value)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Product Checkpoints Filter Bar ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 flex-nowrap items-center">
        {visibleProductBreakdown.map((product) => (
          <button
            key={product.id}
            type="button"
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
              filters.productName === (product.id === 'all' ? '' : product.name) 
                ? 'border-primary bg-primary/5 text-primary font-bold' 
                : 'border-border bg-card hover:bg-secondary text-foreground'
            }`}
            onClick={() => handleFilterChange('productName', product.id === 'all' ? '' : product.name)}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.color }}></span>
            <span>{product.name}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{product.count}</span>
          </button>
        ))}
      </div>

      {/* ── Bulk Action Bar ── */}
      {selectedOrderIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-sm animate-slide-up">
          <span className="font-semibold text-rose-700">
            {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              onClick={handleClearSelection}
            >
              Clear Selection
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
              onClick={handleBulkDelete}
            >
              <Trash2 size={14} />
              Delete {selectedOrderIds.length} Selected
            </button>
          </div>
        </div>
      )}

      {/* ── Filter-wise Delete Button ── */}
      {filteredOrders.length > 0 && (filters.status !== 'All' || filters.productName || filters.searchTerm || filters.source !== 'All') && (
        <div className="flex items-center justify-end">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
            onClick={handleDeleteByFilter}
            title={`Delete all ${filteredOrders.length} filtered orders`}
          >
            <Trash2 size={13} />
            Delete All {filteredOrders.length} Filtered Orders
          </button>
        </div>
      )}

      {/* Table (desktop - matching screenshot columns) */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-xs animate-slide-up">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-muted-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-input text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                  checked={pagedOrders.length > 0 && pagedOrders.every(order => selectedOrderIds.includes(order.id))}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3.5">Order Reference ↑↓</th>
              <th className="px-4 py-3.5">Customer ↑↓</th>
              <th className="px-4 py-3.5">Status ↑↓</th>
              <th className="px-4 py-3.5">Payment ↑↓</th>
              <th className="px-4 py-3.5">ITEMS</th>
              <th className="px-4 py-3.5">Total (BDT) ↑↓</th>
              <th className="px-4 py-3.5 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <AnimatePresence mode="popLayout">
              {Array.isArray(pagedOrders) && pagedOrders.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onDetails={handleRowClick}
                  onStatusChange={updateOrderStatus}
                  onEdit={handleOpenEditModal}
                  onPrint={handleOpenPrintStudio}
                  onDelete={handleSingleDelete}
                  isSelected={selectedOrderIds.includes(order.id)}
                  onSelect={handleSelectOrder}
                  fraudFlag={fraudFlags[order.id]}
                  automationFlag={automationFlags[order.id]}
                  isUnread={isOrderUnread(order)}
                  duplicateWarning={duplicateWarnings[order.id]}
                />
              ))}
            </AnimatePresence>
            {(!pagedOrders || pagedOrders.length === 0) && !loading && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-muted-foreground text-xs font-medium">
                  No orders found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 animate-slide-up">
        {Array.isArray(pagedOrders) && pagedOrders.map(order => (
          <div
            key={order.id}
            className={`rounded-2xl border border-border bg-card p-4 shadow-sm relative transition-all active:scale-[0.99] cursor-pointer ${isOrderUnread(order) ? 'ring-2 ring-primary/30' : ''}`}
            onClick={() => handleRowClick(order)}
          >
            <div className="flex justify-between items-start gap-2 mb-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  {isOrderUnread(order) && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  <span className="text-xs font-mono font-bold text-foreground">#{String(order.id).replace('ORD-', '').replace('STB-', '').replace('MGB-', '').slice(0, 8)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {order.created_at ? new Date(order.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}
                </span>
              </div>
              <StatusBadge status={order.status} size="sm" />
            </div>

            <div className="space-y-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">{order.customer_name}</h3>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Phone size={12} className="text-muted-foreground/60" />
                    <span>{order.phone}</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button"
                      className="p-1.5 rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                      onClick={(e) => copyPhoneNumber(e, order.phone)}
                      title="Copy phone"
                    >
                      <Copy size={13} />
                    </button>
                    {order.phone && (
                      <a 
                        href={`tel:${order.phone}`} 
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" 
                        onClick={(e) => e.stopPropagation()}
                        title="Call customer"
                      >
                        <Phone size={13} />
                      </a>
                    )}
                    {getWhatsAppLink(order.phone) && (
                      <a 
                        href={getWhatsAppLink(order.phone)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:opacity-80 transition-opacity" 
                        onClick={(e) => e.stopPropagation()}
                        title="WhatsApp chat"
                      >
                        <MessageCircle size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-secondary/40 rounded-xl border border-border/50">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Item</span>
                  <span className="text-xs font-semibold text-foreground truncate block">{order.product_name}</span>
                  <span className="text-[10px] text-muted-foreground">{order.size || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Amount</span>
                  <span className="text-xs font-black text-foreground flex items-center gap-0.5">
                    <CurrencyIcon size={11} />
                    {Number(order.amount || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">{order.shipping_zone || 'Standard'}</span>
                </div>
              </div>
              
              {duplicateWarnings[order.id] && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span className="text-[11px] font-medium truncate">Duplicate: {duplicateWarnings[order.id].label}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{order.source || 'Website'}</span>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl h-8 px-3 text-xs font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(order);
                  }}
                >
                  View Details
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="rounded-xl h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(order);
                  }}
                  title="Edit Order"
                >
                  <Edit2 size={13} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(!pagedOrders || pagedOrders.length === 0) && !loading && (
          <div className="p-8 text-center text-muted-foreground border border-border rounded-2xl bg-card">No orders found.</div>
        )}
        {loading && <OrdersSkeleton />}
      </div>

      {/* ── Pagination Footer (Matching Screenshot) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-xs text-muted-foreground font-medium">
        <div>
          Showing <span className="font-bold text-foreground">{pagedOrders.length > 0 ? (page - 1) * 20 + 1 : 0}</span> to <span className="font-bold text-foreground">{Math.min(page * 20, filteredOrders.length)}</span> of <span className="font-bold text-foreground">{filteredOrders.length}</span> entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="rounded-xl h-8 px-3 text-xs font-semibold"
          >
            &lt; Previous
          </Button>
          <span className="px-2 font-mono font-bold text-foreground">
            {page} / {totalPages || 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            className="rounded-xl h-8 px-3 text-xs font-semibold"
          >
            Next &gt;
          </Button>
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      <AnimatePresence>
        {selectedOrderIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white shadow-2xl px-6 py-3 rounded-full"
          >
            <div className="flex items-center gap-2 mr-2">
              <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-xs font-black">
                {selectedOrderIds.length}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Selected</span>
            </div>

            <button 
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg transition-all transform hover:scale-105"
              onClick={() => handleOpenPrintStudio()}
            >
              <Printer size={15} /> Print Invoices & Labels ({selectedOrderIds.length})
            </button>

            <button 
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-full flex items-center gap-1.5 border border-slate-700 transition-all"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download size={14} /> Export Data
            </button>

            <button className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white ml-1 transition-colors" onClick={handleClearSelection} title="Clear Selection">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <OrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOrderId(null);
        }}
        order={currentOrder}
      />

      <OrderEditModal
        isOpen={isNewOrderModalOpen || isEditModalOpen}
        onClose={() => {
          setIsNewOrderModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedOrderForEdit(null);
        }}
        order={selectedOrderForEdit}
      />

      <BulkOrderCreator
        isOpen={isBulkCreatorOpen}
        onClose={() => setIsBulkCreatorOpen(false)}
      />

      {/* Enterprise Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allOrders={filteredOrders}
        selectedOrderIds={selectedOrderIds}
        currentFilters={filters}
      />

      {/* Enterprise Print Studio Modal */}
      <PrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        orders={printStudioOrders}
      />

      {ConfirmDialogComponent}
    </div>
  );
};


