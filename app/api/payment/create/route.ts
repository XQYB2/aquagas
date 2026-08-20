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

  // Amount in centavos — PayMongo minimum is ₱20 = 2000 centavos
  const amountCentavos = Math.max(Math.round(order.total_amount * 100), 2000)

  // QR Ph uses the Sources API — create a source and get the QR code directly
  const sourceRes = await fetch(`${PM_BASE}/sources`, {
    method: 'POST',
    headers: pmHeaders,
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          currency: 'PHP',
          type: 'qrph',
          redirect: {
            success: `${process.env.NEXT_PUBLIC_AQUAGAS_URL}/orders/${order_id}?payment=success`,
            failed: `${process.env.NEXT_PUBLIC_AQUAGAS_URL}/orders/${order_id}?payment=failed`,
          },
        },
      },
    }),
  })

  const sourceJson = await sourceRes.json()
  console.log('[PayMongo] source response:', JSON.stringify(sourceJson?.data?.attributes?.status), JSON.stringify(sourceJson?.errors))

  if (!sourceRes.ok) {
    return NextResponse.json(
      { error: sourceJson.errors?.[0]?.detail ?? 'Failed to create QR code' },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  const sourceId: string = sourceJson.data.id
  const qrUrl: string | null =
    sourceJson.data.attributes?.qr_image ??
    sourceJson.data.attributes?.redirect?.checkout_url ??
    null

  console.log('[PayMongo] source id:', sourceId, 'qr_url:', qrUrl)

  // Save the source ID for webhook matching
  await admin
    .from('orders')
    .update({ payment_status: 'pending', paymongo_intent_id: sourceId })
    .eq('id', order_id)

  return NextResponse.json(
    { qr_url: qrUrl, source_id: sourceId },
    { headers: CORS_HEADERS }
  )
}
