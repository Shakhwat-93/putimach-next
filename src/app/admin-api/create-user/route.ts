import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Server-side admin client using Service Role Key
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
    const password = String(body.password || '');
    const name = String(body.name || email.split('@')[0] || 'Team Member').trim();
    const role = String(body.role || 'Call Team').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let userId: string | null = null;
    let authError = null;

    // 1. Create or Update user in Supabase Auth with auto-confirmed email
    if (password) {
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });

      if (!createError && createData?.user?.id) {
        userId = createData.user.id;
      } else {
        authError = createError;
        // Check if user already exists
        const { data: listData } = await adminSupabase.auth.admin.listUsers();
        const existing = listData?.users?.find(u => u.email?.toLowerCase() === email);
        if (existing) {
          userId = existing.id;
          // Auto-confirm existing user email & update password
          await adminSupabase.auth.admin.updateUserById(existing.id, {
            email_confirm: true,
            password: password || undefined,
            user_metadata: { name }
          });
        }
      }
    }

    if (!userId) {
      userId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    // 2. Write profile to users table
    const profilePayload = {
      id: userId,
      name,
      email,
      status: 'Active'
    };

    const { error: profileErr } = await adminSupabase
      .from('users')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileErr) {
      console.warn('[Admin API] Profile upsert notice:', profileErr);
    }

    // 3. Assign user role
    const { error: roleErr } = await adminSupabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: role
      }, { onConflict: 'user_id,role_id' });

    if (roleErr) {
      console.warn('[Admin API] Role upsert notice:', roleErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        role,
        email_confirmed: true
      }
    });

  } catch (err: any) {
    console.error('[Admin API] Create user error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
