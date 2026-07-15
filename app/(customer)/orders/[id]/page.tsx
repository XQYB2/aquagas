'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { StatusStepper, StatusBadge } from '@/components/customer/StatusBadge'
import { ArrowLeft, MapPin, Phone, Banknote, AlertCircle, Star } from 'lucide-react'
import Link from 'next/link'

type Order = {
  id: string
  status: 'placed' | 'confirmed' | 'awaiting_pickup' | 'picked_up' | 'being_prepared' | 'out_for_delivery' | 'delivered' | 'cancelled'
  total_amount: number
  delivery_address: string
  delivery_fee: number
  estimated_delivery: string | null
  created_at: string
  provider_id: string
  provider_name: string
  service_type: 'water' | 'lpg' | 'both' | null
  items: { id: string; product_name: string; quantity: number; unit_price: number }[]
}

type Review = {
  id: string
  rating: number
  comment: string | null
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const [review, setReview] = useState<Review | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: o } = await supabase
        .from('orders')
        .select('id, status, total_amount, delivery_address, estimated_delivery, created_at, provider_id, providers(store_name, delivery_fee, service_type)')
        .eq('id', id)
        .single()

      if (!o) {
        setOrder(null)
        setLoading(false)
        return
      }

      const { data: items } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, products(name)')
        .eq('order_id', id)

      const op = o as any
      setOrder({
        id: op.id,
        status: op.status,
        total_amount: op.total_amount,
        delivery_address: op.delivery_address,
        delivery_fee: op.providers?.delivery_fee || 0,
        estimated_delivery: op.estimated_delivery || null,
        created_at: op.created_at,
        provider_id: op.provider_id,
        provider_name: op.providers?.store_name || 'Store',
        service_type: op.providers?.service_type || null,
        items: (items || []).map((i: any) => ({
          id: i.id, product_name: i.products?.name || 'Item', quantity: i.quantity, unit_price: i.unit_price,
        })),
      })

      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id, rating, comment')
        .eq('order_id', id)
        .maybeSingle()
      if (existingReview) setReview(existingReview)

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmitReview() {
    if (!order || !user || reviewRating === 0) return
    setSubmittingReview(true)

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        order_id: order.id,
        customer_id: user.id,
        provider_id: order.provider_id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      })
      .select('id, rating, comment')
      .single()

    if (!error && data) setReview(data)
    setSubmittingReview(false)
  }

  async function handleCancel() {
    if (!order) return
    setCancelling(true)

    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)

    if (!error) {
      setOrder(prev => prev ? { ...prev, status: 'cancelled' as const } : null)
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">📦</p>
        <h2 className="text-xl font-bold mb-2">Order not found</h2>
        <Link href="/orders" className="text-water-500 hover:underline">View all orders</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleDateString('en-PH', {
              weekday: 'long', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={order.status as any} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Status Stepper */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-5 text-sm">Delivery Status</h2>
          <StatusStepper status={order.status as any} estimatedDelivery={order.estimated_delivery} serviceType={order.service_type} />
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Store</h2>
          <div className="flex items-center justify-between">
            <p className="text-gray-700 font-medium">{order.provider_name}</p>
            <a href="tel:09000000000" className="flex items-center gap-1.5 text-water-600 font-semibold text-sm">
              <Phone className="w-4 h-4" />
              Call
            </a>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-water-500" />
            Delivery Address
          </h2>
          <p className="text-gray-600 text-sm">{order.delivery_address}</p>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Order Items</h2>
          <div className="space-y-2 mb-4">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product_name} × {item.quantity}</span>
                <span className="font-semibold text-gray-900">₱{(item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery fee</span>
              <span>₱{order.delivery_fee}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900">
              <span>Total</span>
              <span>₱{order.total_amount.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-gray-900">Cash on Delivery</span>
          </div>
        </div>

        {/* Cancel Button */}
        {order.status === 'placed' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}

        {order.status === 'delivered' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-green-700 font-semibold text-sm mb-4">✅ Order Delivered — Thank you!</p>

            {review ? (
              <div>
                <p className="text-xs text-gray-400 mb-2">Your rating</p>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star
                      key={n}
                      className={`w-5 h-5 ${n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Rate {order.provider_name}</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewRating(n)} aria-label={`${n} star`}>
                      <Star
                        className={`w-7 h-7 transition-colors ${n <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share your experience (optional)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 focus:border-transparent placeholder:text-gray-400 resize-none mb-3"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || submittingReview}
                  className="w-full py-3 rounded-xl bg-water-500 hover:bg-water-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-colors"
                >
                  {submittingReview ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
