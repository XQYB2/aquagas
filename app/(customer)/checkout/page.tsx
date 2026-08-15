'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Truck, Banknote, CheckCircle, BookmarkPlus, Bookmark, Home, Briefcase, Heart, MoreHorizontal, Plus, Minus, Trash2, CalendarClock } from 'lucide-react'
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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'qrph'>('cod')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [deliveryType, setDeliveryType] = useState<'standard' | 'batch'>('standard')
  const [batchSlots, setBatchSlots] = useState<{ id: string; day_of_week: number; time_hhmm: string; max_orders: number; cutoff_minutes: number }[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; category: string | null; address: string; lat: number | null; lng: number | null; is_default: boolean }[]>([])
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationSaved, setLocationSaved] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [pendingLabel, setPendingLabel] = useState('Home')
  const [storeCoord, setStoreCoord] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (profile?.phone) setPhone(profile.phone)
  }, [profile])

  useEffect(() => {
    if (!user) return
    supabase
      .from('customer_addresses')
      .select('id, category, address, lat, lng, is_default')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSavedAddresses(data as any)
          // Auto-fill default address (or first)
          const def = data.find((a: any) => a.is_default) || data[0]
          setAddress(def.address)
          if (def.lat && def.lng) { setDeliveryLat(def.lat); setDeliveryLng(def.lng) }
        }
      })
  }, [user])

  // Fetch store coordinates
  useEffect(() => {
    if (!state.provider_id) return
    supabase
      .from('providers')
      .select('lat, lng')
      .eq('id', state.provider_id)
      .single()
      .then(({ data }) => {
        if (data?.lat && data?.lng) setStoreCoord({ lat: data.lat, lng: data.lng })
      })
  }, [state.provider_id])

  // Load active batch slots for this provider
  useEffect(() => {
    if (!state.provider_id) return
    supabase
      .from('delivery_slots')
      .select('id, day_of_week, time_hhmm, max_orders, cutoff_minutes')
      .eq('provider_id', state.provider_id)
      .eq('is_active', true)
      .order('day_of_week')
      .then(({ data }) => setBatchSlots(data || []))
  }, [state.provider_id])

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function nextOccurrence(dayOfWeek: number, timeHhmm: string): Date {
    const now = new Date()
    const [h, m] = timeHhmm.split(':').map(Number)
    const result = new Date(now)
    result.setHours(h, m, 0, 0)
    let daysAhead = dayOfWeek - now.getDay()
    if (daysAhead < 0 || (daysAhead === 0 && result <= now)) daysAhead += 7
    result.setDate(result.getDate() + daysAhead)
    return result
  }

  function slotAvailable(slot: typeof batchSlots[0]): boolean {
    const next = nextOccurrence(slot.day_of_week, slot.time_hhmm)
    const cutoff = new Date(next.getTime() - slot.cutoff_minutes * 60000)
    return new Date() < cutoff
  }

  const hasPhone = !!profile?.phone
  const hasPin = !!(deliveryLat && deliveryLng)
  const isValid = hasPhone && hasPin && address.trim() && name.trim() && phone.trim() && state.items.length > 0 &&
    (deliveryType === 'standard' || (deliveryType === 'batch' && !!selectedSlotId))

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
      .insert({ customer_id: user.id, address: address.trim(), lat: deliveryLat, lng: deliveryLng, category: label, is_default: savedAddresses.length === 0 })
      .select('id, category, address, lat, lng, is_default')
      .single()
    setSavingLocation(false)
    if (!error && data) {
      setSavedAddresses(prev => [...prev, data as any])
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

    const isBatch = deliveryType === 'batch' && selectedSlotId
    const batchSlot = isBatch ? batchSlots.find(s => s.id === selectedSlotId) : null
    const scheduledAt = batchSlot ? nextOccurrence(batchSlot.day_of_week, batchSlot.time_hhmm).toISOString() : null
    const orderTotal = isBatch ? subtotal : total  // batch = free delivery

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        provider_id: state.provider_id,
        status: paymentMethod === 'qrph' ? 'pending_payment' : 'placed',
        total_amount: orderTotal,
        delivery_address: address,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        payment_method: paymentMethod,
        notes,
        delivery_type: deliveryType,
        ...(isBatch && { slot_id: selectedSlotId, scheduled_at: scheduledAt }),
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

    // QR Ph: generate QR code and show it in a modal
    if (paymentMethod === 'qrph') {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
      let json: any = {}
      try { json = await res.json() } catch {}
      if (!res.ok || !json.qr_url) {
        await supabase.from('order_items').delete().eq('order_id', order.id)
        await supabase.from('orders').delete().eq('id', order.id)
        setError(json.error || 'Could not generate QR code. Please try again.')
        setLoading(false)
        return
      }
      dispatch({ type: 'CLEAR_CART' })
      setQrUrl(json.qr_url)
      setQrModalOpen(true)
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
        <Link href="/home" className="inline-block mt-4 bg-water-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-water-600 transition-colors">
          Browse Stores
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/home" className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      {!hasPhone && (
        <Link href="/profile" className="flex items-center gap-3 bg-red-600 text-white rounded-2xl px-4 py-3 mb-4 hover:bg-red-700 transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Phone number required</p>
            <p className="text-xs text-red-100">Add your mobile number in your profile to place orders. Click here.</p>
          </div>
          <ArrowLeft className="w-4 h-4 rotate-180 shrink-0" />
        </Link>
      )}

      <div className="space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order from {state.provider_name}</h2>
          <div className="space-y-3 mb-4">
            {state.items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">₱{item.price} each</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.quantity === 1) {
                        if (confirm(`Remove "${item.name}" from your cart?`)) {
                          dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, quantity: 0 } })
                        }
                      } else {
                        dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, quantity: item.quantity - 1 } })
                      }
                    }}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-gray-600" />}
                  </button>
                  <span className="w-5 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, quantity: item.quantity + 1 } })}
                    className="w-7 h-7 rounded-lg bg-water-500 text-white flex items-center justify-center hover:bg-water-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-semibold text-gray-900 text-sm w-14 text-right">₱{(item.price * item.quantity).toFixed(0)}</span>
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
              {deliveryType === 'batch'
                ? <span className="text-green-600 font-semibold">Free</span>
                : <span>₱{state.delivery_fee}</span>}
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1">
              <span>Total</span>
              <span>₱{deliveryType === 'batch' ? subtotal.toFixed(0) : total.toFixed(0)}</span>
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
                    const Icon = CATS.find(c => c.value === a.category)?.icon ?? Bookmark
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
                        {a.category || a.address.split(',')[0]}
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
                storeCoord={storeCoord}
                onChange={(lat, lng, addr) => {
                  setDeliveryLat(lat)
                  setDeliveryLng(lng)
                  if (!address) setAddress(addr)
                  setLocationSaved(false)
                }}
              />
              {!hasPin && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">Pin your delivery location on the map to continue</p>
                </div>
              )}

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

        {/* Delivery Type */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-water-500" />
            Delivery Type
          </h2>
          <div className="space-y-2">
            {/* Standard */}
            <button
              type="button"
              onClick={() => setDeliveryType('standard')}
              className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                deliveryType === 'standard'
                  ? 'bg-water-100 dark:bg-water-700/30 border-water-300 dark:border-water-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="w-10 h-10 bg-water-100 dark:bg-water-600/30 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-water-600 dark:text-water-400" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Standard Delivery</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Delivered as soon as available · ₱{state.delivery_fee} fee</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                deliveryType === 'standard' ? 'border-water-500 bg-water-500' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {deliveryType === 'standard' && <span className="text-white text-xs">✓</span>}
              </div>
            </button>

            {/* Batch */}
            {batchSlots.length > 0 && (
              <button
                type="button"
                onClick={() => { setDeliveryType('batch'); if (!selectedSlotId && batchSlots.length > 0) setSelectedSlotId(batchSlots[0].id) }}
                className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                  deliveryType === 'batch'
                    ? 'bg-green-100 dark:bg-green-700/20 border-green-300 dark:border-green-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-600/30 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Batch Delivery</p>
                  <p className="text-xs text-green-700 dark:text-green-400 font-semibold">Free · Scheduled delivery</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  deliveryType === 'batch' ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {deliveryType === 'batch' && <span className="text-white text-xs">✓</span>}
                </div>
              </button>
            )}
          </div>

          {/* Slot picker */}
          {deliveryType === 'batch' && batchSlots.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pick a schedule</p>
              {batchSlots.map(slot => {
                const next = nextOccurrence(slot.day_of_week, slot.time_hhmm)
                const available = slotAvailable(slot)
                const selected = selectedSlotId === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-colors ${
                      !available ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' :
                      selected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-green-200'
                    }`}
                  >
                    <CalendarClock className={`w-4 h-4 shrink-0 ${selected ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {DAYS[slot.day_of_week]} — {slot.time_hhmm}
                      </p>
                      <p className="text-xs text-gray-400">
                        {available
                          ? next.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
                          : 'Cutoff passed — try next week'}
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      selected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`} />
                  </button>
                )
              })}
            </div>
          )}
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

            <button
              type="button"
              onClick={() => setPaymentMethod('qrph')}
              className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                paymentMethod === 'qrph' ? 'bg-water-50 border-water-300' : 'bg-white border-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-water-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-water-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-sm">QR Ph (InstaPay)</p>
                <p className="text-xs text-gray-500">Scan with any banking app — instant transfer</p>
              </div>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'qrph' ? 'border-water-500 bg-water-500' : 'border-gray-300'
              }`}>
                {paymentMethod === 'qrph' && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
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
          ) : (() => {
            const amt = deliveryType === 'batch' ? subtotal.toFixed(0) : total.toFixed(0)
            if (paymentMethod === 'qrph') return `Pay via QR Ph — ₱${amt}`
            if (deliveryType === 'batch') return `Schedule Batch Order — ₱${amt}`
            return `Place Order — ₱${amt}`
          })()}
        </button>
      </div>

      {/* QR Ph Payment Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-5">
            <h2 className="text-xl font-bold text-gray-900">Scan to Pay</h2>
            <p className="text-sm text-gray-500 text-center">
              Open your banking app (BDO, BPI, GCash, Maya, UnionBank…) and scan this QR code to pay via InstaPay.
            </p>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Ph payment code" className="w-56 h-56 rounded-xl border border-gray-100" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-water-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            )}
            <p className="text-xs text-gray-400 text-center">
              Your order is saved. Once payment is confirmed, the store will prepare your delivery.
            </p>
            <button
              onClick={() => { setQrModalOpen(false); router.push('/orders') }}
              className="w-full py-3.5 rounded-2xl bg-water-500 hover:bg-water-600 text-white font-bold transition-colors"
            >
              I've Paid — Go to Orders
            </button>
            <button
              onClick={() => setQrModalOpen(false)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Pay later from Orders
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
