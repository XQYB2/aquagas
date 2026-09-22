import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(request: NextRequest) {
  try {
    const admin = adminClient()
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const [providers, profiles, orders, orderItems, products, settings, authUsers] = await Promise.all([
      admin.from('providers').select('*').order('created_at', { ascending: false }),
      admin.from('profiles').select('*').order('created_at', { ascending: false }),
      admin.from('orders').select('*').order('created_at', { ascending: false }),
      admin.from('order_items').select('order_id, product_id, quantity'),
      admin.from('products').select('id, name'),
      admin.from('platform_settings').select('*').eq('id', 1).maybeSingle(),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])
    const failed = [providers, profiles, orders, orderItems, products].find(result => result.error)
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

    return NextResponse.json({
      providers: providers.data || [], profiles: profiles.data || [], orders: orders.data || [],
      orderItems: orderItems.data || [], products: products.data || [], settings: settings.data || null,
      authUsers: authUsers.data?.users.map(account => ({ id: account.id, email: account.email || '', created_at: account.created_at, user_metadata: account.user_metadata })) || [],
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Admin data could not be loaded' }, { status: 500 })
  }
}
