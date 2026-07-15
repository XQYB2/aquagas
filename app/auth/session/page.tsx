'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Droplets } from 'lucide-react'

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
          router.replace('/')
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
                  router.replace('/')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-water-500 to-water-700 flex items-center justify-center">
          <Droplets className="w-6 h-6 text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-water-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  )
}
