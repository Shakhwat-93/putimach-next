'use client';
// @ts-nocheck
import * as View from '@/admin/views/UserManagement';
const UserManagement = View.default || View.UserManagement || View[Object.keys(View)[0]];

export default function Page() {
  return <UserManagement />;
}
