import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function verifySignature(rawBody: string, provided: string | null): boolean {
  if (!provided) return false
  const expected = createHmac('sha256', process.env.KONFIRMA_WEBHOOK_SIGNING_SECRET!)
    .update(rawBody)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers.get('x-paylink-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  if (payload.event === 'payment.paid') {
    // Flip pending_payment → placed so the provider now sees the order
    await admin
      .from('orders')
      .update({ payment_status: 'paid', status: 'placed' })
      .eq('id', payload.external_bill_id)
      .eq('status', 'pending_payment')
  }

  return NextResponse.json({ received: true })
}
