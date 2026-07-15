'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Store, Users, ShoppingBag,
  BarChart3, Settings, LogOut, Menu, X, Shield,
} from 'lucide-react'
import { useAdmin } from '@/lib/admin-context'
import { useState } from 'react'

const NAV = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/providers',  icon: Store,           label: 'Providers' },
  { href: '/admin/customers',  icon: Users,           label: 'Customers' },
  { href: '/admin/orders',     icon: ShoppingBag,     label: 'All Orders' },
  { href: '/admin/reports',    icon: BarChart3,       label: 'Reports' },
  { href: '/admin/settings',   icon: Settings,        label: 'Settings' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { providers, logout } = useAdmin()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const pendingCount = providers.filter(p => p.status === 'pending').length

  function handleLogout() {
    logout()
    router.push('/admin/login')
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center mr-3">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Admin Panel</p>
          <p className="text-sm font-bold text-white leading-tight">AquaGas</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const badge = label === 'Providers' && pendingCount > 0 ? pendingCount : null
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-white">Admin Panel</span>
        </div>
        <button onClick={() => setOpen(o => !o)} className="p-2 text-gray-400 hover:text-white">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-60 bg-gray-900 flex flex-col
        transition-transform duration-200
        md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>
    </>
  )
}
