'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Droplets } from 'lucide-react'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-water-500 to-water-700 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-water-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user && !isPublic) return null

  return <>{children}</>
}
