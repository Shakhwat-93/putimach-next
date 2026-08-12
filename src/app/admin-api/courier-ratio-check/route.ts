import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const catalogUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const catalogKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseOthers = createClient(catalogUrl, catalogKey);

const getSystemConfig = async (key: string) => {
  try {
    const { data } = await supabaseOthers
      .from('cb_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();
    if (data && data.data) return data.data;
  } catch (e) {}
  return null;
};

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Missing phone' }, { status: 400 });
    }

    const config = await getSystemConfig('courier_steadfast');
    if (!config || !config.api_key) {
      return NextResponse.json({ success: false, error: 'Steadfast configuration not found' }, { status: 400 });
    }

    let response: Response;
    try {
      response = await fetch(`https://steadfast.com.bd/api/v1/fraud_check/${phone}`, {
        method: 'GET',
        headers: {
          'Api-Key': config.api_key,
          'Secret-Key': config.secret_key,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      response = await fetch(`https://portal.steadfast.com.bd/api/v1/fraud_check/${phone}`, {
        method: 'GET',
        headers: {
          'Api-Key': config.api_key,
          'Secret-Key': config.secret_key,
          'Content-Type': 'application/json'
        }
      });
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      stats: result,
      isLimitReached: result.message?.toLowerCase().includes('limit') || false
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
