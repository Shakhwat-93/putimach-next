'use client';
// @ts-nocheck
import * as View from '@/admin/views/Settings';
const Settings = View.default || View.Settings || View[Object.keys(View)[0]];

export default function Page() {
  return <Settings />;
}
