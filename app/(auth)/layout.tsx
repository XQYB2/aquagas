import { GuestOnly } from '@/components/auth/GuestOnly'
import { PublicFooter } from '@/components/public/PublicFooter'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1">
        <GuestOnly>{children}</GuestOnly>
      </main>
      <PublicFooter />
    </div>
  )
}
