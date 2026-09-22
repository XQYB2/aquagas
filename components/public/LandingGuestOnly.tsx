'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'

export function LandingGuestOnly({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return

    const destination = profile?.role === 'provider'
      ? '/provider'
      : profile?.role === 'admin'
        ? '/admin'
        : '/home'

    router.replace(destination)
  }, [loading, profile?.role, router, user])

  if (loading || user) {
    return <AuthLoadingScreen message={user ? 'Returning to your account...' : 'Loading AquaGas...'} />
  }

  return <>{children}</>
}
