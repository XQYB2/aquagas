import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const PM_BASE = 'https://api.paymongo.com/v1'
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// PayMongo webhook signature format: "t=<timestamp>,te=<hex_hash>" (test) or "t=<timestamp>,li=<hex_hash>" (live)
function verifyPaymongoSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false
  try {
    const parts = Object.fromEntries(header.split(',').map(p => {
      const idx = p.indexOf('=')
      return [p.slice(0, idx), p.slice(idx + 1)]
    }))
    const timestamp = parts['t']
    const provided = parts['te'] ?? parts['li'] // te = test, li = live
    if (!timestamp || !provided) return false
    const timestampSeconds = Number(timestamp)
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_WEBHOOK_AGE_SECONDS) return false
    const payload = `${timestamp}.${rawBody}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(provided, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sigHeader = req.headers.get('paymongo-signature')
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[PayMongo webhook] PAYMONGO_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 })
  }

  if (!verifyPaymongoSignature(rawBody, sigHeader, webhookSecret)) {
    console.warn('[PayMongo webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType: string = payload?.data?.attributes?.type ?? ''
  const resource = payload?.data?.attributes?.data

  // A chargeable Source is only authorized. It must be converted into a Payment
  // before the merchant has actually received the funds.
  if (eventType === 'source.chargeable') {
    const sourceId: string | undefined = resource?.id
    if (sourceId) {
      const { data: order } = await admin
        .from('orders')
        .select('id, total_amount, payment_status')
        .eq('paymongo_intent_id', sourceId)
        .in('status', ['pending_payment'])
        .maybeSingle()

      // Atomically claim capture work so concurrent webhook deliveries cannot
      // create duplicate payments for the same source.
      if (order && order.payment_status !== 'paid') {
        const { data: claimed } = await admin
          .from('orders')
          .update({ payment_capture_started_at: new Date().toISOString() })
          .eq('id', order.id)
          .eq('payment_status', 'pending')
          .is('payment_capture_started_at', null)
          .select('id')
          .maybeSingle()

        if (!claimed) return NextResponse.json({ received: true })

        const secretKey = process.env.PAYMONGO_SECRET_KEY
        if (!secretKey) {
          console.error('[PayMongo webhook] PAYMONGO_SECRET_KEY is not configured')
          await admin.from('orders').update({ payment_capture_started_at: null }).eq('id', order.id)
          return NextResponse.json({ error: 'Payment service is not configured' }, { status: 503 })
        }

        let paymentRes: Response
        let paymentJson: any
        try {
          paymentRes = await fetch(`${PM_BASE}/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  amount: resource?.attributes?.amount ?? Math.round(order.total_amount * 100),
                  currency: 'PHP',
                  description: `AquaGas order ${order.id}`,
                  source: { id: sourceId, type: 'source' },
                },
              },
            }),
          })
          paymentJson = await paymentRes.json().catch(() => ({}))
        } catch {
          await admin.from('orders').update({ payment_capture_started_at: null }).eq('id', order.id)
          return NextResponse.json({ error: 'Payment provider unavailable' }, { status: 502 })
        }
        if (!paymentRes.ok || paymentJson?.data?.attributes?.status !== 'paid') {
          console.error('[PayMongo webhook] failed to capture payment')
          await admin.from('orders').update({ payment_capture_started_at: null }).eq('id', order.id)
          // A non-2xx response asks PayMongo to retry the webhook.
          return NextResponse.json({ error: 'Could not capture payment' }, { status: 502 })
        }

        await admin
          .from('orders')
          .update({ payment_status: 'paid', status: 'placed', payment_session_token: null })
          .eq('id', order.id)
          .eq('payment_status', 'pending')
      }
    }
  }

  // Payment Intent API events (fallback)
  if (eventType === 'payment.paid') {
    const referenceId: string | undefined =
      resource?.attributes?.payment_intent_id ?? resource?.attributes?.source?.id
    if (referenceId) {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', status: 'placed', payment_session_token: null })
        .eq('paymongo_intent_id', referenceId)
        .in('status', ['pending_payment'])
    }
  }

  if (eventType === 'payment.failed') {
    const referenceId: string | undefined =
      resource?.attributes?.payment_intent_id ?? resource?.attributes?.source?.id
    if (referenceId) {
      await admin
        .from('orders')
        .update({ payment_status: 'unpaid' })
        .eq('paymongo_intent_id', referenceId)
        .in('status', ['pending_payment'])
    }
  }

  if (eventType === 'qrph.expired') {
    const intentId: string | undefined =
      resource?.attributes?.payment_intent_id ??
      resource?.attributes?.payment_intent?.id ??
      resource?.id
    if (intentId) {
      await admin
        .from('orders')
        .update({ payment_status: 'unpaid' })
        .eq('paymongo_intent_id', intentId)
        .in('status', ['pending_payment'])
    }
  }

  return NextResponse.json({ received: true })
}
