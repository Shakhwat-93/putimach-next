import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const catalogUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const catalogKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ordersUrl = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL || catalogUrl;
const ordersKey = process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY || catalogKey;

const supabaseOthers = createClient(catalogUrl, catalogKey);
const supabaseOrders = createClient(ordersUrl, ordersKey);

const getOrderById = async (orderId: string) => {
  const { data, error } = await supabaseOrders
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
};

const getSystemConfig = async (key: string) => {
  try {
    const { data } = await supabaseOthers
      .from('cb_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();
    if (data && data.data) return data.data;
  } catch (e) {}

  try {
    const { data } = await supabaseOthers
      .from('site_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();
    if (data && data.data) return data.data;
  } catch (e) {}

  return null;
};

const updateOrderCourierDetails = async (orderId: string, updates: any) => {
  const { error } = await supabaseOrders
    .from('orders')
    .update(updates)
    .eq('id', orderId);
  if (error) throw error;
  return true;
};

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Missing orderId' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: `Order not found: ${orderId}` }, { status: 404 });
    }

    const config = await getSystemConfig('courier_steadfast');
    if (!config || !config.is_enabled) {
      return NextResponse.json({ success: false, error: 'Steadfast integration is disabled or not configured.' }, { status: 400 });
    }

    const payload = {
      invoice: order.id,
      recipient_name: order.customer_name,
      recipient_phone: order.phone,
      recipient_address: order.address || 'Dhaka, Bangladesh',
      cod_amount: parseFloat(String(order.amount || 0)),
      note: `${order.product_name || ''} ${order.size ? `(Size: ${order.size})` : ''}`.slice(0, 250)
    };

    let response: Response;
    try {
      response = await fetch('https://portal.packzy.com/api/v1/create_order', {
        method: 'POST',
        headers: {
          'Api-Key': config.api_key,
          'Secret-Key': config.secret_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      response = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
        method: 'POST',
        headers: {
          'Api-Key': config.api_key,
          'Secret-Key': config.secret_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    const responseText = await response.text();
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ success: false, error: `Steadfast API non-JSON response: ${responseText.slice(0, 300)}` }, { status: 500 });
    }

    if (response.ok && (result.status === 200 || result.status === 201)) {
      const consignment = result.consignment || result;
      const trackingCode = consignment.tracking_code;
      const consignmentId = consignment.consignment_id || consignment.id;

      await updateOrderCourierDetails(orderId, {
        tracking_id: trackingCode,
        courier_assigned_id: consignmentId ? String(consignmentId) : null,
        courier_name: 'Steadfast',
        status: 'Courier Submitted',
        updated_at: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        trackingCode,
        consignmentId,
        details: result
      });
    } else {
      const errorMsg = result.errors ? JSON.stringify(result.errors) : (result.message || 'Unknown Courier Error');
      return NextResponse.json({
        success: false,
        error: `Steadfast Dispatch Failed: ${errorMsg}`,
        details: result
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
