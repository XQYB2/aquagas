'use client'

import Link from 'next/link'
import { ShoppingCart, User, Droplets, Menu, X, Sun, Moon } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { useTheme, type Theme } from '@/lib/theme-context'

const THEME_CYCLE: Theme[] = ['light', 'dark']

const THEME_ICON = {
  light: { icon: Sun,  label: 'Light' },
  dark:  { icon: Moon, label: 'Dark'  },
}

export function Navbar() {
  const { totalItems } = useCart()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
    setTheme(next)
  }

  const { icon: ThemeIcon, label: themeLabel } = THEME_ICON[theme]

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-water-500 to-water-700 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <span className="text-gray-900 dark:text-gray-100">Aqua<span className="text-lpg-500">Gas</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-water-600 dark:hover:text-water-400 transition-colors">Browse</Link>
          <Link href="/orders" className="text-gray-600 dark:text-gray-400 hover:text-water-600 dark:hover:text-water-400 transition-colors">My Orders</Link>
          {!user && (
            <Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-water-600 dark:hover:text-water-400 transition-colors">Sign In</Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleTheme}
            title={`Theme: ${themeLabel}`}
            className="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <ThemeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="hidden md:block text-xs text-gray-400 dark:text-gray-500 font-medium">{themeLabel}</span>
          </button>

          <Link href="/checkout" className="relative p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-water-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
          <Link href={user ? '/profile' : '/login'} className="hidden md:block p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </Link>
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 flex flex-col gap-4 text-sm font-medium">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-gray-700 dark:text-gray-300 py-2">Browse Stores</Link>
          <Link href="/orders" onClick={() => setMenuOpen(false)} className="text-gray-700 dark:text-gray-300 py-2">My Orders</Link>
          {user ? (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-gray-700 dark:text-gray-300 py-2">Profile</Link>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-water-600 font-semibold py-2">Sign In / Register</Link>
          )}
          <button onClick={cycleTheme} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 py-2">
            <ThemeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span>Theme: {themeLabel}</span>
          </button>
        </div>
      )}
    </header>
  )
}
