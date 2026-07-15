'use client'

import Link from 'next/link'
import { ShoppingCart, User, Droplets, Menu, X } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

export function Navbar() {
  const { totalItems } = useCart()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-water-500 to-water-700 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <span className="text-gray-900">Aqua<span className="text-lpg-500">Gas</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-600 hover:text-water-600 transition-colors">Browse</Link>
          <Link href="/orders" className="text-gray-600 hover:text-water-600 transition-colors">My Orders</Link>
{!user && (
            <Link href="/login" className="text-gray-600 hover:text-water-600 transition-colors">Sign In</Link>
          )}
        </nav>

        {/* Cart + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link href="/checkout" className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-water-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
          <Link href={user ? '/profile' : '/login'} className="hidden md:block p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <User className="w-5 h-5 text-gray-700" />
          </Link>
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4 text-sm font-medium">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-gray-700 py-2">Browse Stores</Link>
          <Link href="/orders" onClick={() => setMenuOpen(false)} className="text-gray-700 py-2">My Orders</Link>
          {user ? (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-gray-700 py-2">Profile</Link>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-water-600 font-semibold py-2">Sign In / Register</Link>
          )}
        </div>
      )}
    </header>
  )
}
