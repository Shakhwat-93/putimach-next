'use client';
// @ts-nocheck
import * as View from '@/admin/views/DashboardOverview';
const DashboardOverview = View.default || View.DashboardOverview || View[Object.keys(View)[0]];

export default function Page() {
  return <DashboardOverview />;
}
