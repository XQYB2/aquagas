'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Truck, Banknote, CheckCircle, BookmarkPlus, Bookmark, Home, Briefcase, Heart, MoreHorizontal } from 'lucide-react'
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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash'>('cod')
  const [gcashEnabled, setGcashEnabled] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string | null; address: string; lat: number | null; lng: number | null }[]>([])
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationSaved, setLocationSaved] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [pendingLabel, setPendingLabel] = useState('Home')

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (profile?.phone) setPhone(profile.phone)
  }, [profile])

  useEffect(() => {
    if (!user) return
    supabase
      .from('customer_addresses')
      .select('id, label, address, lat, lng')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSavedAddresses(data)
          // Auto-fill first saved address
          const first = data[0]
          setAddress(first.address)
          if (first.lat && first.lng) { setDeliveryLat(first.lat); setDeliveryLng(first.lng) }
        }
      })
  }, [user])

  // Check if this provider has GCash (Konfirma) configured
  useEffect(() => {
    if (!state.provider_id) return
    supabase
      .from('providers')
      .select('konfirma_pk, konfirma_sk, konfirma_wallet_id')
      .eq('id', state.provider_id)
      .single()
      .then(({ data }) => {
        const enabled = !!(data?.konfirma_pk && data?.konfirma_sk && data?.konfirma_wallet_id)
        setGcashEnabled(enabled)
        if (!enabled) setPaymentMethod('cod')
      })
  }, [state.provider_id])

  const isValid = address.trim() && name.trim() && phone.trim() && state.items.length > 0

  const LOCATION_CATEGORIES = [
    { value: 'Home',            icon: Home,           color: 'text-blue-500',  bg: 'bg-blue-50'  },
    { value: "Partner's House", icon: Heart,          color: 'text-pink-500',  bg: 'bg-pink-50'  },
    { value: 'Work',            icon: Briefcase,      color: 'text-amber-500', bg: 'bg-amber-50' },
    { value: 'Other',           icon: MoreHorizontal, color: 'text-gray-400',  bg: 'bg-gray-50'  },
  ]

  async function handleSaveLocation(label: string) {
    if (!user || !address.trim() || !deliveryLat || !deliveryLng) return
    setSavingLocation(true)
    setShowLabelPicker(false)
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({ customer_id: user.id, address: address.trim(), lat: deliveryLat, lng: deliveryLng, label })
      .select('id, label, address, lat, lng')
      .single()
    setSavingLocation(false)
    if (!error && data) {
      setSavedAddresses(prev => [...prev, data])
      setLocationSaved(true)
      setTimeout(() => setLocationSaved(false), 3000)
    }
  }

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
        // GCash orders stay hidden from provider until payment confirmed by webhook
        status: paymentMethod === 'gcash' ? 'pending_payment' : 'placed',
        total_amount: total,
        delivery_address: address,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        payment_method: paymentMethod,
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

    // GCash: hand the order off to Konfirma and send the customer to the hosted
    // payment page. The order stays unpaid until Konfirma's webhook confirms it.
    if (paymentMethod === 'gcash') {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.payment_url) {
        // GCash session failed — delete the orphaned order so it doesn't show up
        await supabase.from('order_items').delete().eq('order_id', order.id)
        await supabase.from('orders').delete().eq('id', order.id)
        setError(data.error || 'Could not start GCash payment. Please try again.')
        setLoading(false)
        return
      }
      dispatch({ type: 'CLEAR_CART' })
      window.location.href = data.payment_url
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
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
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

              {/* Saved address chips */}
              {savedAddresses.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {savedAddresses.map(a => {
                    const CATS = [
                      { value: 'Home',            icon: Home           },
                      { value: "Partner's House", icon: Heart          },
                      { value: 'Work',            icon: Briefcase      },
                      { value: 'Other',           icon: MoreHorizontal },
                    ]
                    const Icon = CATS.find(c => c.value === a.label)?.icon ?? Bookmark
                    const active = address === a.address
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAddress(a.address)
                          if (a.lat && a.lng) { setDeliveryLat(a.lat); setDeliveryLng(a.lng) }
                          setLocationSaved(false)
                          setShowLabelPicker(false)
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-water-500 text-white border-water-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-water-400'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {a.label || a.address.split(',')[0]}
                      </button>
                    )
                  })}
                </div>
              )}

              <textarea
                value={address}
                onChange={e => { setAddress(e.target.value); setLocationSaved(false) }}
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
                  setLocationSaved(false)
                }}
              />

              {/* Save location — only when pin is dropped and not already saved */}
              {deliveryLat && deliveryLng && address && !locationSaved && !savedAddresses.some(a => a.lat === deliveryLat && a.lng === deliveryLng) && (
                <div className="mt-2">
                  {!showLabelPicker ? (
                    <button
                      type="button"
                      onClick={() => setShowLabelPicker(true)}
                      disabled={savingLocation}
                      className="flex items-center gap-1.5 text-xs font-semibold text-water-600 hover:text-water-700 disabled:opacity-50 transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      {savingLocation ? 'Saving…' : 'Save this location'}
                    </button>
                  ) : (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500">Save as…</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {LOCATION_CATEGORIES.map(cat => {
                          const Icon = cat.icon
                          const active = pendingLabel === cat.value
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setPendingLabel(cat.value)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                                active
                                  ? `${cat.bg} border-transparent ${cat.color}`
                                  : 'bg-white border-gray-200 text-gray-500'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {cat.value}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveLocation(pendingLabel)}
                          className="flex-1 py-2 bg-water-500 hover:bg-water-600 text-white rounded-xl text-xs font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLabelPicker(false)}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {locationSaved && (
                <p className="mt-2 text-xs font-semibold text-green-600 flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5" /> Location saved!
                </p>
              )}
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
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                paymentMethod === 'cod' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-sm">Cash on Delivery</p>
                <p className="text-xs text-gray-500">Pay when your order arrives</p>
              </div>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'cod' ? 'border-green-500 bg-green-500' : 'border-gray-300'
              }`}>
                {paymentMethod === 'cod' && <span className="text-white text-xs">✓</span>}
              </div>
            </button>

            {gcashEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('gcash')}
                className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                  paymentMethod === 'gcash' ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                  G
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">GCash</p>
                  <p className="text-xs text-gray-500">Pay now via GCash before delivery</p>
                </div>
                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'gcash' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'gcash' && <span className="text-white text-xs">✓</span>}
                </div>
              </button>
            )}
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
          ) : paymentMethod === 'gcash'
            ? `Pay with GCash — ₱${total.toFixed(0)}`
            : `Place Order — ₱${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  )
}
