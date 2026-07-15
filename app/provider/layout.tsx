'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ProviderAuthProvider, useProvider } from '@/lib/provider-context'
import { ProviderSidebar } from '@/components/provider/ProviderSidebar'

function ProviderGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useProvider()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace('/login')
    }
  }, [isLoggedIn, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-water-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  // Show login/onboarding without sidebar
if (!isLoggedIn) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ProviderSidebar />
      {/* Main content area — offset for sidebar on desktop, top bar on mobile */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProviderAuthProvider>
      <ProviderGuard>{children}</ProviderGuard>
    </ProviderAuthProvider>
  )
}
