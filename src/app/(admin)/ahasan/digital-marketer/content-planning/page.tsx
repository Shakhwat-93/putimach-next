'use client';
// @ts-nocheck
import * as View from '@/admin/views/ContentPlanning';
const ContentPlanning = View.default || View.ContentPlanning || View[Object.keys(View)[0]];

export default function Page() {
  return <ContentPlanning />;
}
