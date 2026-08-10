'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

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
          <img src="/logo.svg" alt="AquaGas" className="w-16 h-16 rounded-2xl shadow-lg" />
          <p className="text-lg font-black tracking-tight">
            <span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span>
          </p>
          <div className="w-5 h-5 border-2 border-water-500 border-t-transparent rounded-full animate-spin mt-1" />
        </div>
      </div>
    )
  }

  if (!user && !isPublic) return null

  return <>{children}</>
}
