import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'

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

  if (webhookSecret && !verifyPaymongoSignature(rawBody, sigHeader, webhookSecret)) {
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

  console.log('[PayMongo webhook] event:', eventType)

  if (eventType === 'payment.paid') {
    // For QR Ph, the payment has a payment_intent_id linking back to our intent
    const intentId: string | undefined =
      resource?.attributes?.payment_intent_id ??
      resource?.attributes?.metadata?.payment_intent_id

    const externalRef: string | undefined = resource?.attributes?.external_reference_number

    if (intentId) {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', status: 'placed' })
        .eq('paymongo_intent_id', intentId)
        .in('status', ['pending_payment'])
    } else if (externalRef) {
      // Fallback: match by order id suffix if no intent id
      await admin
        .from('orders')
        .update({ payment_status: 'paid', status: 'placed' })
        .ilike('id', `%${externalRef}`)
        .in('status', ['pending_payment'])
    }
  }

  if (eventType === 'payment.failed') {
    const intentId: string | undefined = resource?.attributes?.payment_intent_id
    if (intentId) {
      await admin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('paymongo_intent_id', intentId)
        .in('status', ['pending_payment'])
    }
  }

  if (eventType === 'qrph.expired') {
    // QR code expired before payment — mark as failed so order doesn't stay stuck
    const intentId: string | undefined = resource?.attributes?.payment_intent_id
    if (intentId) {
      await admin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('paymongo_intent_id', intentId)
        .in('status', ['pending_payment'])
    }
  }

  return NextResponse.json({ received: true })
}
