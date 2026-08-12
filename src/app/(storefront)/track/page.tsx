'use client';
// @ts-nocheck
import * as View from '@/views/TrackOrder';
const TrackOrder = View.default || View.TrackOrder || View[Object.keys(View)[0]];
import ClientOnly from '@/components/ClientOnly';

export default function Page() {
  return <ClientOnly><TrackOrder /></ClientOnly>;
}
