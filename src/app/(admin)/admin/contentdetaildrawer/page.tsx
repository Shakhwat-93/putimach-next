'use client';
// @ts-nocheck
import * as View from '@/admin/views/ContentDetailDrawer';
const ContentDetailDrawer = View.default || View.ContentDetailDrawer || View[Object.keys(View)[0]];

export default function Page() {
  return <ContentDetailDrawer />;
}
