'use client'

import { useState, useMemo } from 'react'
import { useProvider } from '@/lib/provider-context'
import { OrderStatusBadge } from '@/components/provider/OrderStatusBadge'
import { ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import type { ProviderOrder } from '@/lib/provider-context'

type Tab = 'all' | 'placed' | 'confirmed' | 'awaiting_pickup' | 'picked_up' | 'being_prepared' | 'out_for_delivery' | 'delivered' | 'cancelled'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',              label: 'All' },
  { key: 'placed',           label: 'New' },
  { key: 'confirmed',        label: 'Confirmed' },
  { key: 'awaiting_pickup',  label: 'Awaiting Pickup' },
  { key: 'picked_up',        label: 'Picked Up' },
  { key: 'being_prepared',   label: 'Preparing' },
  { key: 'out_for_delivery', label: 'On the Way' },
  { key: 'delivered',        label: 'Delivered' },
  { key: 'cancelled',        label: 'Cancelled' },
]

export default function ProviderOrdersPage() {
  const { orders } = useProvider()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const counts: Record<Tab, number> = useMemo(() => ({
    all:              orders.length,
    placed:           orders.filter(o => o.status === 'placed').length,
    confirmed:        orders.filter(o => o.status === 'confirmed').length,
    awaiting_pickup:  orders.filter(o => o.status === 'awaiting_pickup').length,
    picked_up:        orders.filter(o => o.status === 'picked_up').length,
    being_prepared:   orders.filter(o => o.status === 'being_prepared').length,
    out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    delivered:        orders.filter(o => o.status === 'delivered').length,
    cancelled:        orders.filter(o => o.status === 'cancelled').length,
  }), [orders])

  const filtered = useMemo(() => {
    return orders
      .filter(o => tab === 'all' || o.status === tab)
      .filter(o => !search || o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [orders, tab, search])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400 w-48"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-water-500 text-white shadow-md shadow-water-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-gray-400 text-sm">No orders in this category.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderRow({ order }: { order: ProviderOrder }) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min}m ago`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <Link href={`/provider/orders/${order.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-gray-500">#{order.id.slice(-3).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-gray-900 text-sm">{order.customer_name}</p>
                <span className="text-gray-300">·</span>
                <p className="text-xs text-gray-400">{timeAgo(order.created_at)}</p>
              </div>
              <p className="text-xs text-gray-400 truncate mb-1.5">{order.delivery_address}</p>
              <p className="text-xs text-gray-500">
                {order.items.map(i => `${i.product_name} ×${i.quantity}`).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="font-bold text-gray-900 text-sm">₱{order.total_amount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
