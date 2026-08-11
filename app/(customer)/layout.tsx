import { Navbar } from '@/components/customer/Navbar'
import { AuthGuard } from '@/components/customer/AuthGuard'
import { BottomNav } from '@/components/customer/BottomNav'
import { AquaBot } from '@/components/customer/AquaBot'
import { ThemeProvider } from '@/lib/theme-context'
import { OfflineBanner } from '@/components/customer/OfflineBanner'
import { SessionTimeout } from '@/components/customer/SessionTimeout'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <OfflineBanner />
          <Navbar />
          <main className="flex-1 pb-20 md:pb-8">
            {children}
          </main>
          <BottomNav />
          <AquaBot />
          <SessionTimeout />
        </div>
      </AuthGuard>
    </ThemeProvider>
  )
}
