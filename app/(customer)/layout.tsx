import { Navbar } from '@/components/customer/Navbar'
import { AuthGuard } from '@/components/customer/AuthGuard'
import { BottomNav } from '@/components/customer/BottomNav'
import { AquaBot } from '@/components/customer/AquaBot'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pb-20 md:pb-8">
          {children}
        </main>
        <BottomNav />
        <AquaBot />
      </div>
    </AuthGuard>
  )
}
