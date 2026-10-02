'use client';
// @ts-nocheck
import React, { useMemo } from 'react';
import { MappedInvoiceData, BrandInfo, InvoicePrintToggles } from './types';
import { generateBarcodeSVG, generateQRCodeSVG } from '../../utils/barcode';

interface ThermalReceipt80Props {
  data: MappedInvoiceData;
  brand: BrandInfo;
  toggles?: InvoicePrintToggles;
}

export const ThermalReceipt80: React.FC<ThermalReceipt80Props> = ({
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
    return generateBarcodeSVG(String(data.orderNumber || data.orderId || 'ORD').slice(-14), {
      height: 28,
      moduleWidth: 1.3,
      showText: true,
    });
  }, [data.orderNumber, data.orderId, toggles.showBarcode]);

  const qrSvg = useMemo(() => {
    if (!toggles.showBarcode) return '';
    return generateQRCodeSVG(`ORDER:${data.orderNumber}|PHONE:${data.customerPhone}|TOTAL:${data.grandTotal}`, {
      size: 58,
    });
  }, [data.orderNumber, data.customerPhone, data.grandTotal, toggles.showBarcode]);

  return (
    <div
      className="thermal-receipt-80"
      style={{
        width: '80mm',
        maxWidth: '80mm',
        minWidth: '80mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        margin: '0 auto',
      }}
    >
      {/* ── 1. Brand Header ── */}
      <div style={{ textAlign: 'center' }}>
        {toggles.showLogo && brand.logo && (
          <img
            src={brand.logo}
            alt={brand.name}
            style={{
              maxHeight: '32px',
              maxWidth: '80%',
              objectFit: 'contain',
              margin: '0 auto 1.5mm auto',
              display: 'block',
              filter: 'grayscale(100%) contrast(150%)',
            }}
          />
        )}
        <div className="thermal-80-brand-title">{brand.name || 'PUTIMACH'}</div>
        {brand.slogan && <div className="thermal-80-brand-sub" style={{ fontStyle: 'italic' }}>{brand.slogan}</div>}
        {brand.address && <div className="thermal-80-brand-sub" style={{ marginTop: '0.8mm' }}>{brand.address}</div>}
        <div className="thermal-80-brand-sub" style={{ fontWeight: 'bold', marginTop: '0.8mm' }}>
          Hotline: {brand.phone} {brand.email ? `• ${brand.email}` : ''}
        </div>
        {brand.website && <div className="thermal-80-brand-sub">{brand.website}</div>}
      </div>

      <div className="thermal-80-divider" />

      {/* ── 2. Order Reference & Customer Information Grid ── */}
      <div style={{ fontSize: '8pt', lineHeight: 1.3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold' }}>ORDER NO:</span>
          <span style={{ fontSize: '9.5pt', fontWeight: '900' }}>#{data.orderNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#222' }}>
          <span>Order Date & Time:</span>
          <span>{data.dateFormatted} at {data.timeFormatted}</span>
        </div>
      </div>

      {/* Customer / Delivery Details Box */}
      <div style={{ margin: '2mm 0', padding: '2mm', border: '1px solid #000', fontSize: '8pt', lineHeight: 1.3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '1mm', marginBottom: '1.2mm' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '7.5pt' }}>CUSTOMER (BILL & SHIP TO)</span>
          {data.courierName && (
            <span style={{ fontSize: '7pt', color: '#333' }}>Courier: {data.courierName}</span>
          )}
        </div>

        <div style={{ fontSize: '9pt', fontWeight: '900' }}>{data.customerName}</div>
        <div style={{ fontWeight: 'bold', marginTop: '0.8mm' }}>📞 {data.customerPhone}</div>
        <div style={{ marginTop: '0.8mm', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          📍 {data.deliveryAddress}
        </div>
        {data.deliveryArea && (
          <div style={{ fontWeight: 'bold', marginTop: '0.8mm' }}>Zone: {data.deliveryArea}</div>
        )}
        {data.trackingId && (
          <div style={{ fontSize: '7.5pt', color: '#333', marginTop: '0.5mm' }}>
            Tracking ID: #{data.trackingId}
          </div>
        )}
      </div>

      <div className="thermal-80-divider" />

      {/* ── 3. Multi-Column Professional Item Table ── */}
      <div style={{ margin: '1.5mm 0' }}>
        <table className="thermal-80-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '50%' }}>Item Details</th>
              <th style={{ textAlign: 'center', width: '15%' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '15%' }}>Price</th>
              <th style={{ textAlign: 'right', width: '20%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: '1px dotted #ccc' }}>
                <td style={{ textAlign: 'left', paddingRight: '1mm' }}>
                  <div style={{ fontWeight: '800', fontSize: '8.5pt' }}>
                    {idx + 1}. {item.name}
                  </div>
                  {(item.size || item.color || item.sku) && (
                    <div style={{ fontSize: '7.5pt', color: '#333', marginTop: '0.5mm' }}>
                      {item.size ? `Size: ${item.size}` : ''}
                      {item.size && item.color ? ' | ' : ''}
                      {item.color ? `Color: ${item.color}` : ''}
                      {item.sku ? ` (${item.sku})` : ''}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>৳{Number(item.unitPrice).toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: '900' }}>৳{Number(item.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="thermal-80-divider" />

      {/* ── 4. Financial Summary ── */}
      {toggles.showPrices && (
        <div style={{ fontSize: '8.5pt', lineHeight: 1.35 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal ({data.itemCount} items):</span>
            <span>৳{data.subtotal.toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery / Shipping Fee:</span>
            <span>৳{data.deliveryCharge.toLocaleString()}</span>
          </div>

          {data.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Special Discount:</span>
              <span>-৳{data.discount.toLocaleString()}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '1mm', marginTop: '1mm' }}>
            <span>Total Order Amount:</span>
            <span>৳{data.grandTotal.toLocaleString()}</span>
          </div>

          {data.advancePaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Advance Paid Amount:</span>
              <span>-৳{data.advancePaid.toLocaleString()}</span>
            </div>
          )}

          {/* Prominent Total Banner */}
          <div className="thermal-80-total-banner">
            <div className="thermal-80-total-banner-label">
              {data.isPaid ? 'TOTAL PAID AMOUNT' : 'NET CASH TO COLLECT (COD)'}
            </div>
            <div className="thermal-80-total-banner-amount">
              ৳{(data.isPaid ? data.grandTotal : data.cashToCollect).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Payment & Order Status ── */}
      <div style={{ fontSize: '8pt', lineHeight: 1.3, marginTop: '1mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Payment Method:</span>
          <span>{data.paymentMethod}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Payment Status:</span>
          <span style={{ fontWeight: '900' }}>{data.paymentStatus}</span>
        </div>
      </div>

      {/* ── 6. Order Note (if any) ── */}
      {data.orderNote && (
        <div style={{ margin: '2mm 0', padding: '1.5mm', border: '1px dashed #000', fontSize: '7.5pt', lineHeight: 1.25 }}>
          <strong>Special Instructions / Note:</strong> {data.orderNote}
        </div>
      )}

      {/* ── 7. Barcode & QR Code Section ── */}
      {toggles.showBarcode && (
        <div style={{ marginTop: '2.5mm', paddingTop: '2mm', borderTop: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm' }}>
          {qrSvg && (
            <div
              style={{ shrink: 0 }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          {barcodeSvg && (
            <div
              style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
          )}
        </div>
      )}

      {/* ── 8. Return Terms / Policy ── */}
      {toggles.showTerms && brand.terms && (
        <div style={{ fontSize: '7pt', textAlign: 'center', color: '#222', lineHeight: 1.25, marginTop: '2.5mm', padding: '0 1mm' }}>
          <strong>Policy:</strong> {brand.terms}
        </div>
      )}

      {/* ── 9. Thank You Message ── */}
      <div style={{ textAlign: 'center', fontSize: '8pt', fontWeight: '900', textTransform: 'uppercase', marginTop: '2.5mm', letterSpacing: '0.75px' }}>
        *** THANK YOU FOR SHOPPING WITH US ***
      </div>
    </div>
  );
};
