'use client';
// @ts-nocheck
import * as View from '@/admin/views/Login';
const Login = View.default || View.Login || View[Object.keys(View)[0]];

export default function Page() {
  return <Login />;
}
