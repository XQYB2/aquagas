'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'

// Pages that don't require a login
const PUBLIC_PATHS = ['/login', '/register', '/reset-password']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = PUBLIC_PATHS.some(p => pathname === p)

  useEffect(() => {
    if (loading) return
    if (!user && !isPublic) {
      router.replace('/login')
    } else if (user && profile?.role === 'provider') {
      router.replace('/provider')
    }
  }, [loading, user, profile, isPublic, router])

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!user && !isPublic) return null

  return <>{children}</>
}
