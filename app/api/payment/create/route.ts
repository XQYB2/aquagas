import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const PM_BASE = 'https://api.paymongo.com/v1'
const PAYMENT_SESSION_TTL_MS = 5 * 60 * 1000
const PAYMENT_RATE_WINDOW_MS = 60 * 1000
const MAX_PAYMENT_ATTEMPTS_PER_WINDOW = 5

function paymongoHeaders(secretKey: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
  }
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) {
    console.error('[PayMongo] PAYMONGO_SECRET_KEY is not configured')
    return NextResponse.json({ error: 'Payment service is not configured' }, { status: 503 })
  }

  const authorization = req.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken)
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  let body: { order_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { order_id } = body
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('id, customer_id, status, total_amount, payment_method, payment_status, payment_session_started_at')
    .eq('id', order_id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'You cannot pay for this order' }, { status: 403 })
  }
  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 409 })
  }
  if (order.status !== 'pending_payment' || order.payment_method !== 'qrph') {
    return NextResponse.json({ error: 'Order is not eligible for QR Ph payment' }, { status: 409 })
  }

  const rateWindowStart = new Date(Date.now() - PAYMENT_RATE_WINDOW_MS).toISOString()
  const { count: recentAttempts } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', user.id)
    .gte('payment_session_started_at', rateWindowStart)
  if ((recentAttempts ?? 0) >= MAX_PAYMENT_ATTEMPTS_PER_WINDOW) {
    return NextResponse.json({ error: 'Too many payment attempts. Please wait one minute.' }, { status: 429 })
  }

  const staleBefore = new Date(Date.now() - PAYMENT_SESSION_TTL_MS).toISOString()
  const attemptId = randomUUID()
  const { data: claimedOrder, error: claimError } = await admin
    .from('orders')
    .update({ payment_session_started_at: new Date().toISOString(), payment_session_token: attemptId })
    .eq('id', order.id)
    .eq('customer_id', user.id)
    .eq('status', 'pending_payment')
    .neq('payment_status', 'paid')
    .or(`payment_session_started_at.is.null,payment_session_started_at.lt.${staleBefore}`)
    .select('id')
    .maybeSingle()

  if (claimError || !claimedOrder) {
    return NextResponse.json({ error: 'A payment session is already being created. Please wait a moment.' }, { status: 409 })
  }

  // Amount in centavos — PayMongo minimum is ₱20 = 2000 centavos
  const amountCentavos = Math.max(Math.round(order.total_amount * 100), 2000)

  // QR Ph uses the Sources API — create a source and get the QR code directly
  const appUrl = (process.env.NEXT_PUBLIC_AQUAGAS_URL || req.nextUrl.origin).replace(/\/$/, '')
  let sourceRes: Response
  let sourceJson: any
  try {
    sourceRes = await fetch(`${PM_BASE}/sources`, {
      method: 'POST',
      headers: paymongoHeaders(secretKey),
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            currency: 'PHP',
            type: 'qrph',
            redirect: {
              success: `${appUrl}/orders/${order_id}?payment=success`,
              failed: `${appUrl}/orders/${order_id}?payment=failed`,
            },
          },
        },
      }),
    })
    sourceJson = await sourceRes.json()
  } catch {
    await admin.from('orders').update({ payment_session_started_at: null, payment_session_token: null }).eq('id', order.id).eq('payment_session_token', attemptId)
    return NextResponse.json({ error: 'Payment provider is temporarily unavailable' }, { status: 502 })
  }

  if (!sourceRes.ok) {
    await admin.from('orders').update({ payment_session_started_at: null, payment_session_token: null }).eq('id', order.id).eq('payment_session_token', attemptId)
    return NextResponse.json(
      { error: sourceJson.errors?.[0]?.detail ?? 'Failed to create QR code' },
      { status: 502 }
    )
  }

  const sourceId: string = sourceJson.data.id
  const qrUrl: string | null =
    sourceJson.data.attributes?.qr_image ??
    sourceJson.data.attributes?.redirect?.checkout_url ??
    null

  if (!sourceId || !qrUrl) {
    await admin.from('orders').update({ payment_session_started_at: null, payment_session_token: null }).eq('id', order.id).eq('payment_session_token', attemptId)
    return NextResponse.json({ error: 'Payment provider returned an incomplete session' }, { status: 502 })
  }

  // Save the source ID for webhook matching
  const { error: updateError } = await admin
    .from('orders')
    .update({ payment_status: 'pending', paymongo_intent_id: sourceId, payment_session_token: null })
    .eq('id', order_id)
    .eq('payment_session_token', attemptId)

  if (updateError) {
    console.error('[PayMongo] failed to save source ID:', updateError.message)
    return NextResponse.json({ error: 'Failed to save payment session' }, { status: 500 })
  }

  return NextResponse.json({ qr_url: qrUrl, payment_url: qrUrl })
}
