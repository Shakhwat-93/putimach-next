'use client';
// @ts-nocheck
import * as View from '@/views/Checkout';
const Checkout = View.default || View.Checkout || View[Object.keys(View)[0]];
import ClientOnly from '@/components/ClientOnly';

export default function Page() {
  return <ClientOnly><Checkout /></ClientOnly>;
}
