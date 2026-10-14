'use client';
// @ts-nocheck
import * as View from '@/admin/views/MediaLibraryPage';
const MediaLibraryPage = View.default || View.MediaLibraryPage || View[Object.keys(View)[0]];

export default function Page() {
  return <MediaLibraryPage />;
}
