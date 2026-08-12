'use client';
// @ts-nocheck
import * as View from '@/admin/views/ReportsPanel';
const ReportsPanel = View.default || View.ReportsPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <ReportsPanel />;
}
