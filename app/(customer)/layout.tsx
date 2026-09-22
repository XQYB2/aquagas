import { Navbar } from '@/components/customer/Navbar'
import { AuthGuard } from '@/components/customer/AuthGuard'
import { BottomNav } from '@/components/customer/BottomNav'
import { AquaBot } from '@/components/customer/AquaBot'
import { ThemeProvider } from '@/lib/theme-context'
import { OfflineBanner } from '@/components/customer/OfflineBanner'
import { SessionTimeout } from '@/components/customer/SessionTimeout'
import { PublicFooter } from '@/components/public/PublicFooter'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <OfflineBanner />
          <Navbar />
          <main className="flex-1 pb-[calc(var(--mobile-nav-height)+max(env(safe-area-inset-bottom),0.75rem)+1rem)] md:pb-8">
            {children}
          </main>
          <div className="pb-[calc(var(--mobile-nav-height)+max(env(safe-area-inset-bottom),0.75rem))] md:pb-0">
            <PublicFooter />
          </div>
          <BottomNav />
          <AquaBot />
          <SessionTimeout />
        </div>
      </AuthGuard>
    </ThemeProvider>
  )
}
