'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Droplets } from 'lucide-react'

// Handles implicit OAuth flow where token arrives as a URL hash fragment.
// Supabase JS reads the hash automatically on getSession().
export default function AuthSessionPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleSession() {
      // Supabase client automatically parses #access_token from the URL hash
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
        router.replace('/login?error=oauth_failed')
      }
    }

    handleSession()
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
