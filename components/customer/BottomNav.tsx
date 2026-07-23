'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react'
import { useCart } from '@/lib/cart-context'

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/checkout', icon: ShoppingBag, label: 'Cart' },
  { href: '/orders', icon: ClipboardList, label: 'Orders' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 shadow-lg px-2 pb-safe">
        <div className="flex items-end justify-around max-w-md mx-auto h-16">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            const isCart = href === '/checkout'
            const iconClass = `w-5 h-5 transition-colors ${isActive ? 'text-water-600' : 'text-gray-400 dark:text-gray-500'}`
            const labelClass = `text-[10px] font-medium ${isActive ? 'text-water-600' : 'text-gray-400 dark:text-gray-500'}`
            const dotClass = `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-water-50 dark:bg-water-900/30' : ''}`

            if (isCart) {
              return (
                <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 relative">
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
              <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 py-2 px-3">
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
