'use client';
// @ts-nocheck
import * as View from '@/admin/views/FinancePlanning';
const FinancePlanning = View.default || View.FinancePlanning || View[Object.keys(View)[0]];

export default function Page() {
  return <FinancePlanning />;
}
