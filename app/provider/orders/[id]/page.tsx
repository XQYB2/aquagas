'use client'

import { useParams, useRouter } from 'next/navigation'
import { useProvider } from '@/lib/provider-context'
import { OrderStatusBadge, getNextStatuses, STATUS_LABELS, STATUS_DESCRIPTIONS } from '@/components/provider/OrderStatusBadge'
import { ArrowLeft, Phone, MapPin, Banknote, Clock, AlertTriangle, Package } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { OrderStatus } from '@/lib/provider-context'
import dynamic from 'next/dynamic'

const DeliveryMap = dynamic(
  () => import('@/components/maps/DeliveryMap').then(m => m.DeliveryMap),
  { ssr: false, loading: () => <div className="h-56 rounded-xl bg-gray-100 animate-pulse" /> }
)

const ACTION_STYLES: Partial<Record<OrderStatus, string>> = {
  confirmed:        'bg-indigo-500 hover:bg-indigo-600 text-white',
  awaiting_pickup:  'bg-purple-500 hover:bg-purple-600 text-white',
  picked_up:        'bg-cyan-500 hover:bg-cyan-600 text-white',
  being_prepared:   'bg-yellow-500 hover:bg-yellow-600 text-white',
  out_for_delivery: 'bg-orange-500 hover:bg-orange-600 text-white',
  delivered:        'bg-green-500 hover:bg-green-600 text-white',
  cancelled:        'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
}

export default function ProviderOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { orders, updateOrderStatus } = useProvider()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [estimatedDelivery, setEstimatedDelivery] = useState('')

  const order = orders.find(o => o.id === id)

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-5xl mb-4">📦</p>
        <h2 className="text-xl font-bold mb-2">Order not found</h2>
        <Link href="/provider/orders" className="text-water-500 hover:underline">Back to orders</Link>
      </div>
    )
  }

  const nextStatuses = getNextStatuses(order.status)

  async function handleStatusUpdate(newStatus: OrderStatus) {
    setLoading(newStatus)
    await new Promise(r => setTimeout(r, 600))
    const extra = estimatedDelivery ? { estimated_delivery: estimatedDelivery } : undefined
    updateOrderStatus(id, newStatus, extra)
    setLoading(null)
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      router.push('/provider/orders')
    }
  }

  const subtotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min} min ago`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  // Show next action description
  const primaryNext = nextStatuses.filter(s => s !== 'cancelled')[0]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/provider/orders" className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-gray-400">Received {timeAgo(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="space-y-4">

        {/* Action card */}
        {nextStatuses.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm mb-1">Next Action</h2>
              {primaryNext && (
                <p className="text-xs text-gray-400">{STATUS_DESCRIPTIONS[order.status]}</p>
              )}
            </div>

            {/* Estimated delivery time — show when confirming or at awaiting_pickup */}
            {(order.status === 'placed' || order.status === 'confirmed') && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Estimated Delivery Time <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={estimatedDelivery}
                  onChange={e => setEstimatedDelivery(e.target.value)}
                  placeholder="e.g. 30-45 minutes, 2:00 PM today"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-300"
                />
                <p className="text-xs text-gray-400 mt-1">This will be shown to the customer in their order tracking.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {nextStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={!!loading}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${ACTION_STYLES[status] || 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {loading === status ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : status === 'cancelled' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : status === 'awaiting_pickup' ? (
                    <Package className="w-4 h-4" />
                  ) : null}
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estimated delivery (already set) */}
        {order.estimated_delivery && (
          <div className="bg-water-50 border border-water-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <p className="text-xs text-water-600 font-semibold uppercase tracking-wide">Estimated Delivery</p>
              <p className="text-sm text-water-800 font-medium">{order.estimated_delivery}</p>
            </div>
          </div>
        )}

        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Customer</h2>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-water-50 flex items-center justify-center">
                <span className="text-water-600 font-bold text-sm">{order.customer_name[0]}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{order.customer_name}</p>
            </div>
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-1.5 bg-water-50 text-water-700 font-semibold text-sm px-3 py-2 rounded-xl hover:bg-water-100 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </a>
          </div>

          <div className="flex items-start gap-2 pt-3 border-t border-gray-50">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Delivery Address</p>
              <p className="text-sm text-gray-700">{order.delivery_address}</p>
            </div>
          </div>

          {order.notes && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">📝 Customer Note</p>
              <p className="text-sm text-amber-800">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Order Items</h2>
          <div className="space-y-3 mb-4">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                  <p className="text-xs text-gray-400">₱{item.unit_price} × {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900 text-sm">₱{(item.unit_price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>₱{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery Fee</span>
              <span>₱{order.delivery_fee}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
              <span>Total to Collect</span>
              <span>₱{order.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery map */}
        {order.delivery_lat && order.delivery_lng && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-water-500" />
              Delivery Location
            </h2>
            <DeliveryMap
              destLat={order.delivery_lat}
              destLng={order.delivery_lng}
              customerName={order.customer_name}
              address={order.delivery_address}
            />
          </div>
        )}

        {/* Payment & timing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-green-500" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
            </div>
            <p className="font-semibold text-gray-900 text-sm">Cash on Delivery</p>
            <p className="text-xs text-gray-400 mt-0.5">Collect ₱{order.total_amount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Placed</p>
            </div>
            <p className="font-semibold text-gray-900 text-sm">
              {new Date(order.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {order.status === 'delivered' && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold text-sm">✅ Order delivered successfully!</p>
          </div>
        )}
        {order.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-red-600 font-semibold text-sm">❌ This order was cancelled.</p>
          </div>
        )}
      </div>
    </div>
  )
}
