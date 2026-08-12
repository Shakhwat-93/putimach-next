'use client';
// @ts-nocheck
import * as View from '@/admin/views/StorefrontManagement';
const StorefrontManagement = View.default || View.StorefrontManagement || View[Object.keys(View)[0]];

export default function Page() {
  return <StorefrontManagement />;
}
