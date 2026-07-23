import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side admin client (service role) so we can attach the Konfirma session id
// to the order regardless of RLS.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  // Fetch order first
  const { data: order, error } = await admin
    .from('orders')
    .select('id, total_amount, payment_status, provider_id')
    .eq('id', order_id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
  }

  // Fetch provider keys separately to avoid join direction ambiguity
  const { data: provider, error: providerError } = await admin
    .from('providers')
    .select('konfirma_pk, konfirma_sk, konfirma_wallet_id')
    .eq('id', (order as any).provider_id)
    .maybeSingle()

  // Use provider's own keys, fall back to global env vars
  const pk = provider?.konfirma_pk || process.env.KONFIRMA_PUBLIC_KEY
  const sk = provider?.konfirma_sk || process.env.KONFIRMA_SECRET_KEY
  const walletId = provider?.konfirma_wallet_id || process.env.KONFIRMA_WALLET_ACCOUNT_ID
  const baseUrl = process.env.KONFIRMA_BASE_URL

  if (!pk || !sk || !walletId || !baseUrl) {
    return NextResponse.json({ error: 'GCash payment is not configured for this store yet.' }, { status: 503 })
  }

  const res = await fetch(`${baseUrl}/api/v1/create-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Public-Key': pk,
      'X-Secret-Key': sk,
    },
    body: JSON.stringify({
      amount: order.total_amount,
      external_bill_id: order.id,
      callback_url: `${process.env.NEXT_PUBLIC_AQUAGAS_URL}/api/payment/webhook`,
      wallet_account_id: walletId,
    }),
  })

  const session = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: session.error ?? 'Failed to create payment session' }, { status: 502 })
  }

  await admin
    .from('orders')
    .update({ payment_status: 'pending', paylisten_session_id: session.session_id })
    .eq('id', order.id)

  return NextResponse.json({ payment_url: session.payment_url })
}
