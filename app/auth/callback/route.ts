import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  // Google returned an error directly
  if (error) {
    console.error('OAuth error from provider:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${error}`)
  }

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'pkce' } }
    )
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    console.log('Exchange result:', { hasSession: !!data.session, error: exchangeError?.message })

    if (!exchangeError && data.session) {
      const userId = data.session.user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (profile?.role === 'provider') {
        return NextResponse.redirect(`${origin}/provider`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('Exchange failed:', exchangeError?.message)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed&msg=${exchangeError?.message}`)
  }

  // No code — send to client-side session handler
  return NextResponse.redirect(`${origin}/auth/session`)
}
