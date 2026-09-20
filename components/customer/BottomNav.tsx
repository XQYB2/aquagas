'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react'
import { useCart } from '@/lib/cart-context'

const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/checkout', icon: ShoppingBag, label: 'Cart' },
  { href: '/orders', icon: ClipboardList, label: 'Orders' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()

  return (
    <nav aria-label="Customer navigation" className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="grid h-[var(--mobile-nav-height)] max-w-md grid-cols-4 mx-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            const isCart = href === '/checkout'
            const iconClass = `w-5 h-5 transition-colors ${isActive ? 'text-water-600' : 'text-gray-400 dark:text-gray-500'}`
            const labelClass = `text-[10px] font-medium ${isActive ? 'text-water-600' : 'text-gray-400 dark:text-gray-500'}`
            const dotClass = `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-water-50 dark:bg-water-900/30' : ''}`

            if (isCart) {
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className="relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-water-500"
                >
                  <div className={dotClass}>
                    <Icon className={iconClass} />
                    {totalItems > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-lpg-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalItems > 9 ? '9+' : totalItems}
                      </span>
                    )}
                  </div>
                  <span className={labelClass}>{label}</span>
                </Link>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-water-500"
              >
                <div className={dotClass}>
                  <Icon className={iconClass} />
                </div>
                <span className={labelClass}>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
