'use client';
// @ts-nocheck
import React, { useMemo } from 'react';
import { MappedInvoiceData, BrandInfo, InvoicePrintToggles } from './types';
import { generateBarcodeSVG } from '../../utils/barcode';

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
  // Ultra-compact barcode for 58mm (height: 16px, moduleWidth: 0.95)
  const barcodeSvg = useMemo(() => {
    if (!toggles.showBarcode) return '';
    return generateBarcodeSVG(String(data.orderNumber || data.orderId || 'ORD').slice(-12), {
      height: 16,
      moduleWidth: 0.95,
      showText: true,
    });
  }, [data.orderNumber, data.orderId, toggles.showBarcode]);

  const payableAmount = data.isPaid ? data.grandTotal : data.cashToCollect;

  return (
    <div className="thermal-receipt-58">
      {/* ── 1. Compact Brand / Store Header ── */}
      <div className="thermal-58-header">
        {toggles.showLogo && brand.logo && (
          <img
            src={brand.logo}
            alt={brand.name || 'Store Logo'}
            className="thermal-58-logo"
          />
        )}
        <div className="thermal-58-brand-title">{brand.name || 'PUTIMACH'}</div>
        <div className="thermal-58-brand-contact">
          Hotline: {brand.phone || '+880 1700-000000'}
        </div>
        {brand.address && (
          <div className="thermal-58-brand-address">{brand.address}</div>
        )}
      </div>

      <div className="thermal-58-divider" />

      {/* ── 2. Order Reference & Customer Information ── */}
      <div className="thermal-58-meta-section">
        <div className="thermal-58-row-bold">
          <span>Order: #{data.orderNumber}</span>
          <span className="thermal-58-datetime">{data.dateFormatted} {data.timeFormatted}</span>
        </div>
        <div className="thermal-58-customer-info">
          <div className="thermal-58-cust-name">{data.customerName}</div>
          <div className="thermal-58-cust-phone">Phone: {data.customerPhone}</div>
          <div className="thermal-58-cust-address">Address: {data.deliveryAddress}</div>
          {(data.deliveryArea || data.courierName) && (
            <div className="thermal-58-cust-courier">
              {data.deliveryArea ? `Zone: ${data.deliveryArea}` : ''}
              {data.deliveryArea && data.courierName ? ' • ' : ''}
              {data.courierName ? `Courier: ${data.courierName}` : ''}
              {data.trackingId ? ` (#${data.trackingId})` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="thermal-58-divider" />

      {/* ── 3. Products List (Specialized 2/3-Line Compact Layout) ── */}
      <div className="thermal-58-items-section">
        <div className="thermal-58-items-header">
          <span>ITEM DESCRIPTION</span>
          <span>TOTAL</span>
        </div>

        <div className="thermal-58-items-list">
          {data.items.map((item, idx) => (
            <div key={item.id || idx} className="thermal-58-item-row">
              <div className="thermal-58-item-title">
                {idx + 1}. {item.name}
              </div>
              {(item.size || item.color) && (
                <div className="thermal-58-item-variant">
                  {item.size ? `Size: ${item.size}` : ''}
                  {item.size && item.color ? ' | ' : ''}
                  {item.color ? `Color: ${item.color}` : ''}
                </div>
              )}
              <div className="thermal-58-item-calc">
                <span>{item.quantity} × ৳{Number(item.unitPrice).toLocaleString('en-US')}</span>
                <span className="thermal-58-item-total">৳{Number(item.lineTotal).toLocaleString('en-US')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="thermal-58-divider" />

      {/* ── 4. Financial Totals ── */}
      {toggles.showPrices && (
        <div className="thermal-58-financials">
          <div className="thermal-58-fin-row">
            <span>Subtotal ({data.itemCount} item{data.itemCount > 1 ? 's' : ''}):</span>
            <span>৳{data.subtotal.toLocaleString('en-US')}</span>
          </div>

          <div className="thermal-58-fin-row">
            <span>Delivery Fee:</span>
            <span>৳{data.deliveryCharge.toLocaleString('en-US')}</span>
          </div>

          {data.discount > 0 && (
            <div className="thermal-58-fin-row thermal-58-discount">
              <span>Discount:</span>
              <span>-৳{data.discount.toLocaleString('en-US')}</span>
            </div>
          )}

          {data.advancePaid > 0 && (
            <div className="thermal-58-fin-row thermal-58-advance">
              <span>Advance Paid:</span>
              <span>-৳{data.advancePaid.toLocaleString('en-US')}</span>
            </div>
          )}

          {(data.discount > 0 || data.advancePaid > 0) && (
            <div className="thermal-58-fin-row thermal-58-sub-grand">
              <span>Total Order Value:</span>
              <span>৳{data.grandTotal.toLocaleString('en-US')}</span>
            </div>
          )}

          {/* High-Contrast Cash to Collect Banner (Compact, non-smearing) */}
          <div className="thermal-58-total-banner">
            <div className="thermal-58-total-banner-label">
              {data.isPaid ? 'TOTAL PAID AMOUNT' : 'CASH TO COLLECT (COD)'}
            </div>
            <div className="thermal-58-total-banner-amount">
              ৳{payableAmount.toLocaleString('en-US')}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Payment Method & Status ── */}
      <div className="thermal-58-payment-row">
        <span>Payment: {data.paymentMethod}</span>
        <span className="thermal-58-payment-status">[{data.paymentStatus}]</span>
      </div>

      {/* ── 6. Order Note (if available) ── */}
      {data.orderNote && (
        <div className="thermal-58-note-box">
          <strong>Note:</strong> {data.orderNote}
        </div>
      )}

      {/* ── 7. Barcode (Compact) ── */}
      {toggles.showBarcode && barcodeSvg && (
        <div className="thermal-58-barcode-wrap" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
      )}

      {/* ── 8. Return Terms / Policy ── */}
      {toggles.showTerms && brand.terms && (
        <div className="thermal-58-terms">
          Policy: {brand.terms}
        </div>
      )}

      {/* ── 9. Compact Thank You ── */}
      <div className="thermal-58-footer">
        *** THANK YOU FOR SHOPPING ***
      </div>
    </div>
  );
};
