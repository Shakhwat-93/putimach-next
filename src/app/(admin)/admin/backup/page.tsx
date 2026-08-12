'use client';
// @ts-nocheck
import * as View from '@/admin/views/BackupPanel';
const BackupPanel = View.default || View.BackupPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <BackupPanel />;
}
