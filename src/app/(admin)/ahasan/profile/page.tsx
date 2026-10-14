'use client';
// @ts-nocheck
import * as View from '@/admin/views/Profile';
const Profile = View.default || View.Profile || View[Object.keys(View)[0]];

export default function Page() {
  return <Profile />;
}
