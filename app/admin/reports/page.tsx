'use client'

import { useState, useMemo } from 'react'
import { useAdmin, type AdminOrder, type AdminProvider } from '@/lib/admin-context'
import { BarChart, DonutChart, exportToCsv } from '@/components/admin/AdminUI'
import { Download, TrendingUp, ShoppingBag, CheckCircle, XCircle, Star, Droplets, Flame } from 'lucide-react'

type Period = '7d' | '14d' | '30d'

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

function getProviderPerformance(providers: AdminProvider[]) {
  return providers
    .filter(p => p.status === 'active')
    .map(p => ({
      id: p.id,
      name: p.store_name,
      service_type: p.service_type,
      total_orders: p.total_orders,
      total_revenue: p.total_revenue,
      rating: p.rating,
      completion_rate: p.total_orders > 0 ? 95 : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
}

export default function AdminReportsPage() {
  const { orders, customers, providers } = useAdmin()
  const [period, setPeriod] = useState<Period>('30d')
  const allData = useMemo(() => get30DayData(orders), [orders])
  const providerPerf = useMemo(() => getProviderPerformance(providers), [providers])

  const periodDays = period === '7d' ? 7 : period === '14d' ? 14 : 30
  const chartData = allData.slice(-periodDays)

  // Computed metrics
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = chartData.reduce((s, d) => s + d.orders, 0)
  const waterOrders = chartData.reduce((s, d) => s + d.water, 0)
  const lpgOrders = chartData.reduce((s, d) => s + d.lpg, 0)

  const deliveredOrders = orders.filter(o => o.status === 'delivered').length
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
  const completionRate = orders.length > 0 ? Math.round((deliveredOrders / orders.length) * 100) : 0
  const cancellationRate = orders.length > 0 ? Math.round((cancelledOrders / orders.length) * 100) : 0

  // New customers per month (last 3 months)
  const customersByMonth = useMemo(() => {
    const months: Record<string, number> = {}
    customers.forEach(c => {
      const key = new Date(c.date_joined).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
      months[key] = (months[key] || 0) + 1
    })
    return Object.entries(months).map(([month, count]) => ({ month, count })).slice(-4)
  }, [customers])

  function exportRevenue() {
    exportToCsv(`aquagas-revenue-${period}.csv`, chartData.map(d => ({
      Date: d.day, Revenue: d.revenue, Orders: d.orders, 'Water Orders': d.water, 'LPG Orders': d.lpg,
    })))
  }

  function exportProviders() {
    exportToCsv('aquagas-provider-performance.csv', providerPerf.map(p => ({
      Provider: p.name, 'Service Type': p.service_type, 'Total Orders': p.total_orders,
      'Total Revenue': p.total_revenue, Rating: p.rating, 'Completion Rate': `${p.completion_rate}%`,
    })))
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '14d', label: 'Last 14 Days' },
    { key: '30d', label: 'Last 30 Days' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50', sub: `${periodDays}-day period` },
          { label: 'Total Orders', value: totalOrders, icon: <ShoppingBag className="w-5 h-5 text-water-600" />, bg: 'bg-water-50', sub: `Avg ₱${totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}/order` },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: 'bg-green-50', sub: `${deliveredOrders} delivered` },
          { label: 'Cancellation Rate', value: `${cancellationRate}%`, icon: <XCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-50', sub: `${cancelledOrders} cancelled` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Revenue Over Time</h2>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">₱{totalRevenue.toLocaleString()}</p>
          </div>
          <button onClick={exportRevenue}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <BarChart data={chartData} valueKey="revenue" labelKey="day" color="#6366f1" height={160} />
      </div>

      {/* Orders chart + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Orders Over Time</h2>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{totalOrders} total</p>
            </div>
          </div>
          <BarChart data={chartData} valueKey="orders" labelKey="day" color="#0ea5e9" height={140} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-5">Orders by Type</h2>
          <DonutChart
            size={100}
            segments={[
              { label: 'Water Delivery', value: waterOrders, color: '#0ea5e9' },
              { label: 'LPG Gas', value: lpgOrders, color: '#f97316' },
            ]}
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-500"><Droplets className="w-3.5 h-3.5 text-water-500" /> Water</span>
              <span className="font-semibold text-gray-900">{waterOrders > 0 ? Math.round((waterOrders / (waterOrders + lpgOrders)) * 100) : 0}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-500"><Flame className="w-3.5 h-3.5 text-lpg-500" /> LPG Gas</span>
              <span className="font-semibold text-gray-900">{lpgOrders > 0 ? Math.round((lpgOrders / (waterOrders + lpgOrders)) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Provider performance table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Provider Performance</h2>
          <button onClick={exportProviders}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Provider', 'Type', 'Total Orders', 'Revenue', 'Rating', 'Completion'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {providerPerf.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3 text-gray-400 font-bold text-xs">#{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${p.service_type === 'water' ? 'bg-water-50 text-water-700' : p.service_type === 'lpg' ? 'bg-lpg-50 text-lpg-700' : 'bg-purple-50 text-purple-700'}`}>
                      {p.service_type === 'water' ? '💧 Water' : p.service_type === 'lpg' ? '🔥 LPG' : '💧🔥 Both'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.total_orders.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₱{p.total_revenue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{p.rating.toFixed(1)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden w-16">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.completion_rate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{p.completion_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer growth */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-5">New Customers by Month</h2>
        <div className="flex items-end gap-4">
          {customersByMonth.map((m, i) => {
            const maxC = Math.max(...customersByMonth.map(x => x.count), 1)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">{m.count}</span>
                <div className="w-full bg-indigo-100 rounded-t-lg" style={{ height: Math.max((m.count / maxC) * 80, 4) }}>
                  <div className="w-full h-full bg-indigo-500 rounded-t-lg" />
                </div>
                <span className="text-[10px] text-gray-400 text-center">{m.month}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
          <span>Total registered: <strong className="text-gray-900">{customers.length}</strong></span>
          <span>Repeat order rate: <strong className="text-gray-900">{Math.round((customers.filter(c => c.total_orders > 1).length / Math.max(customers.length, 1)) * 100)}%</strong></span>
        </div>
      </div>
    </div>
  )
}
