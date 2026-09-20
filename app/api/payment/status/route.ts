import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Payment service is not configured' }, { status: 503 })

  const authorization = req.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!accessToken) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
  const { data: { user } } = await authClient.auth.getUser(accessToken)
  if (!user) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { order_id?: string }
  if (!body.order_id) return NextResponse.json({ error: 'order_id is required' }, { status: 400 })

  const { data: order } = await admin
    .from('orders')
    .select('id, customer_id, total_amount, payment_status, paymongo_intent_id')
    .eq('id', body.order_id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.customer_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (order.payment_status === 'paid') return NextResponse.json({ paid: true, status: 'paid' })
  if (!order.paymongo_intent_id) return NextResponse.json({ paid: false, status: 'unpaid' })

  const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${order.paymongo_intent_id}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    return NextResponse.json({ error: json.errors?.[0]?.detail ?? 'Unable to verify payment' }, { status: 502 })
  }

  const attributes = json.data?.attributes ?? {}
  const payments = Array.isArray(attributes.payments) ? attributes.payments : []
  const amountMatches = Number(attributes.amount) === Math.round(Number(order.total_amount) * 100)
  const isPaid = amountMatches && (
    attributes.status === 'succeeded' ||
    payments.some((payment: any) => payment?.attributes?.status === 'paid')
  )

  if (isPaid) {
    await admin
      .from('orders')
      .update({ payment_status: 'paid', status: 'placed', payment_session_token: null })
      .eq('id', order.id)
      .neq('status', 'cancelled')
    return NextResponse.json({ paid: true, status: 'paid' })
  }

  return NextResponse.json({ paid: false, status: attributes.status ?? 'pending' })
}
