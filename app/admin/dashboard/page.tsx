'use client'

import { useMemo } from 'react'
import { useAdmin, type AdminOrder, type AdminProvider } from '@/lib/admin-context'
import { StatCard, BarChart, DonutChart, OrderStatusBadge } from '@/components/admin/AdminUI'
import {
  ShoppingBag, Banknote, Store, Users,
  AlertTriangle, XCircle, TrendingUp, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

function getPlatformStats(orders: AdminOrder[], providers: AdminProvider[], customerCount: number) {
  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
  return {
    totalOrdersToday: todayOrders.length,
    totalRevenueToday: todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0),
    activeProviders: providers.filter(p => p.status === 'active').length,
    totalCustomers: customerCount,
    pendingProviders: providers.filter(p => p.status === 'pending').length,
    cancelledToday: todayOrders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total_amount, 0),
    totalOrders: orders.length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
  }
}

function get30DayData(orders: AdminOrder[]): { day: string; revenue: number; orders: number; water: number; lpg: number }[] {
  const result = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const label = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === date.toDateString() && o.status !== 'cancelled')
    const waterOrders = dayOrders.filter(o => o.service_type === 'water').length
    const lpgOrders = dayOrders.filter(o => o.service_type === 'lpg').length
    const revenue = dayOrders.reduce((s, o) => s + o.total_amount, 0)
    result.push({ day: label, revenue, orders: dayOrders.length, water: waterOrders, lpg: lpgOrders })
  }
  return result
}

export default function AdminDashboardPage() {
  const { orders, providers, customers } = useAdmin()
  const stats = useMemo(() => getPlatformStats(orders, providers, customers.length), [orders, providers, customers])
  const chartData = useMemo(() => get30DayData(orders), [orders])

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  const last14 = chartData.slice(-14)
  const waterTotal = chartData.reduce((s, d) => s + d.water, 0)
  const lpgTotal   = chartData.reduce((s, d) => s + d.lpg,   0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Pending alert */}
      {stats.pendingProviders > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            <strong>{stats.pendingProviders}</strong> provider application{stats.pendingProviders > 1 ? 's' : ''} awaiting your approval.
          </p>
          <Link href="/admin/providers?tab=pending" className="ml-auto text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 shrink-0">
            Review <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Orders Today"        value={stats.totalOrdersToday}      icon={<ShoppingBag className="w-5 h-5 text-indigo-600" />} accent="bg-indigo-50" sub="Across all providers" />
        <StatCard label="Revenue Today"       value={`₱${stats.totalRevenueToday.toLocaleString()}`} icon={<Banknote className="w-5 h-5 text-green-600" />} accent="bg-green-50" sub="Cash on Delivery" />
        <StatCard label="Active Providers"    value={stats.activeProviders}        icon={<Store className="w-5 h-5 text-water-600" />} accent="bg-water-50" sub={`${stats.pendingProviders} pending`} subColor={stats.pendingProviders > 0 ? 'text-amber-600' : 'text-gray-400'} />
        <StatCard label="Customers"           value={stats.totalCustomers}         icon={<Users className="w-5 h-5 text-purple-600" />} accent="bg-purple-50" />
        <StatCard label="Cancelled Today"     value={stats.cancelledToday}         icon={<XCircle className="w-5 h-5 text-red-500" />} accent="bg-red-50" sub="Orders cancelled" subColor={stats.cancelledToday > 0 ? 'text-red-500' : 'text-gray-400'} />
        <StatCard label="Total Revenue (All)" value={`₱${stats.totalRevenue.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-50" sub="Delivered orders" subColor="text-emerald-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Daily Revenue — Last 14 Days</h2>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                ₱{last14.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
              </p>
            </div>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full">Platform-wide</span>
          </div>
          <BarChart data={last14} valueKey="revenue" labelKey="day" color="#6366f1" height={130} />
        </div>

        {/* Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-5">Orders by Service Type</h2>
          <DonutChart
            size={110}
            segments={[
              { label: 'Water Delivery', value: waterTotal, color: '#0ea5e9' },
              { label: 'LPG Gas',        value: lpgTotal,   color: '#f97316' },
            ]}
          />
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Orders</h2>
          <Link href="/admin/orders" className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:text-indigo-700">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Order', 'Customer', 'Provider', 'Status', 'Amount', 'Time'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                      #{order.id.slice(-6).toUpperCase()}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{order.customer_name}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">{order.provider_name}</td>
                  <td className="py-3 pr-4"><OrderStatusBadge status={order.status} /></td>
                  <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">₱{order.total_amount.toLocaleString()}</td>
                  <td className="py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(order.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
