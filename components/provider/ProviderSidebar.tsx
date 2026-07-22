'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Package, Settings, Wallet,
  Droplets, LogOut, Menu, X, Flame,
} from 'lucide-react'
import { useProvider } from '@/lib/provider-context'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/provider/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/provider/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/provider/products', icon: Package, label: 'Products' },
  { href: '/provider/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/provider/settings', icon: Settings, label: 'Settings' },
]

export function ProviderSidebar() {
  const pathname = usePathname()
  const { store, logout, orders } = useProvider()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const newOrders = orders.filter(o => o.status === 'placed').length

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const ServiceIcon = store?.service_type === 'lpg' ? Flame : Droplets
  const accentColor = store?.service_type === 'lpg' ? 'from-lpg-500 to-lpg-700' : 'from-water-500 to-water-700'

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
            <ServiceIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">{store?.store_name || 'Provider'}</span>
        </div>
        <button onClick={() => setMobileOpen(o => !o)} className="p-2 rounded-xl hover:bg-gray-50">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-60 bg-white border-r border-gray-100
        flex flex-col transition-transform duration-200
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accentColor} flex items-center justify-center mr-3`}>
            <ServiceIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Provider</p>
            <p className="text-sm font-bold text-gray-900 leading-tight truncate w-36">{store?.store_name || 'My Store'}</p>
          </div>
        </div>

        {/* Open/Closed badge */}
        <div className="px-5 py-3 border-b border-gray-50">
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${store?.is_open ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${store?.is_open ? 'bg-green-500' : 'bg-red-400'}`} />
            {store?.is_open ? 'Store Open' : 'Store Closed'}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const badge = label === 'Orders' && newOrders > 0 ? newOrders : null
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-water-50 text-water-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-water-600' : 'text-gray-400'}`} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="w-5 h-5 bg-water-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
