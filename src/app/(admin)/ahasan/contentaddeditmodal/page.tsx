'use client';
// @ts-nocheck
import * as View from '@/admin/views/ContentAddEditModal';
const ContentAddEditModal = View.default || View.ContentAddEditModal || View[Object.keys(View)[0]];

export default function Page() {
  return <ContentAddEditModal />;
}
