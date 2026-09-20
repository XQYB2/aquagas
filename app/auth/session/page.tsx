'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'

export default function AuthSessionPage() {
  const router = useRouter()

  useEffect(() => {
    // Give Supabase JS a moment to parse the hash fragment from the URL
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'provider') {
          router.replace('/provider')
        } else {
          router.replace('/home')
        }
      } else {
        // Listen for auth state change — Supabase fires this when it processes the hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            subscription.unsubscribe()
            supabase.from('profiles').select('role').eq('id', session.user.id).single()
              .then(({ data: profile }) => {
                if (profile?.role === 'provider') {
                  router.replace('/provider')
                } else {
                  router.replace('/home')
                }
              })
          } else if (event === 'SIGNED_OUT') {
            subscription.unsubscribe()
            router.replace('/login?error=oauth_failed')
          }
        })

        // Fallback after 5 seconds
        setTimeout(() => {
          subscription.unsubscribe()
          router.replace('/login?error=oauth_failed')
        }, 5000)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [router])

  return <AuthLoadingScreen message="Completing your secure sign-in…" />
}
