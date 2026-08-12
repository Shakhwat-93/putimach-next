'use client';
// @ts-nocheck
import * as View from '@/views/ProductDetail';
const ProductDetail = View.default || View.ProductDetail || View[Object.keys(View)[0]];

export default function Page() {
  return <ProductDetail />;
}
