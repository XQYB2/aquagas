'use client'

import { useProvider, type ProviderOrder } from '@/lib/provider-context'
import { OrderStatusBadge } from '@/components/provider/OrderStatusBadge'
import {
  TrendingUp, ShoppingBag, PackageCheck, Clock,
  ChevronRight, ToggleLeft, ToggleRight, Banknote,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'

const OrdersMap = dynamic(() => import('@/components/maps/OrdersMap').then(m => m.OrdersMap), { ssr: false })

function getRevenueLast7Days(orders: ProviderOrder[]): { day: string; revenue: number; orders: number }[] {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const label = date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
    const dayOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.toDateString() === date.toDateString() && o.status !== 'cancelled'
    })
    days.push({
      day: label,
      revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0),
      orders: dayOrders.length,
    })
  }
  return days
}

export default function DashboardPage() {
  const { store, orders, updateStore } = useProvider()
  const revenue7d = useMemo(() => getRevenueLast7Days(orders), [orders])

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    return d.toDateString() === new Date().toDateString()
  })

  const stats = {
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0),
    pending: orders.filter(o => o.status === 'placed').length,
    inProgress: orders.filter(o => ['confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length,
    totalDelivered: orders.filter(o => o.status === 'delivered').length,
    weekRevenue: revenue7d.reduce((s, d) => s + d.revenue, 0),
  }

  const activeOrders = orders.filter(o => ['placed', 'confirmed', 'awaiting_pickup', 'picked_up', 'being_prepared', 'out_for_delivery'].includes(o.status))

  const orderPins = orders
    .filter(o => o.status !== 'cancelled' && (o as any).delivery_lat && (o as any).delivery_lng)
    .map(o => ({
      id: o.id,
      customerName: o.customer_name,
      address: o.delivery_address,
      status: o.status,
      lat: (o as any).delivery_lat as number,
      lng: (o as any).delivery_lng as number,
    }))

  const maxRevenue = Math.max(...revenue7d.map(d => d.revenue), 1)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Open/Close toggle */}
        <button
          onClick={() => updateStore({ is_open: !store?.is_open })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            store?.is_open
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          {store?.is_open
            ? <><ToggleRight className="w-5 h-5" /> Store Open</>
            : <><ToggleLeft className="w-5 h-5" /> Store Closed</>
          }
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's Orders"
          value={stats.todayOrders}
          icon={<ShoppingBag className="w-5 h-5 text-water-600" />}
          bg="bg-water-50"
          sub={stats.pending > 0 ? `${stats.pending} awaiting` : 'All caught up'}
          subColor={stats.pending > 0 ? 'text-amber-600' : 'text-green-600'}
        />
        <StatCard
          label="Today's Revenue"
          value={`₱${stats.todayRevenue.toLocaleString()}`}
          icon={<Banknote className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          sub="Cash on Delivery"
          subColor="text-gray-400"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Clock className="w-5 h-5 text-lpg-600" />}
          bg="bg-lpg-50"
          sub="Active orders"
          subColor="text-gray-400"
        />
        <StatCard
          label="Total Delivered"
          value={stats.totalDelivered}
          icon={<PackageCheck className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
          sub="All time"
          subColor="text-gray-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Revenue — Last 7 Days</h2>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">₱{stats.weekRevenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              This week
            </div>
          </div>

          <div className="flex items-end gap-2 h-32">
            {revenue7d.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative flex items-end justify-center" style={{ height: 96 }}>
                  <div
                    className="w-full bg-water-100 hover:bg-water-200 rounded-t-lg transition-all cursor-default relative group"
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 96, d.revenue > 0 ? 8 : 2)}px` }}
                    title={`₱${d.revenue}`}
                  >
                    {d.revenue > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        ₱{d.revenue}
                      </div>
                    )}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-water-500 rounded-t-lg"
                      style={{ height: `${Math.max((d.revenue / maxRevenue) * 96, d.revenue > 0 ? 8 : 0)}px` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">
                  {d.day.split(',')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Order Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'New Orders', count: orders.filter(o => o.status === 'placed').length, color: 'bg-blue-400' },
              { label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length, color: 'bg-indigo-400' },
              { label: 'Preparing', count: orders.filter(o => o.status === 'being_prepared').length, color: 'bg-yellow-400' },
              { label: 'Out for Delivery', count: orders.filter(o => o.status === 'out_for_delivery').length, color: 'bg-orange-400' },
              { label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, color: 'bg-green-400' },
              { label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length, color: 'bg-red-300' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active orders */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Active Orders</h2>
          <Link href="/provider/orders" className="text-water-600 text-sm font-semibold flex items-center gap-1 hover:text-water-700">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-gray-400 text-sm">No active orders right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeOrders.slice(0, 5).map(order => (
              <Link key={order.id} href={`/provider/orders/${order.id}`}>
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                      #{order.id.slice(-3).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">
                        {order.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delivery map */}
      {orderPins.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Delivery Map</h2>
            <span className="text-xs text-gray-400">{orderPins.length} pinned order{orderPins.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ height: 320 }} className="rounded-xl overflow-hidden border border-gray-100">
            <OrdersMap
              storeLat={orderPins[0].lat}
              storeLng={orderPins[0].lng}
              storeName={store?.store_name ?? 'Store'}
              orders={orderPins}
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { color: '#3b82f6', label: 'Placed' },
              { color: '#6366f1', label: 'Confirmed' },
              { color: '#a855f7', label: 'Awaiting Pickup' },
              { color: '#f97316', label: 'Out for Delivery' },
              { color: '#22c55e', label: 'Delivered' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ background: color }} className="w-3 h-3 rounded-full" />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, bg, sub, subColor }: {
  label: string; value: string | number; icon: React.ReactNode
  bg: string; sub: string; subColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      <p className={`text-xs font-semibold mt-1 ${subColor}`}>{sub}</p>
    </div>
  )
}
