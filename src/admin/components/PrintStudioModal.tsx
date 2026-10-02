'use client';
// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './PrintStudioModal.css';
import './invoice/thermalReceipts.css';
import { 
  Printer, X, FileText, Tag, Receipt, Grid, 
  Settings, Image, Check, Eye, Copy, RefreshCw, ChevronDown, ChevronUp, Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBarcodeSVG, generateQRCodeSVG } from '../utils/barcode';
import { 
  mapOrderToInvoiceData, 
  ThermalReceipt58, 
  ThermalReceipt80, 
  StandardInvoice 
} from './invoice';

export const PrintStudioModal = ({
  isOpen,
  onClose,
  orders = [],
  initialFormat = 'a4-invoice'
}) => {
  const [printFormat, setPrintFormat] = useState(initialFormat);
  const [showBrandEditor, setShowBrandEditor] = useState(false);

  useEffect(() => {
    if (initialFormat) {
      setPrintFormat(initialFormat);
    }
  }, [initialFormat, isOpen]);

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

    // Collect all stylesheets from current page
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
        } catch { return ''; }
      })
      .join('\n');

    let pageCss = '';
    let bodyCss = '';

    if (printFormat === 'thermal-pos-58mm') {
      pageCss = '@page { size: 58mm auto; margin: 0; }';
      bodyCss = `
        * { box-sizing: border-box !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 58mm !important;
          max-width: 58mm !important;
          min-width: 58mm !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          overflow-x: hidden !important;
        }
        .print-workspace { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
        .print-document-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; border: none !important; background: transparent !important; }
        .thermal-receipt-58 {
          width: 58mm !important;
          max-width: 58mm !important;
          min-width: 58mm !important;
          margin: 0 auto !important;
          padding: 2.5mm 3.5mm !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: always;
          break-after: page;
        }
        .thermal-receipt-58:last-child {
          page-break-after: auto;
          break-after: auto;
        }
      `;
    } else if (printFormat === 'thermal-pos-80mm') {
      pageCss = '@page { size: 80mm auto; margin: 0; }';
      bodyCss = `
        * { box-sizing: border-box !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          max-width: 80mm !important;
          min-width: 80mm !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          overflow-x: hidden !important;
        }
        .print-workspace { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
        .print-document-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; border: none !important; background: transparent !important; }
        .thermal-receipt-80 {
          width: 80mm !important;
          max-width: 80mm !important;
          min-width: 80mm !important;
          margin: 0 auto !important;
          padding: 3.5mm 4.5mm !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: always;
          break-after: page;
        }
        .thermal-receipt-80:last-child {
          page-break-after: auto;
          break-after: auto;
        }
      `;
    } else if (printFormat === 'thermal-sticker-4x6') {
      pageCss = '@page { size: 101.6mm 152.4mm; margin: 0; }';
      bodyCss = `
        html, body { margin: 0 !important; padding: 0 !important; width: 101.6mm !important; background: #fff !important; }
        .print-workspace { background: #fff !important; padding: 0 !important; margin: 0 !important; }
        .sheet-thermal-sticker-4x6, .print-document-sheet { width: 101.6mm !important; max-width: 101.6mm !important; margin: 0 auto !important; box-shadow: none !important; border: none !important; }
      `;
    } else {
      pageCss = '@page { size: A4 portrait; margin: 8mm; }';
      bodyCss = `
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .print-workspace { background: #fff !important; padding: 0 !important; }
        .print-document-sheet { box-shadow: none !important; margin: 0 auto 20px auto !important; }
      `;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      // Fallback: create invisible iframe for printing when popups are blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Print - PutiMach</title><style>${styles}\n${pageCss}\n${bodyCss}</style></head><body>${printContent.innerHTML}</body></html>`);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 2500);
        }, 500);
      }
      return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print - PutiMach</title>
  <style>
    ${styles}
    ${pageCss}
    ${bodyCss}
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
              <h2>Enterprise Invoice & Receipt Studio</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="print-badge">{activeOrders.length} Order{activeOrders.length > 1 ? 's' : ''} Selected</span>
                <span className="text-xs text-slate-400">Ready for A4 Laser/Inkjet & 58mm / 80mm Thermal POS Printers</span>
              </div>
            </div>
          </div>
          <button 
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
            title="Close Print Studio"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Format & Action Toolbar ── */}
        <div className="print-studio-toolbar">
          <div className="print-format-selector">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Print Layout:</span>
            
            <button 
              type="button"
              className={`format-btn ${printFormat === 'a4-invoice' ? 'active' : ''}`}
              onClick={() => setPrintFormat('a4-invoice')}
            >
              <FileText size={15} /> 1. Standard / A4 Invoice
            </button>

            <button 
              type="button"
              className={`format-btn ${printFormat === 'thermal-pos-58mm' ? 'active' : ''}`}
              onClick={() => setPrintFormat('thermal-pos-58mm')}
            >
              <Receipt size={15} /> 2. 58mm Thermal Receipt
            </button>

            <button 
              type="button"
              className={`format-btn ${printFormat === 'thermal-pos-80mm' ? 'active' : ''}`}
              onClick={() => setPrintFormat('thermal-pos-80mm')}
            >
              <Receipt size={15} /> 3. 80mm Thermal Receipt
            </button>

            <button 
              type="button"
              className={`format-btn ${printFormat === 'thermal-sticker-4x6' ? 'active' : ''}`}
              onClick={() => setPrintFormat('thermal-sticker-4x6')}
            >
              <Tag size={15} /> 4"x6" Thermal Sticker
            </button>

            <button 
              type="button"
              className={`format-btn ${printFormat === 'a4-grid-2up' ? 'active' : ''}`}
              onClick={() => setPrintFormat('a4-grid-2up')}
            >
              <Grid size={15} /> A4 2-Up (2/Page)
            </button>
          </div>

          <div className="print-action-group">
            <button 
              type="button"
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              onClick={() => setShowBrandEditor(!showBrandEditor)}
            >
              <Edit3 size={14} /> {showBrandEditor ? 'Hide Brand Config' : 'Customize Identity'}
            </button>

            <button type="button" className="btn-print-now cursor-pointer" onClick={handlePrint}>
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
            Product Images (A4)
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

          {printFormat === 'a4-invoice' && (
            <label className="option-toggle">
              <input 
                type="checkbox" 
                checked={toggles.showSignature} 
                onChange={() => handleToggle('showSignature')} 
              />
              Signature Box
            </label>
          )}
        </div>

        {/* ── Live Preview Sheet Workspace ── */}
        <div className="print-workspace" ref={printWorkspaceRef}>
          {activeOrders.map((order, idx) => {
            const mappedData = mapOrderToInvoiceData(order);

            return (
              <div 
                key={order.id || idx} 
                className={`print-document-sheet sheet-${printFormat}`}
              >
                {/* 1. Standard / A4 Invoice */}
                {printFormat === 'a4-invoice' && (
                  <StandardInvoice 
                    data={mappedData} 
                    brand={brandInfo} 
                    toggles={toggles} 
                  />
                )}

                {/* 2. 58mm Thermal Receipt */}
                {printFormat === 'thermal-pos-58mm' && (
                  <ThermalReceipt58 
                    data={mappedData} 
                    brand={brandInfo} 
                    toggles={toggles} 
                  />
                )}

                {/* 3. 80mm Thermal Receipt */}
                {printFormat === 'thermal-pos-80mm' && (
                  <ThermalReceipt80 
                    data={mappedData} 
                    brand={brandInfo} 
                    toggles={toggles} 
                  />
                )}

                {/* 4. 4"x6" Thermal Shipping Sticker */}
                {printFormat === 'thermal-sticker-4x6' && (
                  <RenderThermalSticker 
                    order={order} 
                    brand={brandInfo} 
                    toggles={toggles} 
                  />
                )}

                {/* 5. A4 2-Up Grid */}
                {printFormat === 'a4-grid-2up' && (
                  <div className="h-full flex flex-col justify-between">
                    <StandardInvoice data={mappedData} brand={brandInfo} toggles={{ ...toggles, showImages: false }} compact />
                    <div className="border-b-2 border-dashed border-slate-300 my-4" />
                    <StandardInvoice data={mappedData} brand={brandInfo} toggles={{ ...toggles, showImages: false }} compact />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

/* ── 4"x6" Thermal Sticker Renderer ── */
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
