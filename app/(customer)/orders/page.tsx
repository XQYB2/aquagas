'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { StatusBadge } from '@/components/customer/StatusBadge'
import { ArrowRight, Package, X, Truck, ChefHat, CheckCircle2, CalendarClock } from 'lucide-react'
import Link from 'next/link'

type Order = {
  id: string
  status: string
  total_amount: number
  created_at: string
  provider_name: string
  payment_method: string | null
  delivery_type: 'standard' | 'batch'
  scheduled_at: string | null
  items: { id: string; product_name: string; quantity: number }[]
}

// Statuses that mean the order is actively being processed
const ACTIVE_STATUSES = ['confirmed', 'awaiting_pickup', 'picked_up', 'being_prepared', 'out_for_delivery']

const ACTIVE_STATUS_INFO: Record<string, { icon: React.ReactNode; label: string; sub: string; color: string; bg: string; border: string }> = {
  confirmed:        { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Order Confirmed',       sub: 'Your store has accepted your order.',              color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
  awaiting_pickup:  { icon: <Package className="w-4 h-4" />,      label: 'Place Gallons Outside', sub: 'Put your empty gallons outside for pickup.',       color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-100' },
  picked_up:        { icon: <Package className="w-4 h-4" />,      label: 'Gallons Picked Up',     sub: 'Your gallons are being refilled.',                 color: 'text-cyan-600',   bg: 'bg-cyan-50',    border: 'border-cyan-100'   },
  being_prepared:   { icon: <ChefHat className="w-4 h-4" />,      label: 'Being Prepared',        sub: 'Your order is being packed and prepared.',         color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-100' },
  out_for_delivery: { icon: <Truck className="w-4 h-4" />,        label: 'Out for Delivery',      sub: 'Your rider is on the way!',                       color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-100' },
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setOrders([]); setLoading(false); return }
    load()
  }, [user, authLoading])

  async function load() {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, payment_method, delivery_type, scheduled_at, providers(store_name)')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false })

    if (!ordersData) { setOrders([]); setLoading(false); return }

    const orderIds = ordersData.map((o: any) => o.id)
    const { data: itemsData } = orderIds.length
      ? await supabase.from('order_items').select('id, order_id, quantity, products(name)').in('order_id', orderIds)
      : { data: [] as any[] }

    setOrders(ordersData.map((o: any) => ({
      id: o.id,
      status: o.status,
      total_amount: o.total_amount,
      created_at: o.created_at,
      payment_method: o.payment_method,
      provider_name: o.providers?.store_name || 'Store',
      delivery_type: o.delivery_type || 'standard',
      scheduled_at: o.scheduled_at || null,
      items: (itemsData || [])
        .filter((i: any) => i.order_id === o.id)
        .map((i: any) => ({ id: i.id, product_name: i.products?.name || 'Item', quantity: i.quantity })),
    })))
    setLoading(false)
  }

  async function handleCancelPayment(e: React.MouseEvent, orderId: string) {
    e.preventDefault()
    if (!confirm('Cancel this order and payment?')) return
    setCancellingId(orderId)
    // Mark as cancelled rather than delete — avoids RLS issues with order_items
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('customer_id', user!.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } else {
      alert('Could not cancel. Please try again.')
    }
    setCancellingId(null)
  }

  if (loading || authLoading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 text-sm mb-6">Your orders will appear here once you place one.</p>
        <Link href="/" className="inline-block bg-water-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-water-600 transition-colors">
          Browse Stores
        </Link>
      </div>
    )
  }

  // Active orders shown as banner at top
  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Orders</h1>

      {/* Active order banners */}
      {activeOrders.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Active</p>
          <div className="space-y-2">
            {activeOrders.map(order => {
              const info = ACTIVE_STATUS_INFO[order.status]
              if (!info) return null
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className={`flex items-center gap-3 rounded-2xl border ${info.bg} ${info.border} p-4`}>
                    <div className={`w-9 h-9 rounded-xl bg-white/60 border ${info.border} flex items-center justify-center ${info.color} shrink-0`}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${info.color}`}>{info.label}</p>
                      <p className="text-xs text-gray-500 truncate">{order.provider_name} · {info.sub}</p>
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 ${info.color}`} />
                  </div>
                </Link>
              )
            })}
          </div>
          <div className="mt-5 mb-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Orders</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm hover:border-gray-200 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{order.provider_name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    <span className="font-mono text-gray-500">#{order.id.slice(-6).toUpperCase()}</span>
                    {' · '}
                    {new Date(order.created_at).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status as any} />
                  {order.status !== 'pending_payment' && (
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  )}
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {order.items.map(item => (
                  <p key={item.id} className="text-xs text-gray-500">
                    {item.product_name} × {item.quantity}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 text-xs">
                  {order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
                </span>
                <span className="font-bold text-gray-900">₱{order.total_amount.toFixed(0)}</span>
              </div>

              {/* Delivery type pill */}
              {order.delivery_type === 'batch' ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    <CalendarClock className="w-3 h-3" />
                    Batch Delivery
                    {order.scheduled_at && (
                      <span className="text-green-600 font-normal">
                        · {new Date(order.scheduled_at).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 text-gray-500 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    <Truck className="w-3 h-3" />
                    Standard Delivery
                  </div>
                </div>
              )}

              {/* Cancel payment button for pending GCash orders */}
              {order.status === 'pending_payment' && order.payment_method === 'gcash' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={e => handleCancelPayment(e, order.id)}
                    disabled={cancellingId === order.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    {cancellingId === order.id ? 'Cancelling…' : 'Cancel Payment'}
                  </button>
                  <Link
                    href={`/orders/${order.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Complete Payment
                  </Link>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
