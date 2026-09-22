'use client'

import Link from 'next/link'
import { ShoppingCart, User, Menu, X, Moon, Sun } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { NotificationOverlay } from '@/components/customer/NotificationOverlay'
import { ChatNotifications } from '@/components/ChatNotifications'
import { useTheme } from '@/lib/theme-context'

export function Navbar() {
  const { totalItems } = useCart()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:h-[4.5rem] sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/home" className="flex min-w-0 items-center gap-2 font-bold text-xl sm:gap-2.5 sm:text-2xl">
          <img src="/logo.svg" alt="AquaGas" className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10" />
          <span className="truncate"><span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-base font-semibold">
          <Link href="/home" className="text-gray-600 hover:text-water-600 transition-colors">Browse</Link>
          <Link href="/orders" className="text-gray-600 hover:text-water-600 transition-colors">My Orders</Link>
          {!user && (
            <Link href="/login" className="text-gray-600 hover:text-water-600 transition-colors">Sign In</Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-50" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user && <NotificationOverlay userId={user.id} />}
          {user && <ChatNotifications userId={user.id} role="customer" />}

          <Link href="/checkout" className="relative hidden min-h-11 min-w-11 items-center justify-center rounded-xl p-2 hover:bg-gray-50 transition-colors sm:flex">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-water-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
          <Link href={user ? '/profile' : '/login'} className="hidden min-h-11 min-w-11 items-center justify-center rounded-xl p-2 hover:bg-gray-50 transition-colors md:flex">
            <User className="w-5 h-5 text-gray-700" />
          </Link>
          <button onClick={() => setMenuOpen(o => !o)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 hover:bg-gray-50 transition-colors md:hidden" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="flex flex-col gap-2 border-t border-gray-100 bg-white px-4 py-3 text-sm font-medium md:hidden">
          <Link href="/home" onClick={() => setMenuOpen(false)} className="min-h-11 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-50">Browse Stores</Link>
          <Link href="/orders" onClick={() => setMenuOpen(false)} className="min-h-11 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-50">My Orders</Link>
          {user ? (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="min-h-11 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-50">Profile</Link>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-water-600 font-semibold py-2">Sign In / Register</Link>
          )}
        </div>
      )}
    </header>
  )
}
