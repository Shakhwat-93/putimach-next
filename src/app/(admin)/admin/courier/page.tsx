'use client';
// @ts-nocheck
import * as View from '@/admin/views/CourierPanel';
const CourierPanel = View.default || View.CourierPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <CourierPanel />;
}
