'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrders } from '../context/OrderContext';
import { Modal } from './Modal';
import { Wand2, X, Plus, Package, Users, AlertTriangle, History, MapPin, Phone, User, Tag, FileText, Globe, ShieldCheck, ChevronDown, Check, Minus } from 'lucide-react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import CurrencyIcon from './CurrencyIcon';
import { useAuth } from '../context/AuthContext';
import { buildProductCatalog, filterToyBoxesByProduct, findBestProductMatch, findProductRecordByName } from '../utils/productCatalog';
import { cleanImageUrl } from '@/lib/productMedia';
import './OrderHistoryTimeline.css';
import './OrderEditModal.css';

const ORDER_STATUSES = [
  'New', 'Pending Call', 'Final Call Pending', 'Confirmed', 'Bulk Exported', 'Factory Queue', 'Courier Ready',
  'Courier Submitted', 'Factory Processing', 'Completed', 'Fake Order', 'Cancelled', 'Test'
];

const SOURCES = ['Website', 'Facebook', 'Instagram', 'Direct'];
let DELIVERY_ZONES = {
  'Inside Dhaka': 80,
  'Sub Dhaka': 100,
  'Outside Dhaka': 150
};

const getDeliveryChargeForZone = (zone) => DELIVERY_ZONES[zone] ?? 150;

