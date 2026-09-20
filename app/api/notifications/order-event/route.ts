import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

type OrderRecord = { id: string; customer_id: string; provider_id: string; status: string; payment_status?: string; total_amount?: number }

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.ORDER_NOTIFICATION_WEBHOOK_SECRET
  if (!configuredSecret || req.headers.get('x-webhook-secret') !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await req.json().catch(() => ({})) as { type?: string; record?: OrderRecord; old_record?: OrderRecord }
  const order = payload.record
  if (!order?.id) return NextResponse.json({ delivered: 0 })

  const recipients: { userId: string; role: 'customer' | 'provider'; title: string; body: string }[] = []
  if (payload.type === 'INSERT') {
    const { data: provider } = await admin.from('providers').select('user_id').eq('id', order.provider_id).maybeSingle()
    if (provider?.user_id) recipients.push({
      userId: provider.user_id, role: 'provider', title: 'New AquaGas order',
      body: `New order received — ₱${Number(order.total_amount || 0).toFixed(0)}`,
    })
  } else if (payload.type === 'UPDATE') {
    if (order.status !== payload.old_record?.status) recipients.push({
      userId: order.customer_id, role: 'customer', title: statusTitle(order.status), body: statusBody(order.status),
    })
    if (order.payment_status === 'paid' && payload.old_record?.payment_status !== 'paid') {
      recipients.push({ userId: order.customer_id, role: 'customer', title: 'Payment confirmed', body: 'Your QR Ph payment was received.' })
      const { data: provider } = await admin.from('providers').select('user_id').eq('id', order.provider_id).maybeSingle()
      if (provider?.user_id) recipients.push({ userId: provider.user_id, role: 'provider', title: 'Payment received', body: 'A QR Ph order has been paid.' })
    }
  }

  let delivered = 0
  for (const recipient of recipients) {
    const { data: tokens } = await admin.from('push_tokens').select('expo_push_token').eq('user_id', recipient.userId).eq('app_role', recipient.role).eq('enabled', true)
    if (!tokens?.length) continue
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map(({ expo_push_token }) => ({
        to: expo_push_token, sound: 'default', channelId: 'orders', priority: 'high',
        title: recipient.title, body: recipient.body, data: { orderId: order.id, role: recipient.role },
      }))),
    })
    if (response.ok) delivered += tokens.length
  }
  return NextResponse.json({ delivered })
}

function statusTitle(status: string) {
  return ({ confirmed: 'Order confirmed', being_prepared: 'Order being prepared', out_for_delivery: 'Order on the way', delivered: 'Order delivered', cancelled: 'Order cancelled' } as Record<string, string>)[status] || 'Order updated'
}
function statusBody(status: string) {
  return ({ confirmed: 'The provider accepted your order.', being_prepared: 'Your items are being prepared.', out_for_delivery: 'Your delivery is on its way.', delivered: 'Your order was delivered. You can now leave a review.', cancelled: 'Your order was cancelled.' } as Record<string, string>)[status] || 'Open AquaGas to see the latest status.'
}
