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

function paymongoPublicHeaders(publicKey: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${publicKey}:`).toString('base64')}`,
  }
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY
  const publicKey = process.env.PAYMONGO_PUBLIC_KEY
  if (!secretKey || !publicKey) {
    console.error('[PayMongo] PAYMONGO_SECRET_KEY or PAYMONGO_PUBLIC_KEY is not configured')
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

  // Amount is sent in centavos. QR Ph supports transactions from PHP 1.
  const amountCentavos = Math.max(Math.round(order.total_amount * 100), 100)

  const releaseClaim = async () => {
    await admin
      .from('orders')
      .update({ payment_session_started_at: null, payment_session_token: null })
      .eq('id', order.id)
      .eq('payment_session_token', attemptId)
  }

  try {
    const intentRes = await fetch(`${PM_BASE}/payment_intents`, {
      method: 'POST',
      headers: paymongoHeaders(secretKey),
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            currency: 'PHP',
            payment_method_allowed: ['qrph'],
            description: `AquaGas order ${order.id}`,
          },
        },
      }),
    })
    const intentJson = await intentRes.json().catch(() => ({}))
    if (!intentRes.ok) {
      await releaseClaim()
      return NextResponse.json(
        { error: intentJson.errors?.[0]?.detail ?? 'Failed to create payment intent' },
        { status: 502 }
      )
    }

    const intentId: string | undefined = intentJson.data?.id
    const clientKey: string | undefined = intentJson.data?.attributes?.client_key
    if (!intentId || !clientKey) {
      await releaseClaim()
      return NextResponse.json({ error: 'PayMongo returned an incomplete payment intent' }, { status: 502 })
    }

    const methodRes = await fetch(`${PM_BASE}/payment_methods`, {
      method: 'POST',
      headers: paymongoPublicHeaders(publicKey),
      body: JSON.stringify({
        data: { attributes: { type: 'qrph', expiry_seconds: 1800 } },
      }),
    })
    const methodJson = await methodRes.json().catch(() => ({}))
    if (!methodRes.ok || !methodJson.data?.id) {
      await releaseClaim()
      return NextResponse.json(
        { error: methodJson.errors?.[0]?.detail ?? 'Failed to create QR Ph payment method' },
        { status: 502 }
      )
    }

    const attachRes = await fetch(`${PM_BASE}/payment_intents/${intentId}/attach`, {
      method: 'POST',
      headers: paymongoPublicHeaders(publicKey),
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: methodJson.data.id,
            client_key: clientKey,
          },
        },
      }),
    })
    const attachJson = await attachRes.json().catch(() => ({}))
    const qrUrl: string | undefined = attachJson.data?.attributes?.next_action?.code?.image_url
    if (!attachRes.ok || !qrUrl) {
      await releaseClaim()
      return NextResponse.json(
        { error: attachJson.errors?.[0]?.detail ?? 'PayMongo did not return a QR code' },
        { status: 502 }
      )
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({ payment_status: 'pending', paymongo_intent_id: intentId, payment_session_token: null })
      .eq('id', order_id)
      .eq('payment_session_token', attemptId)

    if (updateError) {
      console.error('[PayMongo] failed to save payment intent:', updateError.message)
      await releaseClaim()
      return NextResponse.json({ error: 'Failed to save payment session' }, { status: 500 })
    }

    return NextResponse.json({ qr_url: qrUrl, payment_intent_id: intentId })
  } catch {
    await releaseClaim()
    return NextResponse.json({ error: 'Payment provider is temporarily unavailable' }, { status: 502 })
  }
}