const parseEmbeddedDeliveryCharge = (value) => {
  const text = String(value || '');
  const matches = [...text.matchAll(/(\d{2,5})/g)];
  if (matches.length === 0) return null;

  const parsed = Number(matches[matches.length - 1][1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeShippingZone = (zone) => {
  const text = String(zone || '').trim();
  const lower = text.toLowerCase();

  if (DELIVERY_ZONES[text]) return text;
  if (lower.includes('sub') || lower.includes('savar') || lower.includes('gazipur') || lower.includes('narayanganj')) return 'Sub Dhaka';
  if (lower.includes('inside') || text.includes('ভিতরে')) return 'Inside Dhaka';
  if (lower.includes('outside') || text.includes('বাইরে')) return 'Outside Dhaka';

  return 'Outside Dhaka';
};

const getStoredDeliveryCharge = (order) => {
  if (!order) return null;

  const embeddedCharge = parseEmbeddedDeliveryCharge(order.shipping_zone);
  if (embeddedCharge !== null) return embeddedCharge;

  const directCharge = Number(order.delivery_charge);
  if (Number.isFinite(directCharge) && directCharge > 0) return directCharge;

  const summaryCharge = Number(order.pricing_summary?.delivery_charge);
  if (Number.isFinite(summaryCharge) && summaryCharge > 0) return summaryCharge;

  return null;
};

// Immediate fallback live products so modal opens with zero lag
const DEFAULT_WEBSITE_PRODUCTS = [
  {
    id: 'remi-cotton-trousers',
    productId: 'remi-cotton-trousers',
    name: 'Remi Cotton Trousers',
    slug: 'remi-cotton-trousers',
    price: 799,
    compare_at_price: 1550,
    image: '/api/media/uploads/img_1788842543204_969.webp',
    colors: ['Black', 'Olive', 'Off White'],
    sizes: ['Xs', 'S', 'M', 'L'],
    color_images: {
      Black: ['/api/media/uploads/img_1788842543204_969.webp']
    },
    variants: [
      { color: 'Black', size: 'Xs', stock: 0, price: 799 },
      { color: 'Black', size: 'S', stock: 2, price: 799 },
      { color: 'Black', size: 'M', stock: 2, price: 799 },
      { color: 'Black', size: 'L', stock: 2, price: 799 }
    ]
  },
  {
    id: 'sweatpant',
    productId: 'sweatpant',
    name: 'Sweatpant',
    slug: 'sweatpant',
    price: 799,
    image: '',
    colors: ['Black', 'Off White', 'Pink', 'Coffe/Chocolate  Brown', 'Charcoal Grey', 'Ash/Grey', 'Navy Blue'],
    sizes: ['Xs', 'S', 'M', 'L'],
    color_images: {},
    variants: []
  },
  {
    id: 'pant',
    productId: 'pant',
    name: 'Pant',
    slug: 'pant',
    price: 799,
    image: '',
    colors: ['Acid Wash Charcoal Grey'],
    sizes: ['S', 'M', 'L', 'XL'],
    color_images: {},
    variants: []
  },
  {
    id: 'tang-shirt',
    productId: 'tang-shirt',
    name: 'Tang Shirt',
    slug: 'tang-shirt',
    price: 799,
    image: '',
    colors: ['Black', 'White'],
    sizes: ['M', 'L', 'XL', '2XL'],
    color_images: {},
    variants: []
  }
];

const createDefaultLineItem = (prod) => {
  const p = prod || DEFAULT_WEBSITE_PRODUCTS[0];
  const defaultColor = p.colors?.[0] || '';
  const defaultSize = p.sizes?.[0] || '';
  let initialImg = p.image || '';
  if (defaultColor && p.color_images && p.color_images[defaultColor]) {
    const ci = p.color_images[defaultColor];
    initialImg = Array.isArray(ci) ? ci[0] : ci;
  }
  const price = Number(p.price) || 0;

  return {
    productId: p.id || '',
    id: p.id || '',
    name: p.name || 'Product',
    slug: p.slug || '',
    color: defaultColor,
    size: defaultSize,
    image: cleanImageUrl(initialImg) || initialImg || '',
    quantity: 1,
    price: price,
    line_total: price,
    isToyBox: Boolean(p.isToyBox),
    toyBoxNumber: null
  };
};

export const OrderEditModal = ({ isOpen, onClose, order = null }) => {
  const { addOrder, editOrder, inventory, toyBoxes } = useOrders();
  const { onlineUsers, user, updatePresenceContext } = useAuth();

  const [catalogProducts, setCatalogProducts] = useState(DEFAULT_WEBSITE_PRODUCTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isManualAmount, setIsManualAmount] = useState(false);
  const [manualSubtotal, setManualSubtotal] = useState(0);
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Dynamic Shipping Rates fetch
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('data').eq('id', 'home_page').maybeSingle();
        if (data && data.data) {
          DELIVERY_ZONES = {
            'Inside Dhaka': Number(data.data.shippingInsideDhaka || 80),
            'Sub Dhaka': Number(data.data.shippingSubDhaka || 100),
            'Outside Dhaka': Number(data.data.shippingOutsideDhaka || 150)
          };
        }
      } catch (err) {
        console.error('Error fetching dynamic shipping rates:', err);
      }
    };
    fetchRates();
  }, []);

  // Fetch Live Website Products from `cb_products`
  useEffect(() => {
    let isMounted = true;
    const fetchStorefrontProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('cb_products')
          .select('id, data, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Could not fetch live products from cb_products:', error);
          return;
        }

        if (isMounted && Array.isArray(data) && data.length > 0) {
          const parsed = data.map((row) => {
            const d = row.data || {};
            const rawColors = Array.isArray(d.colors)
              ? d.colors
              : typeof d.colors === 'string'
              ? d.colors.split(',').map((s) => s.trim())
              : [];
            const rawSizes = Array.isArray(d.sizes)
              ? d.sizes
              : typeof d.sizes === 'string'
              ? d.sizes.split(',').map((s) => s.trim())
              : [];
            const colorImages = d.color_images || {};
            const mainImg = cleanImageUrl(
              d.image || d.main_image || (Array.isArray(d.images) ? d.images[0] : null)
            );

            return {
              id: row.id,
              productId: row.id,
              name: d.name || row.id,
              slug: d.slug || row.id,
              price: Number(d.price) || 0,
              compare_at_price: Number(d.compare_at_price || d.original_price) || 0,
              image: mainImg || '',
              colors: rawColors.filter(Boolean),
              sizes: rawSizes.filter(Boolean),
              color_images: colorImages,
              variants: Array.isArray(d.variants) ? d.variants : [],
              stock: Number(d.stock) || 0,
              isToyBox: Boolean(d.isToyBox || (d.name && d.name.toLowerCase().includes('toy box')))
            };
          });

          setCatalogProducts(parsed);
        }
      } catch (err) {
        console.error('Error fetching live products for OrderEditModal:', err);
      }
    };

    fetchStorefrontProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const initialFormData = useMemo(() => ({
    customer_name: '',
    phone: '',
    address: '',
    source: 'Website',
    notes: '',
    amount: '0',
    shipping_zone: 'Inside Dhaka',
    delivery_charge: 80,
    status: 'New',
    products: [createDefaultLineItem(catalogProducts[0] || DEFAULT_WEBSITE_PRODUCTS[0])]
  }), [catalogProducts]);

  const [formData, setFormData] = useState(initialFormData);

  // Initialize or hydrate form when opened or order prop changes
  useEffect(() => {
    if (isOpen) {
      if (order) {
        let items = [];
        if (Array.isArray(order.ordered_items) && order.ordered_items.length > 0) {
          items = order.ordered_items.map((item) => {
            if (typeof item === 'object' && item !== null) {
              const matchedProduct = catalogProducts.find(
                (p) =>
                  (p.id && (p.id === item.productId || p.id === item.id)) ||
                  p.name.toLowerCase() === String(item.name || '').toLowerCase() ||
                  (p.slug && p.slug === item.slug)
              );

              let itemImg = item.image;
              if (!itemImg && matchedProduct) {
                if (item.color && matchedProduct.color_images?.[item.color]) {
                  const ci = matchedProduct.color_images[item.color];
                  itemImg = Array.isArray(ci) ? ci[0] : ci;
                } else {
                  itemImg = matchedProduct.image;
                }
              }

              const resolvedPrice =
                item.price !== undefined && item.price !== null
                  ? Number(item.price)
                  : matchedProduct?.price ?? 0;
              const qty = Math.max(1, parseInt(item.quantity) || 1);

              return {
                productId: item.productId || matchedProduct?.id || item.id || '',
                id: item.id || matchedProduct?.id || '',
                name: item.name || matchedProduct?.name || 'Product',
                slug: item.slug || matchedProduct?.slug || '',
                image: cleanImageUrl(itemImg) || itemImg || '',
                color: item.color || (matchedProduct?.colors?.[0] || ''),
                size: item.size || (matchedProduct?.sizes?.[0] || ''),
                quantity: qty,
                price: resolvedPrice,
                line_total: resolvedPrice * qty,
                isToyBox:
                  typeof item.isToyBox === 'boolean'
                    ? item.isToyBox
                    : matchedProduct?.isToyBox || false,
                toyBoxNumber: item.toyBoxNumber || null
              };
            }
            return createDefaultLineItem(catalogProducts[0] || DEFAULT_WEBSITE_PRODUCTS[0]);
          });
        } else if (order.product_name) {
          const matchedProduct = catalogProducts.find(
            (p) => p.name.toLowerCase() === String(order.product_name || '').toLowerCase()
          );
          const qty = Math.max(1, parseInt(order.quantity) || 1);
          const resolvedPrice = order.amount
            ? Number(order.amount) / qty
            : matchedProduct?.price ?? 0;

          items = [
            {
              productId: matchedProduct?.id || '',
              id: matchedProduct?.id || '',
              name: order.product_name,
              slug: matchedProduct?.slug || '',
              image: cleanImageUrl(matchedProduct?.image) || matchedProduct?.image || '',
              color: order.color || (matchedProduct?.colors?.[0] || ''),
              size: order.size || (matchedProduct?.sizes?.[0] || ''),
              quantity: qty,
              price: resolvedPrice,
              line_total: resolvedPrice * qty,
              isToyBox: matchedProduct?.isToyBox || false,
              toyBoxNumber: null
            }
          ];
        }

        const storedDeliveryCharge = getStoredDeliveryCharge(order);
        const resolvedShippingZone = normalizeShippingZone(order.shipping_zone || 'Inside Dhaka');
        const resolvedDeliveryCharge =
          storedDeliveryCharge ?? getDeliveryChargeForZone(resolvedShippingZone);

        setFormData({
          customer_name: order.customer_name || '',
          phone: order.phone || '',
          address: order.address || '',
          source: order.source || 'Website',
          notes: order.notes || '',
          amount: String(order.amount || '0'),
          shipping_zone: resolvedShippingZone,
          delivery_charge: resolvedDeliveryCharge,
          status: order.status || 'New',
          products:
            items.length > 0
              ? items
              : [createDefaultLineItem(catalogProducts[0] || DEFAULT_WEBSITE_PRODUCTS[0])]
        });
        setIsManualAmount(true);
        setManualSubtotal(Math.max(0, parseFloat(order.amount || '0') - resolvedDeliveryCharge));
      } else {
        setFormData({
          ...initialFormData,
          products: [createDefaultLineItem(catalogProducts[0] || DEFAULT_WEBSITE_PRODUCTS[0])]
        });
        setIsManualAmount(false);
        setManualSubtotal(0);
        setAiText('');
      }

      const contextPage = order ? `Editing Order #${order.id}` : 'Creating New Order';
      updatePresenceContext(contextPage, order ? { orderId: order.id } : null);

      if (order?.id) {
        const fetchLogs = async () => {
          setIsLoadingLogs(true);
          try {
            const logs = await api.getOrderActivity(order.id);
            setActivityLogs(logs || []);
          } catch (err) {
            console.error('Failed to fetch activity logs:', err);
          } finally {
            setIsLoadingLogs(false);
          }
        };
        fetchLogs();
      } else {
        setActivityLogs([]);
      }

      return () => {
        updatePresenceContext('Browsing');
      };
    }
  }, [catalogProducts, initialFormData, isOpen, order, updatePresenceContext]);

  const otherEditors = order
    ? onlineUsers.filter(
        (u) => u.id !== user.id && u.context?.details?.orderId === order.id
      )
    : [];

  const getLineItemsSubtotal = useCallback(
    () =>
      formData.products.reduce(
        (acc, p) => acc + (parseFloat(p.price || 0) * (parseInt(p.quantity) || 1)),
        0
      ),
    [formData.products]
  );

  // Auto-sync Total Amount unless user explicitly typed a custom amount
  useEffect(() => {
    let subtotal = 0;
    if (isManualAmount) {
      subtotal = manualSubtotal;
    } else {
      subtotal = getLineItemsSubtotal();
    }
    const deliveryCharge = Number(formData.delivery_charge) || 0;
    setFormData((prev) => {
      const nextAmount = String(subtotal + deliveryCharge);
      return prev.amount === nextAmount ? prev : { ...prev, amount: nextAmount };
    });
  }, [formData.delivery_charge, formData.products, getLineItemsSubtotal, isManualAmount, manualSubtotal]);

  const handleDeliveryChargeChange = (value) => {
    const nextDeliveryCharge = Math.max(0, parseFloat(value) || 0);
    setIsManualAmount(true);
    setManualSubtotal((prevSubtotal) => {
      if (isManualAmount) return prevSubtotal;
      return getLineItemsSubtotal();
    });
    setFormData((prev) => ({ ...prev, delivery_charge: nextDeliveryCharge }));
  };

  const handleTotalAmountChange = (value) => {
    const nextAmount = Math.max(0, parseFloat(value) || 0);
    const deliveryCharge = Number(formData.delivery_charge) || 0;
    setIsManualAmount(true);
    setManualSubtotal(Math.max(0, nextAmount - deliveryCharge));
    setFormData((prev) => ({ ...prev, amount: String(nextAmount) }));
  };

  // ── Line Items State Handlers ──
  const handleSelectProduct = (index, selectedName) => {
    setIsManualAmount(false);
    const matched = catalogProducts.find((p) => p.name === selectedName);
    setFormData((prev) => {
      const newProducts = [...prev.products];
      const prevItem = newProducts[index] || {};
      const defaultColor = matched?.colors?.[0] || '';
      const defaultSize = matched?.sizes?.[0] || '';
      let initialImg = matched?.image || '';
      if (defaultColor && matched?.color_images && matched.color_images[defaultColor]) {
        const ci = matched.color_images[defaultColor];
        initialImg = Array.isArray(ci) ? ci[0] : ci;
      }
      const unitPrice =
        matched?.price !== undefined ? matched.price : prevItem.price || 0;
      const qty = prevItem.quantity || 1;

      newProducts[index] = {
        ...prevItem,
        name: selectedName,
        productId: matched?.id || '',
        slug: matched?.slug || '',
        price: unitPrice,
        color: defaultColor,
        size: defaultSize,
        image: cleanImageUrl(initialImg) || initialImg || '',
        isToyBox: Boolean(matched?.isToyBox),
        toyBoxNumber: null,
        line_total: unitPrice * qty
      };
      return { ...prev, products: newProducts };
    });
  };

  const handleSelectColor = (index, newColor) => {
    setFormData((prev) => {
      const newProducts = [...prev.products];
      const item = newProducts[index];
      const matched = catalogProducts.find(
        (p) => p.name === item.name || p.id === item.productId
      );
      let newImg = item.image;
      if (matched && matched.color_images && matched.color_images[newColor]) {
        const ci = matched.color_images[newColor];
        newImg = Array.isArray(ci) ? ci[0] : ci;
      }
      newProducts[index] = {
        ...item,
        color: newColor,
        image: cleanImageUrl(newImg) || newImg || item.image
      };
      return { ...prev, products: newProducts };
    });
  };

  const handleSelectSize = (index, newSize) => {
    setFormData((prev) => {
      const newProducts = [...prev.products];
      const item = newProducts[index];
      newProducts[index] = {
        ...item,
        size: newSize
      };
      return { ...prev, products: newProducts };
    });
  };

  const handleUpdateQuantity = (index, newQty) => {
    setIsManualAmount(false);
    const validQty = Math.max(1, parseInt(newQty) || 1);
    setFormData((prev) => {
      const newProducts = [...prev.products];
      const item = newProducts[index];
      const price = Number(item.price) || 0;
      newProducts[index] = {
        ...item,
        quantity: validQty,
        line_total: price * validQty
      };
      return { ...prev, products: newProducts };
    });
  };

  const handleUpdatePrice = (index, newPrice) => {
    setIsManualAmount(false);
    const validPrice = Math.max(0, parseFloat(newPrice) || 0);
    setFormData((prev) => {
      const newProducts = [...prev.products];
      const item = newProducts[index];
      const qty = item.quantity || 1;
      newProducts[index] = {
        ...item,
        price: validPrice,
        line_total: validPrice * qty
      };
      return { ...prev, products: newProducts };
    });
  };

  const updateProduct = (index, updates) => {
    if (
      Object.prototype.hasOwnProperty.call(updates, 'price') ||
      Object.prototype.hasOwnProperty.call(updates, 'quantity') ||
      Object.prototype.hasOwnProperty.call(updates, 'name')
    ) {
      setIsManualAmount(false);
    }

    setFormData((prev) => {
      const newProducts = [...prev.products];
      newProducts[index] = { ...newProducts[index], ...updates };
      return { ...prev, products: newProducts };
    });
  };

  const addProduct = () => {
    setIsManualAmount(false);
    const defaultProd = catalogProducts[0] || DEFAULT_WEBSITE_PRODUCTS[0];
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, createDefaultLineItem(defaultProd)]
    }));
  };

  const removeProduct = (index) => {
    if (formData.products.length <= 1) return;
    setIsManualAmount(false);
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // ── AI Magic Autofill (Enhanced for Live Website Products) ──
  const handleAIExtract = async () => {
    if (!aiText.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await api.extractOrderWithAI(aiText);
      if (extracted) {
        const mappedProducts = (extracted.products || []).map((p) => {
          const pNameLower = String(p.name || '').trim().toLowerCase();
          const matchedCatalog =
            catalogProducts.find((cp) => {
              const cpNameLower = cp.name.toLowerCase();
              return (
                cpNameLower === pNameLower ||
                cpNameLower.includes(pNameLower) ||
                pNameLower.includes(cpNameLower)
              );
            }) || catalogProducts[0];

          let matchedColor = matchedCatalog?.colors?.[0] || '';
          if (matchedCatalog?.colors && matchedCatalog.colors.length > 0) {
            const foundColor = matchedCatalog.colors.find(
              (c) =>
                aiText.toLowerCase().includes(c.toLowerCase()) ||
                (p.color && p.color.toLowerCase() === c.toLowerCase())
            );
            if (foundColor) matchedColor = foundColor;
          }

          let matchedSize = p.size || matchedCatalog?.sizes?.[0] || '';
          if (matchedCatalog?.sizes && matchedCatalog.sizes.length > 0) {
            const foundSize = matchedCatalog.sizes.find(
              (s) => String(s).toLowerCase() === String(p.size || '').toLowerCase()
            );
            if (foundSize) matchedSize = foundSize;
          }

          let matchedImg = matchedCatalog?.image || '';
          if (matchedColor && matchedCatalog?.color_images?.[matchedColor]) {
            const ci = matchedCatalog.color_images[matchedColor];
            matchedImg = Array.isArray(ci) ? ci[0] : ci;
          }

          const qty = Math.max(1, parseInt(p.quantity) || 1);
          const unitPrice = matchedCatalog?.price || 0;

          return {
            name: matchedCatalog?.name || p.name || 'Product',
            productId: matchedCatalog?.id || '',
            slug: matchedCatalog?.slug || '',
            color: matchedColor,
            size: matchedSize,
            image: cleanImageUrl(matchedImg) || matchedImg || '',
            quantity: qty,
            price: unitPrice,
            line_total: unitPrice * qty,
            isToyBox: matchedCatalog?.isToyBox || false,
            toyBoxNumber: null
          };
        });

        const zone = normalizeShippingZone(extracted.shipping_zone || prev.shipping_zone);

        setFormData((prev) => ({
          ...prev,
          customer_name: extracted.customer_name || prev.customer_name,
          phone: extracted.phone || prev.phone,
          address: extracted.address || prev.address,
          shipping_zone: zone,
          delivery_charge: getDeliveryChargeForZone(zone),
          notes: extracted.notes || prev.notes,
          products: mappedProducts.length > 0 ? mappedProducts : prev.products
        }));

        if (extracted.extracted_subtotal !== null) {
          setIsManualAmount(true);
          setManualSubtotal(extracted.extracted_subtotal);
        }
        setAiText('');
      }
    } catch (err) {
      console.error('AI extraction error:', err);
      alert('AI extraction failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Submit Order ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.phone || formData.products.length === 0) {
      alert('Please fill in customer details and add at least one product.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payableTotal = parseFloat(formData.amount) || 0;
      const deliveryCharge = Number(formData.delivery_charge) || 0;
      const productSubtotal = isManualAmount
        ? Math.max(0, payableTotal - deliveryCharge)
        : getLineItemsSubtotal();

      const totalQty = formData.products.reduce(
        (acc, p) => acc + (parseInt(p.quantity) || 1),
        0
      );
      const allSizes = formData.products
        .map((p) => p.size)
        .filter(Boolean)
        .join(', ');

      const cleanOrderedItems = formData.products.map((p) => ({
        id: p.productId || p.id || '',
        productId: p.productId || p.id || '',
        name: p.name,
        slug: p.slug || '',
        image: p.image || '',
        price: Number(p.price) || 0,
        size: p.size || '',
        color: p.color || null,
        quantity: Number(p.quantity) || 1,
        line_total: (Number(p.price) || 0) * (Number(p.quantity) || 1),
        ...(p.toyBoxNumber ? { toyBoxNumber: p.toyBoxNumber, isToyBox: true } : {})
      }));

      const payload = {
        customer_name: formData.customer_name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        product_name:
          formData.products.length > 1
            ? `${formData.products.length} Items`
            : formData.products[0].name,
        size: allSizes || formData.products[0]?.size || 'Standard',
        quantity: totalQty,
        items: totalQty,
        source: formData.source,
        notes: formData.notes,
        amount: payableTotal,
        shipping_zone: formData.shipping_zone,
        delivery_charge: deliveryCharge,
        ordered_items: cleanOrderedItems,
        order_lines_payload: cleanOrderedItems,
        pricing_summary: {
          subtotal: productSubtotal,
          delivery_charge: deliveryCharge,
          payable_total: payableTotal
        },
        status: formData.status
      };

      if (order && order.id) {
        await editOrder(order.id, payload);
      } else {
        await addOrder(payload);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = Boolean(order && order.id);

  const handleShippingZoneChange = (zone) => {
    if (!isEdit) {
      setIsManualAmount(false);
    }

    setFormData((prev) => {
      const currentDefault = getDeliveryChargeForZone(prev.shipping_zone);
      const shouldSyncCharge =
        !isEdit &&
        (Number(prev.delivery_charge) === currentDefault ||
          prev.delivery_charge === '' ||
          prev.delivery_charge == null);
      return {
        ...prev,
        shipping_zone: zone,
        delivery_charge: shouldSyncCharge ? getDeliveryChargeForZone(zone) : prev.delivery_charge
      };
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Order' : 'Create New Order'}
      subtitle={
        isEdit
          ? `#${order?.id} · ${order?.customer_name}`
          : 'Select website products, variants, and customer details below'
      }
      size="xl"
    >
      {/* Conflict Banner */}
      {otherEditors.length > 0 && (
        <div className="live-editing-banner">
          <div className="banner-left">
            <div className="users-icon-pulse">
              <Users size={14} />
            </div>
            <span>
              <strong>{otherEditors.map((u) => u.name).join(', ')}</strong>{' '}
              {otherEditors.length === 1 ? 'is' : 'are'} also viewing this order.
            </span>
          </div>
          <div className="banner-right">
            <AlertTriangle size={13} />
            <span>Possible Conflict</span>
          </div>
        </div>
      )}

      <div className="px-5 pb-5">
        <form onSubmit={handleSubmit}>
          {/* Two-Panel Layout */}
          <div className="order-modal-layout">
            {/* ── LEFT PANEL: Customer Info ── */}
            <div className="order-modal-left">
              {/* Customer */}
              <div>
                <div className="form-section-label">
                  <User size={13} /> Customer Details
                </div>
                <div className="form-grid" style={{ marginBottom: 14 }}>
                  <div className="pm-input-group">
                    <label className="pm-label">Full Name *</label>
                    <input
                      className="pm-input"
                      placeholder="e.g. Rihana Jehan"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pm-input-group">
                    <label className="pm-label">Phone Number *</label>
                    <input
                      className="pm-input"
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="pm-input-group">
                  <label className="pm-label">Delivery Address *</label>
                  <input
                    className="pm-input"
                    placeholder="Full shipping address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Shipping Zone */}
              <div>
                <div className="form-section-label">
                  <MapPin size={13} /> Delivery Zone
                </div>
                <div className="shipping-zone-cards">
                  {[
                    { value: 'Inside Dhaka' },
                    { value: 'Sub Dhaka' },
                    { value: 'Outside Dhaka' }
                  ].map((zone) => {
                    const zoneCharge =
                      formData.shipping_zone === zone.value
                        ? Number(formData.delivery_charge) || getDeliveryChargeForZone(zone.value)
                        : getDeliveryChargeForZone(zone.value);

                    return (
                      <button
                        key={zone.value}
                        type="button"
                        className={`zone-card ${formData.shipping_zone === zone.value ? 'selected' : ''}`}
                        onClick={() => handleShippingZoneChange(zone.value)}
                      >
                        <span className="zone-card-name">{zone.value}</span>
                        <span className="zone-card-price">৳{zoneCharge.toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="form-grid">
                  <div className="pm-input-group">
                    <label className="pm-label">Delivery Charge (৳)</label>
                    <input
                      type="number"
                      className="pm-input"
                      min="0"
                      value={formData.delivery_charge}
                      onChange={(e) => handleDeliveryChargeChange(e.target.value)}
                    />
                  </div>
                  <div className="pm-input-group">
                    <label className="pm-label">Total Payable (৳)</label>
                    <input
                      type="number"
                      className="pm-input font-bold"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleTotalAmountChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Source + Status */}
              <div className="form-grid">
                <div className="pm-input-group">
                  <label className="pm-label">Order Source</label>
                  <select
                    className="pm-input pm-select"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {isEdit && (
                  <div className="pm-input-group">
                    <label className="pm-label">Order Status</label>
                    <select
                      className="pm-input pm-select"
                      value={formData.status || 'New'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="pm-input-group">
                <label className="pm-label">Order Notes</label>
                <textarea
                  className="pm-input pm-textarea"
                  placeholder="Customer preference, delivery instructions, etc..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Activity Log (edit mode only) */}
              {isEdit && (
                <div className="order-history-section">
                  <div className="history-header">
                    <div className="history-title">
                      <History size={16} />
                      <span>Activity Log</span>
                    </div>
                    <div className="sla-audit-summary">
                      {order.first_call_time && (
                        <span className="audit-badge highlight">
                          First Call:{' '}
                          {Math.floor(
                            (new Date(order.first_call_time) - new Date(order.created_at)) / 60000
                          )}
                          m
                        </span>
                      )}
                      <span className="audit-badge">{order.call_attempts || 0} Calls</span>
                    </div>
                  </div>
                  {isLoadingLogs ? (
                    <div className="loading-logs">Loading history...</div>
                  ) : activityLogs.length === 0 ? (
                    <div className="empty-logs">No activity records yet.</div>
                  ) : (
                    <div className="timeline-container">
                      {activityLogs.map((log, i) => {
                        const isCallLog = log.action_description?.toLowerCase().includes('call attempt');
                        const isStatusChange = log.action_type === 'STATUS_CHANGE';
                        const isCreate =
                          log.action_description?.toLowerCase().includes('created') ||
                          i === activityLogs.length - 1;
                        let typeClass = 'update';
                        if (isCallLog) typeClass = 'call-log';
                        else if (isStatusChange) typeClass = 'status-change';
                        else if (isCreate) typeClass = 'create';
                        return (
                          <div key={log.id || i} className={`timeline-item ${typeClass}`}>
                            <div className="timeline-dot" />
                            <div className="timeline-content">
                              <div className="timeline-time">
                                {new Date(log.timestamp).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short'
                                })}
                              </div>
                              <div className="timeline-desc">{log.action_description}</div>
                              <div className="timeline-user">
                                <div className="user-avatar-mini">
                                  {(log.changed_by_user_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span>{log.changed_by_user_name || 'System'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL: AI + Products ── */}
            <div className="order-modal-right">
              {/* AI Magic Assistant */}
              <div className="ai-magic-section">
                <div className="ai-header">
                  <Wand2 size={15} color="#a855f7" />
                  <span className="ai-title">AI Magic Autofill</span>
                </div>
                <textarea
                  className="ai-textarea"
                  placeholder="Paste message from WhatsApp or Messenger — AI extracts Name, Phone, Address, Products & Sizes automatically..."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  rows={3}
                />
                <button
                  type="button"
                  className="ai-magic-btn"
                  onClick={handleAIExtract}
                  disabled={isExtracting || !aiText.trim()}
                >
                  <Wand2 size={14} />
                  {isExtracting ? 'Analyzing...' : 'Magic Autofill'}
                </button>
              </div>

              {/* Products Section — Checkout-Like Easy Line Items */}
              <div>
                <div className="form-section-label flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={14} />
                    <span>Order Line Items ({formData.products.length})</span>
                  </div>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Directly synced with Storefront
                  </span>
                </div>

                <div className="multi-product-container">
                  {formData.products.map((item, idx) => {
                    const matchedProduct = catalogProducts.find(
                      (p) => p.name === item.name || p.id === item.productId
                    );

                    const availableColors = matchedProduct?.colors || [];
                    const availableSizes = matchedProduct?.sizes || [];
                    const catalogNames = catalogProducts.map((p) => p.name);

                    return (
                      <div key={idx} className="order-line-item-card">
                        {/* Top Row: Thumbnail + Product Selector + Remove */}
                        <div className="line-item-header">
                          <div className="line-item-thumb-wrapper">
                            <img
                              src={
                                item.image ||
                                matchedProduct?.image ||
                                'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'
                              }
                              alt={item.name}
                              className="line-item-thumb-img"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          </div>

                          <div className="line-item-product-select-wrapper">
                            <label className="line-item-field-label">Product Name</label>
                            <select
                              className="pm-input pm-select line-item-product-select"
                              value={item.name}
                              onChange={(e) => handleSelectProduct(idx, e.target.value)}
                            >
                              {!catalogNames.includes(item.name) && item.name && (
                                <option value={item.name}>{item.name} (Custom / Legacy)</option>
                              )}
                              {catalogProducts.map((prod) => (
                                <option key={prod.id} value={prod.name}>
                                  {prod.name} — ৳{prod.price}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            className="remove-item-btn"
                            title="Remove this product"
                            onClick={() => removeProduct(idx)}
                            disabled={formData.products.length <= 1}
                          >
                            <X size={15} />
                          </button>
                        </div>

                        {/* Row 2: Color and Size Selectors */}
                        <div className="line-item-variants-row">
                          {/* Color Selector */}
                          <div className="line-item-ctrl-col">
                            <label className="line-item-field-label">Color</label>
                            {availableColors.length > 0 ? (
                              <select
                                className="pm-input pm-select"
                                value={item.color || ''}
                                onChange={(e) => handleSelectColor(idx, e.target.value)}
                              >
                                {availableColors.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className="pm-input"
                                placeholder="Standard / None"
                                value={item.color || ''}
                                onChange={(e) => updateProduct(idx, { color: e.target.value })}
                              />
                            )}
                          </div>

                          {/* Size Selector */}
                          <div className="line-item-ctrl-col">
                            <label className="line-item-field-label">Size</label>
                            {availableSizes.length > 0 ? (
                              <select
                                className="pm-input pm-select"
                                value={item.size || ''}
                                onChange={(e) => handleSelectSize(idx, e.target.value)}
                              >
                                {availableSizes.map((s) => {
                                  const variant = matchedProduct?.variants?.find(
                                    (v) =>
                                      (!v.color ||
                                        String(v.color).toLowerCase() ===
                                          String(item.color || '').toLowerCase()) &&
                                      String(v.size || '').toLowerCase() === String(s).toLowerCase()
                                  );
                                  const stockInfo = variant
                                    ? Number(variant.stock) > 0
                                      ? ` (${variant.stock} left)`
                                      : ' (Out of stock)'
                                    : '';
                                  return (
                                    <option key={s} value={s}>
                                      {s}
                                      {stockInfo}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <input
                                className="pm-input"
                                placeholder="e.g. M, L, Free Size"
                                value={item.size || ''}
                                onChange={(e) => updateProduct(idx, { size: e.target.value })}
                              />
                            )}
                          </div>
                        </div>

                        {/* Row 3: Quantity Stepper + Unit Price + Line Total */}
                        <div className="line-item-pricing-row">
                          {/* Quantity Stepper */}
                          <div className="line-item-ctrl-col line-item-qty-col">
                            <label className="line-item-field-label">Qty</label>
                            <div className="line-item-stepper">
                              <button
                                type="button"
                                className="stepper-btn stepper-btn-dec"
                                onClick={() => handleUpdateQuantity(idx, (item.quantity || 1) - 1)}
                                title="Decrease"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                className="stepper-input"
                                value={item.quantity || 1}
                                onChange={(e) =>
                                  handleUpdateQuantity(idx, parseInt(e.target.value) || 1)
                                }
                              />
                              <button
                                type="button"
                                className="stepper-btn stepper-btn-inc"
                                onClick={() => handleUpdateQuantity(idx, (item.quantity || 1) + 1)}
                                title="Increase"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Unit Price Input */}
                          <div className="line-item-ctrl-col line-item-price-col">
                            <label className="line-item-field-label">Unit Price (৳)</label>
                            <input
                              type="number"
                              min="0"
                              className="pm-input font-mono font-bold"
                              value={item.price}
                              onChange={(e) =>
                                handleUpdatePrice(idx, parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>

                          {/* Line Total Badge */}
                          <div className="line-item-ctrl-col line-item-total-col">
                            <label className="line-item-field-label">Total</label>
                            <div className="line-item-total-badge font-mono font-bold">
                              ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Legacy Serial Grid for Toy Box Products */}
                        {item.isToyBox && (
                          <div className="toy-box-selector">
                            <span className="toy-box-selector-label">
                              {item.name} Serial Number
                            </span>
                            <div className="toy-box-grid">
                              {filterToyBoxesByProduct(toyBoxes, item.name).map((box) => {
                                const num = box.toy_box_number;
                                return (
                                  <button
                                    key={`${item.name}-${num}`}
                                    type="button"
                                    className={`toy-box-btn ${item.toyBoxNumber === num ? 'selected' : ''}`}
                                    onClick={() => updateProduct(idx, { toyBoxNumber: num })}
                                  >
                                    {num}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button type="button" className="add-item-btn" onClick={addProduct}>
                    <Plus size={16} />
                    <span>Add Another Product</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sticky Modal Footer ── */}
          <div className="modal-form-footer">
            <div className="modal-footer-left">
              <div className="modal-footer-subtotal">
                <span className="text-xs text-muted-foreground">Items Subtotal:</span>
                <span className="font-mono font-semibold text-sm">
                  ৳{getLineItemsSubtotal().toLocaleString()}
                </span>
              </div>
              <span className="text-muted-foreground/50">·</span>
              <div className="modal-footer-shipping">
                <span className="text-xs text-muted-foreground">Delivery:</span>
                <span className="font-mono font-semibold text-sm">
                  ৳{(Number(formData.delivery_charge) || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-muted-foreground/50">·</span>
              <div className="modal-footer-grand-total">
                <span className="modal-footer-total-label">Grand Total:</span>
                <span className="modal-footer-total">
                  <CurrencyIcon size={16} />
                  {Number(formData.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-cancel-modal" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit-modal" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
export default OrderEditModal;
