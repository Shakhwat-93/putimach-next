'use client';
// @ts-nocheck
import * as View from '@/admin/views/SteadfastPanel';
const SteadfastPanel = View.default || View.SteadfastPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <SteadfastPanel />;
}
