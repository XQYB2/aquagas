'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Package, Settings,
  Droplets, LogOut, Menu, X, Flame, CalendarClock, Map, WalletCards, BarChart3, Moon, Sun,
} from 'lucide-react'
import { useProvider } from '@/lib/provider-context'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ChatNotifications } from '@/components/ChatNotifications'
import { useTheme } from '@/lib/theme-context'

const NAV = [
  { href: '/provider/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/provider/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/provider/wallet', icon: WalletCards, label: 'Wallet' },
  { href: '/provider/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/provider/products', icon: Package, label: 'Products' },
  { href: '/provider/slots', icon: CalendarClock, label: 'Batch Slots' },
  { href: '/provider/delivery-map', icon: Map, label: 'Delivery Map' },
  { href: '/provider/settings', icon: Settings, label: 'Settings' },
]

export function ProviderSidebar() {
  const pathname = usePathname()
  const { store, logout, orders } = useProvider()
  const router = useRouter()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const [seenOrderIds, setSeenOrderIds] = useState<string[]>([])
  const placedOrderIds = orders.filter(o => o.status === 'placed').map(o => o.id)
  const newOrders = placedOrderIds.filter(id => !seenOrderIds.includes(id)).length
  const seenStorageKey = store?.id ? `aquagas-provider-seen-orders:${store.id}` : null

  useEffect(() => {
    if (!seenStorageKey) return
    try {
      const saved = JSON.parse(localStorage.getItem(seenStorageKey) || '[]')
      setSeenOrderIds(Array.isArray(saved) ? saved : [])
    } catch {
      setSeenOrderIds([])
    }
  }, [seenStorageKey])

  useEffect(() => {
    if (!seenStorageKey || !pathname.startsWith('/provider/orders')) return
    setSeenOrderIds(previous => {
      const next = Array.from(new Set([...previous, ...placedOrderIds]))
      localStorage.setItem(seenStorageKey, JSON.stringify(next))
      return next
    })
  }, [pathname, seenStorageKey, orders])

  function markOrdersSeen() {
    if (!seenStorageKey) return
    const next = Array.from(new Set([...seenOrderIds, ...placedOrderIds]))
    localStorage.setItem(seenStorageKey, JSON.stringify(next))
    setSeenOrderIds(next)
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const ServiceIcon = store?.service_type === 'lpg' ? Flame : Droplets
  const accentColor = store?.service_type === 'lpg' ? 'from-lpg-500 to-lpg-700' : 'from-water-500 to-water-700'

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-[calc(3.5rem+env(safe-area-inset-top))] w-full items-center justify-between border-b border-gray-100 bg-white px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/logo.svg" alt="AquaGas" className="w-7 h-7 rounded-lg shrink-0" />
          <span className="truncate font-bold text-sm text-gray-900">{store?.store_name || 'Provider'}</span>
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-50" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user && <ChatNotifications userId={user.id} role="provider" orderIds={orders.map(order => order.id)} />}
          <button onClick={() => setMobileOpen(o => !o)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-50" aria-label={mobileOpen ? 'Close provider navigation' : 'Open provider navigation'} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-[100dvh] z-40 w-[min(18rem,86vw)] bg-white border-r border-gray-100 md:w-60
        pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),0.75rem)]
        flex flex-col transition-transform duration-200
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex h-16 min-w-0 items-center gap-2 border-b border-gray-100 px-4">
          <img src="/logo.svg" alt="AquaGas" className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold"><span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span></p>
            <p className="truncate text-xs leading-tight text-gray-400">{store?.store_name || 'My Store'}</p>
          </div>
          <div className="hidden shrink-0 md:block">{user && <ChatNotifications userId={user.id} role="provider" orderIds={orders.map(order => order.id)} />}</div>
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
                onClick={() => {
                  if (href === '/provider/orders') markOrdersSeen()
                  setMobileOpen(false)
                }}
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
        <div className="space-y-1 border-t border-gray-100 p-3">
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="hidden min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 md:flex">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
