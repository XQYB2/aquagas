'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { StatusBadge } from '@/components/customer/StatusBadge'
import { ArrowRight, Package } from 'lucide-react'
import Link from 'next/link'

type Order = {
  id: string
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  total_amount: number
  created_at: string
  provider_name: string
  items: { id: string; product_name: string; quantity: number }[]
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setOrders([])
      setLoading(false)
      return
    }

    async function load() {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, provider_id, providers(store_name)')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false })

      if (!ordersData) {
        setOrders([])
        setLoading(false)
        return
      }

      const orderIds = ordersData.map((o: any) => o.id)
      const { data: itemsData } = orderIds.length
        ? await supabase
            .from('order_items')
            .select('id, order_id, quantity, products(name)')
            .in('order_id', orderIds)
        : { data: [] as any[] }

      const result: Order[] = ordersData.map((o: any) => ({
        id: o.id,
        status: o.status,
        total_amount: o.total_amount,
        created_at: o.created_at,
        provider_name: o.providers?.store_name || 'Store',
        items: (itemsData || [])
          .filter((i: any) => i.order_id === o.id)
          .map((i: any) => ({ id: i.id, product_name: i.products?.name || 'Item', quantity: i.quantity })),
      }))

      setOrders(result)
      setLoading(false)
    }

    load()
  }, [user, authLoading])

  if (loading || authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>
    )
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Orders</h1>

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
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
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
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
