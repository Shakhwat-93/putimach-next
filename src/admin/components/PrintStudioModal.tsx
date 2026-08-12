'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './PrintStudioModal.css';
import { 
  Printer, X, FileText, Tag, Receipt, Grid, 
  Settings, Image, Check, Eye, Copy, RefreshCw, ChevronDown, ChevronUp, Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBarcodeSVG, generateQRCodeSVG } from '../utils/barcode';

export const PrintStudioModal = ({
  isOpen,
  onClose,
  orders = [],
  initialFormat = 'a4-invoice'
}) => {
  const [printFormat, setPrintFormat] = useState(initialFormat);
  const [showBrandEditor, setShowBrandEditor] = useState(false);

  // Print Toggles
  const [toggles, setToggles] = useState({
    showLogo: true,
    showImages: true,
    showPrices: true,
    showBarcode: true,
    showTerms: true,
    showSignature: true,
    monochrome: false
  });

  // Brand / Store Details
  const [brandInfo, setBrandInfo] = useState({
    name: 'PUTIMACH STORE',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
    phone: '+880 1700-000000',
    email: 'support@putimach.com',
    address: 'House #12, Road #5, Dhanmondi, Dhaka-1205, Bangladesh',
    website: 'www.putimach.com',
    slogan: 'Premium Clothing & Lifestyle Brand',
    bin: 'BIN-9081726354',
    terms: 'Items can be exchanged within 7 days with original invoice & tag intact. Non-refundable after delivery confirmation.'
  });

  // Normalize order list
  const activeOrders = useMemo(() => {
    if (!orders) return [];
    if (Array.isArray(orders)) return orders.filter(Boolean);
    return [orders].filter(Boolean);
  }, [orders]);

  // Fetch store settings from Supabase
  useEffect(() => {
    if (!isOpen) return;

    const fetchStoreBrand = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('data')
          .eq('id', 'home_page')
          .maybeSingle();

        if (data && data.data) {
          const d = data.data;
          setBrandInfo(prev => ({
            ...prev,
            name: d.siteName || d.storeName || prev.name,
            logo: d.logoUrl || d.brandLogo || prev.logo,
            phone: d.contactPhone || d.hotline || prev.phone,
            email: d.contactEmail || prev.email,
            address: d.storeAddress || d.address || prev.address,
            website: d.websiteUrl || prev.website,
            slogan: d.slogan || d.tagline || prev.slogan,
            terms: d.returnTerms || prev.terms
          }));
        }
      } catch (err) {
        console.warn('Failed to load store brand info for print studio:', err);
      }
    };

    fetchStoreBrand();
  }, [isOpen]);

  const printWorkspaceRef = useRef(null);

  if (!isOpen || activeOrders.length === 0) return null;

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    const printContent = printWorkspaceRef.current;
    if (!printContent) return;

    // Collect all stylesheets from the current page
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
        } catch { return ''; }
      })
      .join('\n');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print - PutiMach</title>
  <style>
    ${styles}
    @page { margin: 10mm; }
    body { margin: 0; padding: 0; background: #fff; }
    .print-workspace { background: #fff; padding: 0; }
    .print-document-sheet { box-shadow: none !important; margin: 0 auto 20px auto; }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="print-studio-overlay">
      <div className="print-studio-container">
        
        {/* ── Control Header ── */}
        <div className="print-studio-header">
          <div className="print-studio-title">
            <Printer size={22} className="text-teal-400" />
            <div>
              <h2>Enterprise Invoice & Label Print Studio</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="print-badge">{activeOrders.length} Order{activeOrders.length > 1 ? 's' : ''} Selected</span>
                <span className="text-xs text-slate-400">Ready for Laser, Inkjet & Thermal Printers</span>
              </div>
            </div>
          </div>
          <button 
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            onClick={onClose}
            title="Close Print Studio"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Format & Action Toolbar ── */}
        <div className="print-studio-toolbar">
          <div className="print-format-selector">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Paper Layout:</span>
            
            <button 
              className={`format-btn ${printFormat === 'a4-invoice' ? 'active' : ''}`}
              onClick={() => setPrintFormat('a4-invoice')}
            >
              <FileText size={15} /> A4 Full Invoice
            </button>

            <button 
              className={`format-btn ${printFormat === 'thermal-sticker-4x6' ? 'active' : ''}`}
              onClick={() => setPrintFormat('thermal-sticker-4x6')}
            >
              <Tag size={15} /> 4"x6" Thermal Sticker
            </button>

            <button 
              className={`format-btn ${printFormat === 'thermal-pos-80mm' ? 'active' : ''}`}
              onClick={() => setPrintFormat('thermal-pos-80mm')}
            >
              <Receipt size={15} /> 80mm POS Receipt
            </button>

            <button 
              className={`format-btn ${printFormat === 'a4-grid-2up' ? 'active' : ''}`}
              onClick={() => setPrintFormat('a4-grid-2up')}
            >
              <Grid size={15} /> A4 2-Up (2/Page)
            </button>
          </div>

          <div className="print-action-group">
            <button 
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-slate-700"
              onClick={() => setShowBrandEditor(!showBrandEditor)}
            >
              <Edit3 size={14} /> {showBrandEditor ? 'Hide Brand Config' : 'Customize Identity'}
            </button>

            <button className="btn-print-now" onClick={handlePrint}>
              <Printer size={18} /> Print Now ({activeOrders.length})
            </button>
          </div>
        </div>

        {/* ── Brand Config Editor (Collapsible) ── */}
        {showBrandEditor && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Company / Brand Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                value={brandInfo.name}
                onChange={e => setBrandInfo({ ...brandInfo, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Logo URL</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                value={brandInfo.logo}
                onChange={e => setBrandInfo({ ...brandInfo, logo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Hotline / Contact</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                value={brandInfo.phone}
                onChange={e => setBrandInfo({ ...brandInfo, phone: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-400 font-semibold mb-1">Store / Warehouse Address</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                value={brandInfo.address}
                onChange={e => setBrandInfo({ ...brandInfo, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Website URL</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                value={brandInfo.website}
                onChange={e => setBrandInfo({ ...brandInfo, website: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ── Settings & Toggles Bar ── */}
        <div className="print-options-panel">
          <span className="font-bold text-slate-400">Display Options:</span>
          
          <label className="option-toggle">
            <input 
              type="checkbox" 
              checked={toggles.showLogo} 
              onChange={() => handleToggle('showLogo')} 
            />
            Show Logo
          </label>

          <label className="option-toggle">
            <input 
              type="checkbox" 
              checked={toggles.showImages} 
              onChange={() => handleToggle('showImages')} 
            />
            Product Images
          </label>

          <label className="option-toggle">
            <input 
              type="checkbox" 
              checked={toggles.showPrices} 
              onChange={() => handleToggle('showPrices')} 
            />
            Prices & Financials
          </label>

          <label className="option-toggle">
            <input 
              type="checkbox" 
              checked={toggles.showBarcode} 
              onChange={() => handleToggle('showBarcode')} 
            />
            Barcode & QR Code
          </label>

          <label className="option-toggle">
            <input 
              type="checkbox" 
              checked={toggles.showTerms} 
              onChange={() => handleToggle('showTerms')} 
            />
            Return Terms
          </label>

          <label className="option-toggle">
            <input 
              type="checkbox" 
              checked={toggles.showSignature} 
              onChange={() => handleToggle('showSignature')} 
            />
            Signature Box
          </label>
        </div>

        {/* ── Live Preview Sheet Workspace ── */}
        <div className="print-workspace" ref={printWorkspaceRef}>
          {activeOrders.map((order, idx) => (
            <div 
              key={order.id || idx} 
              className={`print-document-sheet sheet-${printFormat}`}
            >
              {/* Format 1: A4 Full Tax Invoice */}
              {printFormat === 'a4-invoice' && (
                <RenderA4Invoice 
                  order={order} 
                  brand={brandInfo} 
                  toggles={toggles} 
                />
              )}

              {/* Format 2: 4"x6" Thermal Shipping Sticker */}
              {printFormat === 'thermal-sticker-4x6' && (
                <RenderThermalSticker 
                  order={order} 
                  brand={brandInfo} 
                  toggles={toggles} 
                />
              )}

              {/* Format 3: 80mm POS Receipt */}
              {printFormat === 'thermal-pos-80mm' && (
                <RenderPOSReceipt 
                  order={order} 
                  brand={brandInfo} 
                  toggles={toggles} 
                />
              )}

              {/* Format 4: A4 2-Up Grid */}
              {printFormat === 'a4-grid-2up' && (
                <div className="h-full flex flex-col justify-between">
                  <RenderA4Invoice order={order} brand={brandInfo} toggles={{ ...toggles, showImages: false }} compact />
                  <div className="border-b-2 border-dashed border-slate-300 my-4" />
                  <RenderA4Invoice order={order} brand={brandInfo} toggles={{ ...toggles, showImages: false }} compact />
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
    );
};

/* ── Sub-component 1: Full A4 Invoice Renderer ── */
const RenderA4Invoice = ({ order, brand, toggles, compact = false }) => {
  const orderedItems = useMemo(() => {
    if (Array.isArray(order.ordered_items) && order.ordered_items.length > 0) {
      return order.ordered_items;
    }
    return [{
      name: order.product_name || 'Item Ordered',
      quantity: Number(order.quantity) || 1,
      price: Number(order.price) || 0,
      image: order.image || order.product_image || null,
      selectedSize: order.selected_size || order.size || null,
      selectedColor: order.selected_color || order.color || null
    }];
  }, [order]);

  const deliveryCharge = Number(order.delivery_charge) || Number(order.shipping_cost) || 0;
  const itemsSubtotal = orderedItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const grandTotal = Number(order.total_amount) || (itemsSubtotal + deliveryCharge);
  const isPaid = String(order.status).toLowerCase().includes('completed') || String(order.payment_status).toLowerCase() === 'paid';

  const barcodeSvg = useMemo(() => {
    return generateBarcodeSVG(order.id || 'ORD-000', { height: 40, showText: true });
  }, [order.id]);

  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(`ORDER:${order.id}|PHONE:${order.phone}`, { size: 70 });
  }, [order.id, order.phone]);

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="invoice-header">
          <div className="invoice-brand-col">
            {toggles.showLogo && brand.logo && (
              <img src={brand.logo} alt={brand.name} className="invoice-brand-logo" />
            )}
            <div>
              <div className="invoice-brand-name">{brand.name}</div>
              <div className="invoice-brand-sub">{brand.slogan}</div>
              <div className="invoice-brand-sub mt-1">{brand.address} • Hotline: {brand.phone}</div>
            </div>
          </div>
          <div className="invoice-meta-col">
            <div className="invoice-title">INVOICE</div>
            <div className="invoice-meta-row"><strong>Invoice No:</strong> #{order.id}</div>
            <div className="invoice-meta-row"><strong>Date:</strong> {order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
            <div className="invoice-meta-row"><strong>Payment:</strong> {isPaid ? 'PAID' : 'CASH ON DELIVERY'}</div>
          </div>
        </div>

        {/* Parties Box */}
        <div className="invoice-parties-grid">
          <div className="party-box">
            <div className="party-title">CUSTOMER DETAILS (BILL TO / SHIP TO)</div>
            <div className="party-name">{order.customer_name || 'Valued Customer'}</div>
            <div className="party-detail"><strong>Phone:</strong> {order.phone}</div>
            <div className="party-detail"><strong>Address:</strong> {order.address}</div>
            {order.shipping_zone && (
              <div className="party-detail"><strong>Zone:</strong> {order.shipping_zone}</div>
            )}
          </div>
          <div className="party-box">
            <div className="party-title">SHIPPING & COURIER REF</div>
            <div className="party-detail"><strong>Courier Service:</strong> {order.courier_name || 'Steadfast Courier'}</div>
            <div className="party-detail"><strong>Courier Tracking ID:</strong> {order.tracking_id || order.courier_assigned_id || 'Pending'}</div>
            <div className="party-detail"><strong>Order Status:</strong> {order.status || 'New'}</div>
            {order.notes && (
              <div className="party-detail mt-1 italic text-slate-600"><strong>Note:</strong> {order.notes}</div>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>SL</th>
              {toggles.showImages && <th style={{ width: '50px' }}>Item</th>}
              <th>Product Details</th>
              <th style={{ textAlign: 'right', width: '90px' }}>Price</th>
              <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '100px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.map((item, idx) => {
              const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  {toggles.showImages && (
                    <td>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="item-thumb" />
                      ) : (
                        <div className="item-thumb bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">P</div>
                      )}
                    </td>
                  )}
                  <td>
                    <div className="font-bold text-slate-900">{item.name || item.product_name}</div>
                    {(item.selectedSize || item.selectedColor || item.size || item.color) && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.selectedSize || item.size ? `Size: ${item.selectedSize || item.size}` : ''}
                        {(item.selectedSize || item.size) && (item.selectedColor || item.color) ? ' | ' : ''}
                        {item.selectedColor || item.color ? `Color: ${item.selectedColor || item.color}` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>৳ {Number(item.price || 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳ {itemTotal.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Financial Totals */}
        <div className="invoice-summary-grid">
          <div className="invoice-notes-col">
            <strong>Terms & Return Policy:</strong>
            <p className="mt-1 leading-normal">{brand.terms}</p>
          </div>

          {toggles.showPrices && (
            <table className="invoice-totals-table">
              <tbody>
                <tr>
                  <td className="total-label">Subtotal:</td>
                  <td className="total-val">৳ {itemsSubtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="total-label">Delivery Fee:</td>
                  <td className="total-val">৳ {deliveryCharge.toLocaleString()}</td>
                </tr>
                <tr className="grand-total">
                  <td className="total-label">Cash to Collect:</td>
                  <td className="total-val">৳ {grandTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer / Barcode & Signature */}
      <div className="invoice-footer">
        {toggles.showBarcode ? (
          <div className="invoice-barcode-box">
            <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
          </div>
        ) : <div />}

        {toggles.showBarcode && (
          <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
        )}

        {toggles.showSignature ? (
          <div className="invoice-signature-box">
            <div className="signature-line">Authorized Signature</div>
          </div>
        ) : <div />}
      </div>
    </div>
  );
};

/* ── Sub-component 2: 4"x6" Thermal Sticker Renderer ── */
const RenderThermalSticker = ({ order, brand, toggles }) => {
  const deliveryCharge = Number(order.delivery_charge) || Number(order.shipping_cost) || 0;
  const grandTotal = Number(order.total_amount) || (Number(order.price || 0) + deliveryCharge);
  
  const barcodeSvg = useMemo(() => {
    return generateBarcodeSVG(order.id || 'ORD-000', { height: 35, showText: true });
  }, [order.id]);

  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(`ID:${order.id}|PHONE:${order.phone}`, { size: 55 });
  }, [order.id, order.phone]);

  return (
    <div className="thermal-sticker-box">
      <div>
        {/* Header */}
        <div className="thermal-header">
          <div className="thermal-brand">{brand.name}</div>
          <div className="text-right text-[10px] font-bold">{brand.phone}</div>
        </div>

        {/* COD Banner */}
        <div className="thermal-cod-banner">
          CASH TO COLLECT: ৳ {grandTotal.toLocaleString()}
        </div>

        {/* Recipient */}
        <div className="thermal-recipient">
          <div className="thermal-recipient-title">SHIP TO / RECIPIENT:</div>
          <div className="thermal-customer-name">{order.customer_name || 'Customer'}</div>
          <div className="thermal-customer-phone">📱 {order.phone}</div>
          <div className="thermal-customer-address">📍 {order.address}</div>
          {order.shipping_zone && (
            <div className="text-[10px] font-bold mt-1">Zone: {order.shipping_zone}</div>
          )}
        </div>

        {/* Items Summary */}
        <div className="thermal-items">
          <div className="font-bold border-b border-black pb-0.5 mb-1 text-[9.5px]">ORDER CONTENTS:</div>
          {Array.isArray(order.ordered_items) && order.ordered_items.length > 0 ? (
            order.ordered_items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-[10px] py-0.5">
                <span>{it.name || it.product_name} {it.selectedSize ? `(${it.selectedSize})` : ''}</span>
                <span className="font-bold">x{it.quantity}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between text-[10px]">
              <span>{order.product_name || 'Product Item'}</span>
              <span className="font-bold">x{order.quantity || 1}</span>
            </div>
          )}
        </div>
      </div>

      {/* Barcode Footer */}
      <div className="thermal-barcode-area">
        <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="text-center flex-1 ml-2">
          <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
        </div>
      </div>
    </div>
  );
};

/* ── Sub-component 3: 80mm POS Receipt Renderer ── */
const RenderPOSReceipt = ({ order, brand, toggles }) => {
  const deliveryCharge = Number(order.delivery_charge) || Number(order.shipping_cost) || 0;
  const grandTotal = Number(order.total_amount) || (Number(order.price || 0) + deliveryCharge);
  
  return (
    <div className="p-2 text-black bg-white font-mono text-[10px]">
      <div className="text-center font-bold text-sm uppercase">{brand.name}</div>
      <div className="text-center text-[9px] mb-2">{brand.address} • {brand.phone}</div>
      <div className="border-t border-b border-black py-1 my-1">
        <div>ORDER: #{order.id}</div>
        <div>DATE: {new Date().toLocaleDateString()}</div>
        <div>CUSTOMER: {order.customer_name}</div>
        <div>TEL: {order.phone}</div>
      </div>
      <div className="my-2">
        <div className="font-bold border-b border-black pb-0.5">ITEMS</div>
        {Array.isArray(order.ordered_items) && order.ordered_items.length > 0 ? (
          order.ordered_items.map((it, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span>{it.name} x{it.quantity}</span>
              <span>৳{(Number(it.price) * Number(it.quantity)).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between py-0.5">
            <span>{order.product_name} x{order.quantity || 1}</span>
            <span>৳{Number(order.price || 0).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="border-t border-black pt-1 font-bold text-right text-[11px]">
        TOTAL: ৳{grandTotal.toLocaleString()}
      </div>
      <div className="text-center mt-3 text-[9px] italic">Thank you for shopping with us!</div>
    </div>
  );
};
