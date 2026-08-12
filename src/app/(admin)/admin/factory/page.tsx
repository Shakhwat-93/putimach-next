'use client';
// @ts-nocheck
import * as View from '@/admin/views/FactoryPanel';
const FactoryPanel = View.default || View.FactoryPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <FactoryPanel />;
}
