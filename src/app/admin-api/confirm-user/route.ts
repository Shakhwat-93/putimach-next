import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // List users to find ID by email
    const { data: listData, error: listErr } = await adminSupabase.auth.admin.listUsers();
    
    if (listErr) {
      console.warn('[Admin API] listUsers error:', listErr);
    }

    const targetUser = listData?.users?.find(u => u.email?.toLowerCase() === email);

    if (targetUser?.id) {
      // Auto-confirm user email
      const { data: updateData, error: updateErr } = await adminSupabase.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true
      });

      if (!updateErr) {
        return NextResponse.json({ success: true, confirmed: true, user_id: targetUser.id });
      }
    }

    // Ensure profile status is Active in users table
    await adminSupabase
      .from('users')
      .update({ status: 'Active' })
      .ilike('email', email);

    return NextResponse.json({ success: true, confirmed: true });

  } catch (err: any) {
    console.error('[Admin API] Confirm user error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
