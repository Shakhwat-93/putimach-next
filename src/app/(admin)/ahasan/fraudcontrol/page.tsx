'use client';
// @ts-nocheck
import * as View from '@/admin/views/FraudControl';
const FraudControl = View.default || View.FraudControl || View[Object.keys(View)[0]];

export default function Page() {
  return <FraudControl />;
}
