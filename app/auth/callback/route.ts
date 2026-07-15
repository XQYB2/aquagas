import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url)
  // Always send to client-side session handler which reads the hash fragment
  return NextResponse.redirect(`${origin}/auth/session`)
}
