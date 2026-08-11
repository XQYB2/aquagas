import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { origin, searchParams } = new URL(req.url)
  const next = searchParams.get('next')

  // Mobile app flow — WebBrowser.openAuthSessionAsync detects the redirect
  // back to this URL and closes automatically, returning the full URL to the app
  // which then extracts tokens from the hash fragment.
  // We just need to return a minimal page so the browser has something to show
  // for the brief moment before WebBrowser closes it.
  if (next === 'app') {
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8">
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f9ff;}
      .box{text-align:center;}.spin{width:32px;height:32px;border:3px solid #0ea5e9;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;}
      @keyframes spin{to{transform:rotate(360deg)}}p{color:#0369a1;font-size:14px;font-weight:600;}</style>
      </head><body><div class="box"><div class="spin"></div><p>Signing you in…</p></div></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Web flow — redirect to session handler
  return NextResponse.redirect(`${origin}/auth/session`)
}
