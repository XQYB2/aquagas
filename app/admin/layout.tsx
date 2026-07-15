'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminAuthProvider, useAdmin } from '@/lib/admin-context'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAdmin()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isLoggedIn && pathname !== '/admin/login') {
      router.replace('/admin/login')
    }
  }, [isLoggedIn, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading admin panel…</p>
        </div>
      </div>
    )
  }

  if (pathname === '/admin/login') return <>{children}</>
  if (!isLoggedIn) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 min-h-screen overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AdminAuthProvider>
  )
}
