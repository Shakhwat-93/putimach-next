'use client';
// @ts-nocheck
import * as View from '@/admin/views/OrdersBoard';
const OrdersBoard = View.default || View.OrdersBoard || View[Object.keys(View)[0]];

export default function Page() {
  return <OrdersBoard />;
}
