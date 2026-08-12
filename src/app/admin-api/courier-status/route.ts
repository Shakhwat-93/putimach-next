import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const catalogUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const catalogKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ordersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL || catalogUrl;
const ordersKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY || catalogKey;

const supabaseOthers = createClient(catalogUrl, catalogKey);
const supabaseOrders = createClient(ordersUrl, ordersKey);

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
    const { orderId, trackingCode } = await request.json();
    if (!trackingCode) {
      return NextResponse.json({ success: false, error: 'Missing trackingCode' }, { status: 400 });
    }

    const config = await getSystemConfig('courier_steadfast');
    if (!config) {
      return NextResponse.json({ success: false, error: 'Steadfast configuration not found.' }, { status: 400 });
    }

    let response: Response;
    try {
      response = await fetch(`https://steadfast.com.bd/api/v1/status_by_tracking/${trackingCode}`, {
        method: 'GET',
        headers: {
          'Api-Key': config.api_key,
          'Secret-Key': config.secret_key,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      response = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_tracking/${trackingCode}`, {
        method: 'GET',
        headers: {
          'Api-Key': config.api_key,
          'Secret-Key': config.secret_key,
          'Content-Type': 'application/json'
        }
      });
    }

    const result = await response.json();
    if (response.ok && result.status === 200) {
      const courierStatus = result.delivery_status || 'pending';
      const consignmentId = result.consignment_id || result.id;

      if (orderId) {
        await supabaseOrders.from('orders').update({
          courier_status: courierStatus,
          courier_assigned_id: consignmentId ? String(consignmentId) : null,
          updated_at: new Date().toISOString()
        }).eq('id', orderId);
      }
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ success: false, error: result.message || 'Steadfast Status Error', details: result }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
