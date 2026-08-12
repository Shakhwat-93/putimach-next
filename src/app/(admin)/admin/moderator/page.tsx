'use client';
// @ts-nocheck
import * as View from '@/admin/views/ModeratorPanel';
const ModeratorPanel = View.default || View.ModeratorPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <ModeratorPanel />;
}
