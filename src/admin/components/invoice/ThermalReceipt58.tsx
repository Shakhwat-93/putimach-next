'use client';
// @ts-nocheck
import React, { useMemo } from 'react';
import { MappedInvoiceData, BrandInfo, InvoicePrintToggles } from './types';
import { generateBarcodeSVG, generateQRCodeSVG } from '../../utils/barcode';

interface ThermalReceipt58Props {
  data: MappedInvoiceData;
  brand: BrandInfo;
  toggles?: InvoicePrintToggles;
}

export const ThermalReceipt58: React.FC<ThermalReceipt58Props> = ({
  data,
  brand,
  toggles = {
    showLogo: true,
    showPrices: true,
    showBarcode: true,
    showTerms: true,
  }
}) => {
  const barcodeSvg = useMemo(() => {
    if (!toggles.showBarcode) return '';
    return generateBarcodeSVG(String(data.orderNumber || data.orderId || 'ORD').slice(-12), {
      height: 24,
      moduleWidth: 1.1,
      showText: true,
    });
  }, [data.orderNumber, data.orderId, toggles.showBarcode]);

  const qrSvg = useMemo(() => {
    if (!toggles.showBarcode) return '';
    return generateQRCodeSVG(`ORDER:${data.orderNumber}|TEL:${data.customerPhone}|TOTAL:${data.grandTotal}`, {
      size: 48,
    });
  }, [data.orderNumber, data.customerPhone, data.grandTotal, toggles.showBarcode]);

  return (
    <div
      className="thermal-receipt-58"
      style={{
        width: '58mm',
        maxWidth: '58mm',
        minWidth: '58mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        margin: '0 auto',
      }}
    >
      {/* ── 1. Store / Brand Name & Contacts ── */}
      <div style={{ textAlign: 'center' }}>
        {toggles.showLogo && brand.logo && (
          <img
            src={brand.logo}
            alt={brand.name}
            style={{
              maxHeight: '26px',
              maxWidth: '85%',
              objectFit: 'contain',
              margin: '0 auto 1.5mm auto',
              display: 'block',
              filter: 'grayscale(100%) contrast(150%)',
            }}
          />
        )}
        <div className="thermal-58-brand-title">{brand.name || 'PUTIMACH'}</div>
        {brand.slogan && <div className="thermal-58-brand-sub" style={{ fontStyle: 'italic' }}>{brand.slogan}</div>}
        {brand.address && <div className="thermal-58-brand-sub" style={{ marginTop: '0.5mm' }}>{brand.address}</div>}
        <div className="thermal-58-brand-sub" style={{ fontWeight: 'bold', marginTop: '0.5mm' }}>
          Hotline: {brand.phone}
        </div>
        {brand.website && <div className="thermal-58-brand-sub">{brand.website}</div>}
      </div>

      <div className="thermal-58-divider" />

      {/* ── 2. Order Reference & Customer ── */}
      <div style={{ fontSize: '7.5pt', lineHeight: 1.25 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>ORDER REF:</span>
          <span style={{ fontSize: '8.5pt' }}>#{data.orderNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#222' }}>
          <span>Date:</span>
          <span>{data.dateFormatted}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#222' }}>
          <span>Time:</span>
          <span>{data.timeFormatted}</span>
        </div>
      </div>

      {/* Customer Box */}
      <div className="thermal-58-customer-box">
        <div className="thermal-58-customer-title">CUSTOMER / DELIVERY INFO</div>
        <div className="thermal-58-customer-name">{data.customerName}</div>
        <div style={{ fontWeight: 'bold', marginTop: '0.5mm' }}>Tel: {data.customerPhone}</div>
        <div style={{ marginTop: '0.5mm', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          Address: {data.deliveryAddress}
        </div>
        {data.deliveryArea && (
          <div style={{ fontWeight: 'bold', marginTop: '0.5mm' }}>Zone: {data.deliveryArea}</div>
        )}
        {data.courierName && (
          <div style={{ fontSize: '7pt', color: '#333', marginTop: '0.5mm' }}>
            Courier: {data.courierName} {data.trackingId ? `(#${data.trackingId})` : ''}
          </div>
        )}
      </div>

      <div className="thermal-58-divider" />

      {/* ── 3. Products List (Optimized for Narrow Paper) ── */}
      <div style={{ margin: '1mm 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', fontWeight: '900', borderBottom: '1px solid #000', paddingBottom: '0.5mm', marginBottom: '1mm' }}>
          <span>PRODUCT</span>
          <span>TOTAL</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
          {data.items.map((item, idx) => (
            <div key={item.id || idx} className="thermal-58-product-row">
              <div className="thermal-58-product-title">
                {idx + 1}. {item.name}
              </div>
              {(item.size || item.color) && (
                <div className="thermal-58-product-variant">
                  {item.size ? `Size: ${item.size}` : ''}
                  {item.size && item.color ? ' | ' : ''}
                  {item.color ? `Color: ${item.color}` : ''}
                </div>
              )}
              <div className="thermal-58-product-calc">
                <span>{item.quantity} × ৳{Number(item.unitPrice).toLocaleString()}</span>
                <span style={{ fontWeight: '900' }}>৳{Number(item.lineTotal).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="thermal-58-divider" />

      {/* ── 4. Financial Totals ── */}
      {toggles.showPrices && (
        <div style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal ({data.itemCount} items):</span>
            <span>৳{data.subtotal.toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery Charge:</span>
            <span>৳{data.deliveryCharge.toLocaleString()}</span>
          </div>

          {data.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Discount:</span>
              <span>-৳{data.discount.toLocaleString()}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dotted #000', paddingTop: '0.8mm', marginTop: '0.8mm' }}>
            <span>Total Amount:</span>
            <span>৳{data.grandTotal.toLocaleString()}</span>
          </div>

          {data.advancePaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Advance Paid:</span>
              <span>-৳{data.advancePaid.toLocaleString()}</span>
            </div>
          )}

          {/* Prominent High-Contrast Cash to Collect Banner */}
          <div className="thermal-58-total-banner">
            <div className="thermal-58-total-banner-label">
              {data.isPaid ? 'TOTAL PAID AMOUNT' : 'CASH TO COLLECT (COD)'}
            </div>
            <div className="thermal-58-total-banner-amount">
              ৳{(data.isPaid ? data.grandTotal : data.cashToCollect).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Payment Method & Status ── */}
      <div style={{ fontSize: '7.5pt', lineHeight: 1.25, marginTop: '1mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Payment Method:</span>
          <span>{data.paymentMethod}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Payment Status:</span>
          <span style={{ fontWeight: '900' }}>{data.paymentStatus}</span>
        </div>
      </div>

      {/* ── 6. Order Note (if available) ── */}
      {data.orderNote && (
        <div style={{ margin: '1.5mm 0', padding: '1mm', border: '1px dashed #444', fontSize: '7pt', lineHeight: 1.2 }}>
          <strong>Order Note:</strong> {data.orderNote}
        </div>
      )}

      {/* ── 7. Barcode & QR Code Section ── */}
      {toggles.showBarcode && (
        <div style={{ marginTop: '2mm', paddingTop: '1.5mm', borderTop: '1px dashed #000', textAlign: 'center' }}>
          {barcodeSvg && (
            <div
              style={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center', marginBottom: '1.5mm' }}
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
          )}
          {qrSvg && (
            <div
              style={{ display: 'flex', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
        </div>
      )}

      {/* ── 8. Return Terms / Policy ── */}
      {toggles.showTerms && brand.terms && (
        <div style={{ fontSize: '6.5pt', textAlign: 'center', color: '#333', lineHeight: 1.2, marginTop: '2mm', padding: '0 1mm' }}>
          {brand.terms}
        </div>
      )}

      {/* ── 9. Thank You Message ── */}
      <div className="thermal-58-footer-msg">
        *** THANK YOU FOR SHOPPING ***
      </div>
    </div>
  );
};
