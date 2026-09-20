'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { withTimeout } from '@/lib/async-timeout'

export default function AuthSessionPage() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function finishSignIn() {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          'Session verification timed out.'
        )
        if (!active || !session?.user) throw new Error('No active session found.')

        const { data: profile } = await withTimeout(
          supabase.from('profiles').select('role').eq('id', session.user.id).single(),
          5000,
          'Profile lookup timed out.'
        )
        if (!active) return

        if (profile?.role === 'provider') window.location.replace('/provider')
        else if (profile?.role === 'admin') window.location.replace('/admin')
        else window.location.replace('/home')
      } catch {
        if (active) router.replace('/login?error=oauth_failed')
      }
    }

    const timer = window.setTimeout(finishSignIn, 500)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [router])

  return <AuthLoadingScreen message="Completing your secure sign-in…" />
}
