'use client';
// @ts-nocheck
import React, { useMemo } from 'react';
import { MappedInvoiceData, BrandInfo, InvoicePrintToggles } from './types';
import { generateBarcodeSVG, generateQRCodeSVG } from '../../utils/barcode';

interface StandardInvoiceProps {
  data: MappedInvoiceData;
  brand: BrandInfo;
  toggles?: InvoicePrintToggles;
  compact?: boolean;
}

export const StandardInvoice: React.FC<StandardInvoiceProps> = ({
  data,
  brand,
  toggles = {
    showLogo: true,
    showImages: true,
    showPrices: true,
    showBarcode: true,
    showTerms: true,
    showSignature: true,
  },
  compact = false,
}) => {
  const barcodeSvg = useMemo(() => {
    if (!toggles.showBarcode) return '';
    return generateBarcodeSVG(String(data.orderNumber || data.orderId || 'ORD').slice(-14), {
      height: 40,
      showText: true,
    });
  }, [data.orderNumber, data.orderId, toggles.showBarcode]);

  const qrSvg = useMemo(() => {
    if (!toggles.showBarcode) return '';
    return generateQRCodeSVG(`ORDER:${data.orderNumber}|PHONE:${data.customerPhone}|TOTAL:${data.grandTotal}`, {
      size: 70,
    });
  }, [data.orderNumber, data.customerPhone, data.grandTotal, toggles.showBarcode]);

  return (
    <div className={`standard-invoice-a4 ${compact ? 'compact' : ''} w-full h-full flex flex-col justify-between`}>
      <div>
        {/* Brand Header */}
        <div className="invoice-header">
          <div className="invoice-brand-col">
            {toggles.showLogo && brand.logo && (
              <img src={brand.logo} alt={brand.name} className="invoice-brand-logo" />
            )}
            <div>
              <div className="invoice-brand-name">{brand.name || 'PUTIMACH'}</div>
              {brand.slogan && <div className="invoice-brand-sub">{brand.slogan}</div>}
              <div className="invoice-brand-sub mt-1">
                {brand.address} • Hotline: {brand.phone}
              </div>
            </div>
          </div>
          <div className="invoice-meta-col">
            <div className="invoice-title">INVOICE</div>
            <div className="invoice-meta-row"><strong>Invoice No:</strong> #{data.orderNumber}</div>
            <div className="invoice-meta-row"><strong>Date:</strong> {data.dateFormatted}</div>
            <div className="invoice-meta-row"><strong>Time:</strong> {data.timeFormatted}</div>
            <div className="invoice-meta-row">
              <strong>Payment:</strong> {data.paymentStatus}
            </div>
          </div>
        </div>

        {/* Parties Box */}
        <div className="invoice-parties-grid">
          <div className="party-box">
            <div className="party-title">CUSTOMER DETAILS (BILL TO / SHIP TO)</div>
            <div className="party-name">{data.customerName}</div>
            <div className="party-detail"><strong>Phone:</strong> {data.customerPhone}</div>
            <div className="party-detail"><strong>Address:</strong> {data.deliveryAddress}</div>
            {data.deliveryArea && (
              <div className="party-detail"><strong>Zone / Area:</strong> {data.deliveryArea}</div>
            )}
          </div>
          <div className="party-box">
            <div className="party-title">SHIPPING & COURIER REF</div>
            <div className="party-detail"><strong>Courier Service:</strong> {data.courierName || 'Steadfast Courier'}</div>
            <div className="party-detail"><strong>Tracking ID:</strong> {data.trackingId || 'Pending'}</div>
            <div className="party-detail"><strong>Order Status:</strong> {data.status}</div>
            {data.orderNote && (
              <div className="party-detail mt-1 italic text-slate-600"><strong>Note:</strong> {data.orderNote}</div>
            )}
          </div>
        </div>

        {/* Table of Items */}
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>SL</th>
              {toggles.showImages && <th style={{ width: '50px' }}>Item</th>}
              <th>Product Details</th>
              <th style={{ textAlign: 'right', width: '90px' }}>Unit Price</th>
              <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '100px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={item.id || idx}>
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
                  <div className="font-bold text-slate-900">{item.name}</div>
                  {(item.size || item.color || item.sku) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.size ? `Size: ${item.size}` : ''}
                      {item.size && item.color ? ' | ' : ''}
                      {item.color ? `Color: ${item.color}` : ''}
                      {item.sku ? ` (${item.sku})` : ''}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>৳ {Number(item.unitPrice).toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳ {Number(item.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary */}
        <div className="invoice-summary-grid">
          <div className="invoice-notes-col">
            <strong>Terms & Return Policy:</strong>
            <p className="mt-1 leading-normal">{brand.terms || 'Items can be exchanged within 7 days with original invoice & tag intact.'}</p>
          </div>

          {toggles.showPrices && (
            <table className="invoice-totals-table">
              <tbody>
                <tr>
                  <td className="total-label">Subtotal:</td>
                  <td className="total-val">৳ {data.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="total-label">Delivery Fee:</td>
                  <td className="total-val">৳ {data.deliveryCharge.toLocaleString()}</td>
                </tr>
                {data.discount > 0 && (
                  <tr>
                    <td className="total-label">Discount:</td>
                    <td className="total-val">-৳ {data.discount.toLocaleString()}</td>
                  </tr>
                )}
                {data.advancePaid > 0 && (
                  <tr>
                    <td className="total-label">Advance Paid:</td>
                    <td className="total-val">-৳ {data.advancePaid.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="grand-total">
                  <td className="total-label">{data.isPaid ? 'Total Paid:' : 'Cash to Collect:'}</td>
                  <td className="total-val">৳ {(data.isPaid ? data.grandTotal : data.cashToCollect).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer / Barcode & Signature */}
      <div className="invoice-footer">
        {toggles.showBarcode && barcodeSvg ? (
          <div className="invoice-barcode-box">
            <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
          </div>
        ) : <div />}

        {toggles.showBarcode && qrSvg && (
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
