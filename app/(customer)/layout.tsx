import { Navbar } from '@/components/customer/Navbar'
import { AuthGuard } from '@/components/customer/AuthGuard'
import { BottomNav } from '@/components/customer/BottomNav'
import { AquaBot } from '@/components/customer/AquaBot'
import { OfflineBanner } from '@/components/customer/OfflineBanner'
import { SessionTimeout } from '@/components/customer/SessionTimeout'
import { PublicFooter } from '@/components/public/PublicFooter'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
      <AuthGuard>
        <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-gray-50">
          <OfflineBanner />
          <Navbar />
          <main className="w-full min-w-0 md:pb-8">
            {children}
          </main>
          <div className="w-full pb-[calc(var(--mobile-nav-height)+max(env(safe-area-inset-bottom),0.75rem))] md:pb-0">
            <PublicFooter />
          </div>
          <BottomNav />
          <AquaBot />
          <SessionTimeout />
        </div>
      </AuthGuard>
  )
}
