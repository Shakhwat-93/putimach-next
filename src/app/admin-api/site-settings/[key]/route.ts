import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const catalogUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const catalogKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseOthers = createClient(catalogUrl, catalogKey);

export async function GET(request: Request, props: { params: Promise<{ key: string }> }) {
  try {
    const params = await props.params;
    const key = params.key;
    const { data, error } = await supabaseOthers
      .from('cb_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: data?.data || null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ key: string }> }) {
  try {
    const params = await props.params;
    const key = params.key;
    const body = await request.json();
    const newData = body.data || body;

    if (!newData) {
      return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });
    }

    const { data: upd, error: updErr } = await supabaseOthers
      .from('cb_settings')
      .update({ data: newData, created_at: new Date().toISOString() })
      .eq('id', key)
      .select();

    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
    }

    if (!upd || upd.length === 0) {
      const { error: insErr } = await supabaseOthers
        .from('cb_settings')
        .insert({ id: key, data: newData, created_at: new Date().toISOString() });
      if (insErr) {
        return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
      }
    }

    const { data: verified } = await supabaseOthers
      .from('cb_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();

    return NextResponse.json({ success: true, data: verified?.data || newData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
