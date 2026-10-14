/**
 * Isolated Self-Contained Print CSS Generator
 * Guarantees zero leakage from dashboard/dark-mode styles and applies
 * exact physical millimetre paper dimensions and @page directives.
 */

export function getIsolatedPrintCss(format: string): string {
  let pageRule = '';
  let containerRule = '';

  if (format === 'thermal-pos-58mm') {
    pageRule = `
      @page {
        size: 58mm auto;
        margin: 0;
      }
    `;
    containerRule = `
      html, body {
        width: 58mm !important;
        min-width: 58mm !important;
        max-width: 58mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        overflow-x: hidden !important;
        font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
      }
      .print-document-sheet,
      .sheet-thermal-pos-58mm {
        width: 58mm !important;
        min-width: 58mm !important;
        max-width: 58mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;
  } else if (format === 'thermal-pos-80mm') {
    pageRule = `
      @page {
        size: 80mm auto;
        margin: 0;
      }
    `;
    containerRule = `
      html, body {
        width: 80mm !important;
        min-width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        overflow-x: hidden !important;
        font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
      }
      .print-document-sheet,
      .sheet-thermal-pos-80mm {
        width: 80mm !important;
        min-width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;
  } else if (format === 'thermal-sticker-4x6') {
    pageRule = `
      @page {
        size: 101.6mm 152.4mm;
        margin: 0;
      }
    `;
    containerRule = `
      html, body {
        width: 101.6mm !important;
        min-width: 101.6mm !important;
        max-width: 101.6mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .print-document-sheet,
      .sheet-thermal-sticker-4x6 {
        width: 101.6mm !important;
        height: 152.4mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
      }
    `;
  } else {
    // A4 Default
    pageRule = `
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
    `;
    containerRule = `
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      .print-document-sheet,
      .sheet-a4-invoice {
        width: 100% !important;
        max-width: 194mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;
  }

  return `
    /* Universal Reset */
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    ${pageRule}
    ${containerRule}

    .print-document-sheet:not(:last-child) {
      page-break-after: always !important;
      break-after: page !important;
    }
    .print-document-sheet:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }

    /* ════════════════════════════════════════════════════════════════
       1. 58mm DEDICATED THERMAL RECEIPT STYLES
       ════════════════════════════════════════════════════════════════ */
    .thermal-receipt-58 {
      width: 58mm !important;
      min-width: 58mm !important;
      max-width: 58mm !important;
      box-sizing: border-box !important;
      margin: 0 auto !important;
      padding: 2.5mm 4mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, Consolas, Monaco, monospace !important;
      font-size: 8pt !important;
      line-height: 1.25 !important;
      overflow: hidden !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    .thermal-receipt-58 * {
      box-sizing: border-box !important;
      color: #000000 !important;
    }

    .thermal-58-brand-title {
      font-size: 11pt !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      text-align: center !important;
      letter-spacing: 0.5px !important;
      line-height: 1.15 !important;
      margin-bottom: 1.5mm !important;
    }

    .thermal-58-brand-sub {
      font-size: 7pt !important;
      text-align: center !important;
      line-height: 1.2 !important;
    }

    .thermal-58-divider {
      border: none !important;
      border-top: 1px dashed #000000 !important;
      margin: 1.5mm 0 !important;
      width: 100% !important;
    }

    .thermal-58-double-divider {
      border: none !important;
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      height: 2px !important;
      margin: 1.5mm 0 !important;
      width: 100% !important;
    }

    .thermal-58-customer-box {
      margin: 1.5mm 0 !important;
      padding: 1.5mm !important;
      border: 1px solid #000000 !important;
      font-size: 7.5pt !important;
      line-height: 1.2 !important;
    }

    .thermal-58-customer-title {
      font-weight: 800 !important;
      font-size: 7pt !important;
      text-transform: uppercase !important;
      border-bottom: 1px solid #000000 !important;
      padding-bottom: 0.8mm !important;
      margin-bottom: 1mm !important;
    }

    .thermal-58-customer-name {
      font-size: 8.5pt !important;
      font-weight: 900 !important;
    }

    .thermal-58-product-row {
      margin-bottom: 1.5mm !important;
      font-size: 8pt !important;
      line-height: 1.2 !important;
    }

    .thermal-58-product-title {
      font-weight: 800 !important;
      font-size: 8pt !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    .thermal-58-product-variant {
      font-size: 7pt !important;
      color: #333333 !important;
      margin-top: 0.5mm !important;
    }

    .thermal-58-product-calc {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      font-size: 7.5pt !important;
      margin-top: 0.5mm !important;
    }

    .thermal-58-total-banner {
      background-color: #000000 !important;
      color: #ffffff !important;
      padding: 2mm !important;
      text-align: center !important;
      margin: 2mm 0 !important;
    }

    .thermal-58-total-banner * {
      color: #ffffff !important;
    }

    .thermal-58-total-banner-label {
      font-size: 7pt !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }

    .thermal-58-total-banner-amount {
      font-size: 12pt !important;
      font-weight: 900 !important;
      margin-top: 0.8mm !important;
    }

    .thermal-58-footer-msg {
      text-align: center !important;
      font-size: 7pt !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      margin-top: 2mm !important;
      letter-spacing: 0.5px !important;
    }

    /* ════════════════════════════════════════════════════════════════
       2. 80mm DEDICATED THERMAL RECEIPT STYLES
       ════════════════════════════════════════════════════════════════ */
    .thermal-receipt-80 {
      width: 80mm !important;
      min-width: 80mm !important;
      max-width: 80mm !important;
      box-sizing: border-box !important;
      margin: 0 auto !important;
      padding: 3mm 4mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, Consolas, Monaco, monospace !important;
      font-size: 8.5pt !important;
      line-height: 1.3 !important;
      overflow: hidden !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    .thermal-receipt-80 * {
      box-sizing: border-box !important;
      color: #000000 !important;
    }

    .thermal-80-brand-title {
      font-size: 13pt !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      text-align: center !important;
      letter-spacing: 0.75px !important;
      line-height: 1.2 !important;
      margin-bottom: 1.5mm !important;
    }

    .thermal-80-brand-sub {
      font-size: 8pt !important;
      text-align: center !important;
      line-height: 1.25 !important;
    }

    .thermal-80-divider {
      border: none !important;
      border-top: 1px dashed #000000 !important;
      margin: 2mm 0 !important;
      width: 100% !important;
    }

    .thermal-80-double-divider {
      border: none !important;
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      height: 2px !important;
      margin: 2mm 0 !important;
      width: 100% !important;
    }

    .thermal-80-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 1.5mm 0 !important;
    }

    .thermal-80-table th {
      border-bottom: 1px solid #000000 !important;
      padding: 1.2mm 0.8mm !important;
      font-size: 8pt !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    .thermal-80-table td {
      padding: 1.2mm 0.8mm !important;
      vertical-align: top !important;
      font-size: 8.5pt !important;
    }

    .thermal-80-total-banner {
      background-color: #000000 !important;
      color: #ffffff !important;
      padding: 2.5mm !important;
      text-align: center !important;
      margin: 2.5mm 0 !important;
    }

    .thermal-80-total-banner * {
      color: #ffffff !important;
    }

    .thermal-80-total-banner-label {
      font-size: 8pt !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }

    .thermal-80-total-banner-amount {
      font-size: 14pt !important;
      font-weight: 900 !important;
      margin-top: 1mm !important;
    }

    /* ════════════════════════════════════════════════════════════════
       3. STANDARD A4 INVOICE STYLES
       ════════════════════════════════════════════════════════════════ */
    .standard-invoice-a4 {
      width: 100% !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }

    .invoice-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      border-bottom: 2px solid #0f172a !important;
      padding-bottom: 12px !important;
      margin-bottom: 16px !important;
    }

    .invoice-brand-col {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }

    .invoice-brand-logo {
      max-height: 48px !important;
      max-width: 140px !important;
      object-fit: contain !important;
    }

    .invoice-brand-name {
      font-size: 20px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      color: #0f172a !important;
      letter-spacing: -0.02em !important;
    }

    .invoice-brand-sub {
      font-size: 11px !important;
      color: #475569 !important;
    }

    .invoice-meta-col {
      text-align: right !important;
    }

    .invoice-title {
      font-size: 22px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      color: #0d9488 !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 4px !important;
    }

    .invoice-meta-row {
      font-size: 11px !important;
      color: #334155 !important;
      margin-top: 2px !important;
    }

    .invoice-parties-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 16px !important;
      margin-bottom: 16px !important;
    }

    .party-box {
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 10px 12px !important;
      background: #f8fafc !important;
    }

    .party-title {
      font-size: 10px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      color: #0d9488 !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 6px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding-bottom: 4px !important;
    }

    .party-name {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
    }

    .party-detail {
      font-size: 11px !important;
      color: #334155 !important;
      margin-top: 3px !important;
      line-height: 1.4 !important;
    }

    .invoice-items-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 16px !important;
      font-size: 11px !important;
    }

    .invoice-items-table th {
      background: #0f172a !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      font-size: 10px !important;
      padding: 8px 10px !important;
      text-align: left !important;
    }

    .invoice-items-table td {
      padding: 8px 10px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      color: #1e293b !important;
      vertical-align: middle !important;
    }

    .invoice-items-table tr:nth-child(even) td {
      background: #f8fafc !important;
    }

    .item-thumb {
      width: 32px !important;
      height: 32px !important;
      border-radius: 4px !important;
      object-fit: cover !important;
      border: 1px solid #cbd5e1 !important;
    }

    .invoice-summary-grid {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      margin-bottom: 20px !important;
      gap: 16px !important;
    }

    .invoice-notes-col {
      flex: 1 !important;
      font-size: 10px !important;
      color: #475569 !important;
      border: 1px dashed #cbd5e1 !important;
      padding: 10px !important;
      border-radius: 6px !important;
      background: #fafafa !important;
    }

    .invoice-totals-table {
      width: 220px !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
    }

    .invoice-totals-table td {
      padding: 4px 8px !important;
      text-align: right !important;
    }

    .invoice-totals-table .total-label {
      color: #475569 !important;
      font-weight: 600 !important;
    }

    .invoice-totals-table .total-val {
      color: #0f172a !important;
      font-weight: 700 !important;
    }

    .invoice-totals-table tr.grand-total td {
      border-top: 2px solid #0f172a !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      color: #0d9488 !important;
      padding-top: 6px !important;
    }

    .invoice-footer {
      margin-top: 24px !important;
      border-top: 1px solid #e2e8f0 !important;
      padding-top: 12px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
    }

    .invoice-barcode-box {
      text-align: center !important;
    }

    .invoice-signature-box {
      text-align: center !important;
      width: 140px !important;
    }

    .signature-line {
      border-top: 1px solid #0f172a !important;
      margin-top: 40px !important;
      padding-top: 4px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      color: #334155 !important;
    }

    /* ════════════════════════════════════════════════════════════════
       4. 4"x6" THERMAL SHIPPING STICKER
       ════════════════════════════════════════════════════════════════ */
    .thermal-sticker-box {
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      border: 2px solid #000000 !important;
      box-sizing: border-box !important;
      padding: 8px !important;
      background: #ffffff !important;
    }

    .thermal-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 2px solid #000000 !important;
      padding-bottom: 4px !important;
      margin-bottom: 6px !important;
    }

    .thermal-brand {
      font-weight: 900 !important;
      font-size: 14px !important;
      text-transform: uppercase !important;
    }

    .thermal-cod-banner {
      background: #000000 !important;
      color: #ffffff !important;
      text-align: center !important;
      font-weight: 900 !important;
      font-size: 16px !important;
      padding: 6px 4px !important;
      margin-bottom: 6px !important;
      border-radius: 2px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.02em !important;
    }

    .thermal-recipient {
      border: 2px solid #000000 !important;
      padding: 6px !important;
      margin-bottom: 6px !important;
    }

    .thermal-recipient-title {
      font-size: 9px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      border-bottom: 1px solid #000000 !important;
      padding-bottom: 2px !important;
      margin-bottom: 4px !important;
    }

    .thermal-customer-name {
      font-size: 14px !important;
      font-weight: 800 !important;
    }

    .thermal-customer-phone {
      font-size: 13px !important;
      font-weight: 800 !important;
      margin-top: 2px !important;
    }

    .thermal-customer-address {
      font-size: 10.5px !important;
      line-height: 1.3 !important;
      margin-top: 2px !important;
    }

    .thermal-items {
      border: 1px solid #000000 !important;
      padding: 4px !important;
      margin-bottom: 6px !important;
      font-size: 10px !important;
      flex: 1 !important;
    }

    .thermal-barcode-area {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-top: 2px solid #000000 !important;
      padding-top: 4px !important;
    }

    /* Universal SVG Sizing in Thermal Print */
    svg {
      display: block !important;
      max-width: 100% !important;
    }
  `;
}
