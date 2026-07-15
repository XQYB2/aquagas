'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Truck, Banknote, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const AddressPicker = dynamic(() => import('@/components/maps/AddressPicker').then(m => m.AddressPicker), { ssr: false })

export default function CheckoutPage() {
  const { state, dispatch, subtotal, total } = useCart()
  const { user, profile } = useAuth()
  const router = useRouter()

  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null)
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (profile?.phone) setPhone(profile.phone)
  }, [profile])

  useEffect(() => {
    if (!user) return
    supabase
      .from('customer_addresses')
      .select('address')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setAddress(data[0].address) })
  }, [user])

  const isValid = address.trim() && name.trim() && phone.trim() && state.items.length > 0

  async function handlePlaceOrder() {
    if (!isValid || !state.provider_id) return
    if (!user) {
      setError('Please sign in to place an order.')
      return
    }
    setLoading(true)
    setError('')

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        provider_id: state.provider_id,
        status: 'placed',
        total_amount: total,
        delivery_address: address,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        payment_method: 'cod',
        notes,
      })
      .select()
      .single()

    if (orderError || !order) {
      setError(orderError?.message || 'Failed to place order. Please try again.')
      setLoading(false)
      return
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      state.items.map(i => ({
        order_id: order.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.price,
      }))
    )

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
      return
    }

    dispatch({ type: 'CLEAR_CART' })
    setSuccess(true)
    setLoading(false)

    setTimeout(() => router.push('/orders'), 2500)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-500 mb-6">Your order has been sent to <strong>{state.provider_name || 'the store'}</strong>. Redirecting to your orders…</p>
        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-water-500 rounded-full animate-[grow_2.5s_ease-in-out_forwards]" style={{ animation: 'width 2.5s ease-in-out forwards', width: '100%' }} />
        </div>
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-bold mb-2 text-gray-900">Your cart is empty</h2>
        <Link href="/" className="inline-block mt-4 bg-water-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-water-600 transition-colors">
          Browse Stores
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order from {state.provider_name}</h2>
          <div className="space-y-2 mb-4">
            {state.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} × {item.quantity}</span>
                <span className="font-semibold text-gray-900">₱{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery fee</span>
              <span>₱{state.delivery_fee}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1">
              <span>Total</span>
              <span>₱{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-water-500" />
            Delivery Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09xxxxxxxxx"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Delivery Address
              </label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="House No., Street, Barangay, City"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 focus:border-transparent placeholder:text-gray-400 resize-none mb-2"
              />
              <AddressPicker
                lat={deliveryLat}
                lng={deliveryLng}
                onChange={(lat, lng, addr) => {
                  setDeliveryLat(lat)
                  setDeliveryLng(lng)
                  if (!address) setAddress(addr)
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Delivery Instructions (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Leave at gate, call upon arrival"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-green-500" />
            Payment Method
          </h2>
          <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Cash on Delivery</p>
              <p className="text-xs text-gray-500">Pay when your order arrives</p>
            </div>
            <div className="ml-auto w-5 h-5 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Place Order */}
        <button
          onClick={handlePlaceOrder}
          disabled={!isValid || loading}
          className="w-full py-4 rounded-2xl bg-water-500 hover:bg-water-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-base transition-colors shadow-lg shadow-water-200 disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Placing Order…
            </span>
          ) : `Place Order — ₱${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  )
}
