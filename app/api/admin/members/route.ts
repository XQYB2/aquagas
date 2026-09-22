import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const client = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
async function authorize(req: NextRequest, requireOwner = false) {
  const admin = client(); const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null
  const [{ data: profile }, { data: member }] = await Promise.all([admin.from('profiles').select('role').eq('id', user.id).maybeSingle(), admin.from('admin_members').select('permission_role, active').eq('user_id', user.id).maybeSingle()])
  if (profile?.role !== 'admin' || member?.active === false || (requireOwner && member?.permission_role !== 'owner')) return null
  return { admin, user }
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req); if (!auth) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const [{ data: members, error }, users] = await Promise.all([auth.admin.from('admin_members').select('*').order('created_at'), auth.admin.auth.admin.listUsers({ page: 1, perPage: 1000 })])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const byId = new Map(users.data.users.map(user => [user.id, user]))
  return NextResponse.json({ members: (members || []).map(member => ({ ...member, email: byId.get(member.user_id)?.email || '', name: byId.get(member.user_id)?.user_metadata?.full_name || byId.get(member.user_id)?.email?.split('@')[0] || 'Admin' })) })
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req, true); if (!auth) return NextResponse.json({ error: 'Owner permission required' }, { status: 403 })
  const { email, permission_role = 'admin' } = await req.json()
  if (!email || !['admin', 'finance', 'support'].includes(permission_role)) return NextResponse.json({ error: 'Valid email and role are required' }, { status: 400 })
  const { data, error } = await auth.admin.auth.admin.inviteUserByEmail(email, { data: { full_name: email.split('@')[0] } })
  if (error || !data.user) return NextResponse.json({ error: error?.message || 'Invitation failed' }, { status: 400 })
  await auth.admin.from('profiles').upsert({ id: data.user.id, role: 'admin', full_name: email.split('@')[0] }, { onConflict: 'id' })
  const { error: memberError } = await auth.admin.from('admin_members').upsert({ user_id: data.user.id, permission_role, active: true, invited_by: auth.user.id })
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const auth = await authorize(req, true); if (!auth) return NextResponse.json({ error: 'Owner permission required' }, { status: 403 })
  const { user_id, permission_role, active } = await req.json()
  if (user_id === auth.user.id && active === false) return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  if (['owner', 'admin', 'finance', 'support'].includes(permission_role)) updates.permission_role = permission_role
  if (typeof active === 'boolean') updates.active = active
  const { error } = await auth.admin.from('admin_members').update(updates).eq('user_id', user_id)
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ success: true })
}
