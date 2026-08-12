'use client';
// @ts-nocheck
import * as View from '@/views/Shop';
const Shop = View.default || View.Shop || View[Object.keys(View)[0]];
import { Suspense } from 'react';

export default function Page() {
  return <Suspense fallback={null}><Shop /></Suspense>;
}
