import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // PKCE flow — code exchanged server-side
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const userId = data.session?.user?.id
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        if (profile?.role === 'provider') {
          return NextResponse.redirect(`${origin}/provider`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Implicit flow — token arrives as hash fragment (#access_token=...)
  // Hash fragments are not readable server-side, so send to a client page that reads it
  const hasHashParams = req.headers.get('referer')?.includes('access_token') ||
    req.nextUrl.hash?.includes('access_token')

  if (hasHashParams) {
    return NextResponse.redirect(`${origin}/auth/session`)
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
