import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { expo_push_token?: string; app_role?: string; platform?: string; device_id?: string }
  if (!body.expo_push_token || !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(body.expo_push_token)) {
    return NextResponse.json({ error: 'Invalid Expo push token' }, { status: 400 })
  }
  if (!['customer', 'provider'].includes(body.app_role || '') || !['android', 'ios'].includes(body.platform || '')) {
    return NextResponse.json({ error: 'Invalid app role or platform' }, { status: 400 })
  }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== body.app_role) return NextResponse.json({ error: 'Role mismatch' }, { status: 403 })

  const { error } = await admin.from('push_tokens').upsert({
    user_id: user.id,
    expo_push_token: body.expo_push_token,
    app_role: body.app_role,
    platform: body.platform,
    device_id: body.device_id || null,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ registered: true })
}
