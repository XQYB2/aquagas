import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-only client using the service role key — bypasses RLS and can
// create auth users. Never import this file or expose this key client-side.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local')
  }
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Verifies the request came from a logged-in admin by checking the
// caller's access token (sent from the browser's existing session).
async function requireAdmin(req: NextRequest, admin: ReturnType<typeof getAdminClient>) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return null

  return user
}

export async function POST(req: NextRequest) {
  let admin: ReturnType<typeof getAdminClient>
  try {
    admin = getAdminClient()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const caller = await requireAdmin(req, admin)
  if (!caller) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json()
  const {
    owner_name, owner_email, owner_phone, password,
    store_name, address, service_type, delivery_fee, delivery_time_min,
    business_permit_base64, business_permit_filename,
    owner_id_base64, owner_id_filename,
  } = body

  if (!owner_email || !password || !store_name || !address || !service_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Create the auth user (pre-confirmed — admin-provisioned accounts skip email verification)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: owner_email,
    password,
    email_confirm: true,
    user_metadata: { full_name: owner_name, phone: owner_phone },
  })
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || 'Failed to create account' }, { status: 400 })
  }
  const userId = created.user.id

  // 2. The on_auth_user_created trigger already inserted a 'customer' profile row — promote it to provider.
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ role: 'provider', full_name: owner_name, phone: owner_phone })
    .eq('id', userId)
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileErr.message }, { status: 400 })
  }

  // 3. Create the providers row, approved immediately since an admin is creating it directly.
  const { data: provider, error: providerErr } = await admin
    .from('providers')
    .insert({
      user_id: userId,
      store_name,
      address,
      service_type,
      delivery_fee: delivery_fee ?? 30,
      delivery_time_min: delivery_time_min ?? 45,
      approval_status: 'active',
      owner_email,
    } as any)
    .select()
    .single()
  if (providerErr || !provider) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: providerErr?.message || 'Failed to create provider' }, { status: 400 })
  }

  // 4. Upload documents (optional) to the private provider-documents bucket.
  async function uploadDoc(base64: string | undefined, filename: string | undefined, label: string) {
    if (!base64 || !filename) return null
    const buffer = Buffer.from(base64.split(',').pop() || '', 'base64')
    const path = `${provider.id}/${label}-${Date.now()}-${filename}`
    const { error: uploadErr } = await admin.storage.from('provider-documents').upload(path, buffer, { upsert: true })
    if (uploadErr) return null
    return path
  }

  const [permitPath, idPath] = await Promise.all([
    uploadDoc(business_permit_base64, business_permit_filename, 'permit'),
    uploadDoc(owner_id_base64, owner_id_filename, 'id'),
  ])

  if (permitPath || idPath) {
    await admin
      .from('providers')
      .update({
        ...(permitPath ? { business_permit_url: permitPath } : {}),
        ...(idPath ? { owner_id_url: idPath } : {}),
      } as any)
      .eq('id', provider.id)
  }

  return NextResponse.json({ success: true, provider_id: provider.id })
}
