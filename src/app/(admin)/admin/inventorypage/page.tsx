'use client';
// @ts-nocheck
import * as View from '@/admin/views/InventoryPage';
const InventoryPage = View.default || View.InventoryPage || View[Object.keys(View)[0]];

export default function Page() {
  return <InventoryPage />;
}
