'use client';
// @ts-nocheck
import * as View from '@/admin/views/CallTeamPanel';
const CallTeamPanel = View.default || View.CallTeamPanel || View[Object.keys(View)[0]];

export default function Page() {
  return <CallTeamPanel />;
}
