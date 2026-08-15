import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { origin, searchParams } = new URL(req.url)
  const next = searchParams.get('next')
  const code = searchParams.get('code')

  // Mobile app flow — return a page that redirects the hash to the aquagas:// deep link
  if (next === 'app') {
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8">
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f9ff;}
      .box{text-align:center;}.spin{width:32px;height:32px;border:3px solid #0ea5e9;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;}
      @keyframes spin{to{transform:rotate(360deg)}}p{color:#0369a1;font-size:14px;font-weight:600;}</style>
      </head><body><div class="box"><div class="spin"></div><p>Signing you in…</p></div>
      <script>
        var hash = window.location.hash;
        if (hash) {
          window.location.replace('aquagas://auth/callback' + hash);
        }
      </script>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Web flow — exchange the auth code for a session
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()

      if (profile?.role === 'provider') {
        return NextResponse.redirect(`${origin}/provider`)
      }
      return NextResponse.redirect(`${origin}/home`)
    }
  }

  // Fallback — no code or exchange failed
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
