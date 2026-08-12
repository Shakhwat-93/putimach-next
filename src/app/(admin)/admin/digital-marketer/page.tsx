'use client';
// @ts-nocheck
import * as View from '@/admin/views/DigitalMarketerPanel';
const DigitalMarketerPanel = View.default || View.DigitalMarketerPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <DigitalMarketerPanel />;
}
