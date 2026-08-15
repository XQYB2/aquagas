import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

const PM_SECRET = process.env.PAYMONGO_SECRET_KEY!
const PM_BASE = 'https://api.paymongo.com/v1'
const pmHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Basic ${Buffer.from(PM_SECRET + ':').toString('base64')}`,
}

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400, headers: CORS_HEADERS })
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('id, total_amount, payment_status')
    .eq('id', order_id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: CORS_HEADERS })
  }
  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 400, headers: CORS_HEADERS })
  }

  // Amount in centavos (PayMongo requires integers, minimum ₱20 = 2000 centavos)
  const amountCentavos = Math.round(order.total_amount * 100)

  // 1. Create PaymentIntent
  const intentRes = await fetch(`${PM_BASE}/payment_intents`, {
    method: 'POST',
    headers: pmHeaders,
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          payment_method_allowed: ['qrph'],
          currency: 'PHP',
          capture_type: 'automatic',
          description: `AquaGas Order #${order_id.slice(-6).toUpperCase()}`,
          metadata: { order_id },
        },
      },
    }),
  })

  const intentJson = await intentRes.json()
  if (!intentRes.ok) {
    console.error('[PayMongo] create intent error:', JSON.stringify(intentJson))
    return NextResponse.json(
      { error: intentJson.errors?.[0]?.detail ?? 'Failed to create payment intent' },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  const intentId: string = intentJson.data.id
  const clientKey: string = intentJson.data.attributes.client_key

  // 2. Create PaymentMethod (QR Ph)
  const pmRes = await fetch(`${PM_BASE}/payment_methods`, {
    method: 'POST',
    headers: pmHeaders,
    body: JSON.stringify({
      data: {
        attributes: { type: 'qrph' },
      },
    }),
  })

  const pmJson = await pmRes.json()
  if (!pmRes.ok) {
    console.error('[PayMongo] create payment method error:', JSON.stringify(pmJson))
    return NextResponse.json(
      { error: pmJson.errors?.[0]?.detail ?? 'Failed to create payment method' },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  const pmId: string = pmJson.data.id

  // 3. Attach PaymentMethod to PaymentIntent
  const attachRes = await fetch(`${PM_BASE}/payment_intents/${intentId}/attach`, {
    method: 'POST',
    headers: pmHeaders,
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: pmId,
          client_key: clientKey,
          return_url: `${process.env.NEXT_PUBLIC_AQUAGAS_URL}/orders/${order_id}`,
        },
      },
    }),
  })

  const attachJson = await attachRes.json()
  if (!attachRes.ok) {
    console.error('[PayMongo] attach error:', JSON.stringify(attachJson))
    return NextResponse.json(
      { error: attachJson.errors?.[0]?.detail ?? 'Failed to attach payment method' },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  // QR code image URL is in next_action.redirect.url for qrph
  const attrs = attachJson.data.attributes
  const qrUrl: string | null =
    attrs?.next_action?.redirect?.url ??
    attrs?.next_action?.display?.qr_image ??
    null

  // Save the intent ID so the webhook can match it
  await admin
    .from('orders')
    .update({ payment_status: 'pending', paymongo_intent_id: intentId })
    .eq('id', order_id)

  return NextResponse.json(
    { qr_url: qrUrl, intent_id: intentId, client_key: clientKey },
    { headers: CORS_HEADERS }
  )
}
