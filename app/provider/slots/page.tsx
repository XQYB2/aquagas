'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/provider-context'
import { supabase } from '@/lib/supabase'
import { CalendarClock, Plus, Trash2, Users, Clock, ChevronDown, ChevronUp, Package } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type Slot = {
  id: string
  provider_id: string
  day_of_week: number
  time_hhmm: string
  max_orders: number
  cutoff_minutes: number
  is_active: boolean
}

type BatchOrder = {
  id: string
  status: string
  total_amount: number
  customer_name: string
  delivery_address: string
  items: { product_name: string; quantity: number }[]
}

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

export default function ProviderSlotsPage() {
  const { store } = useProvider()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [batchOrders, setBatchOrders] = useState<Record<string, BatchOrder[]>>({})
  const [dispatching, setDispatching] = useState<string | null>(null)

  const [form, setForm] = useState({
    day_of_week: 1,
    time_hhmm: '09:00',
    max_orders: 20,
    cutoff_minutes: 60,
  })

  useEffect(() => {
    if (!store) return
    supabase
      .from('delivery_slots')
      .select('*')
      .eq('provider_id', store.id)
      .order('day_of_week')
      .then(({ data }) => { setSlots(data || []); setLoading(false) })
  }, [store])

  async function handleAdd() {
    if (!store) return
    setSaving(true)
    const { data, error } = await supabase
      .from('delivery_slots')
      .insert({ ...form, provider_id: store.id })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setSlots(s => [...s, data])
      setAdding(false)
      setForm({ day_of_week: 1, time_hhmm: '09:00', max_orders: 20, cutoff_minutes: 60 })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this slot? Existing orders will not be affected.')) return
    await supabase.from('delivery_slots').delete().eq('id', id)
    setSlots(s => s.filter(sl => sl.id !== id))
    if (expandedSlot === id) setExpandedSlot(null)
  }

  async function handleToggle(slot: Slot) {
    await supabase.from('delivery_slots').update({ is_active: !slot.is_active }).eq('id', slot.id)
    setSlots(s => s.map(sl => sl.id === slot.id ? { ...sl, is_active: !sl.is_active } : sl))
  }

  async function loadBatchOrders(slotId: string) {
    if (batchOrders[slotId]) return
    const { data: orderRows } = await supabase
      .from('orders')
      .select('id, status, total_amount, delivery_address, customer_id')
      .eq('slot_id', slotId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at')

    if (!orderRows || orderRows.length === 0) { setBatchOrders(b => ({ ...b, [slotId]: [] })); return }

    const customerIds = Array.from(new Set(orderRows.map((o: any) => o.customer_id)))
    const orderIds = orderRows.map((o: any) => o.id)

    const [{ data: profiles }, { data: items }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', customerIds),
      supabase.from('order_items').select('order_id, quantity, products(name)').in('order_id', orderIds),
    ])

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]))
    const orders: BatchOrder[] = orderRows.map((o: any) => ({
      id: o.id,
      status: o.status,
      total_amount: o.total_amount,
      customer_name: profileMap[o.customer_id] || 'Customer',
      delivery_address: o.delivery_address,
      items: (items || [])
        .filter((i: any) => i.order_id === o.id)
        .map((i: any) => ({ product_name: i.products?.name || 'Item', quantity: i.quantity })),
    }))
    setBatchOrders(b => ({ ...b, [slotId]: orders }))
  }

  async function handleExpand(slotId: string) {
    if (expandedSlot === slotId) { setExpandedSlot(null); return }
    setExpandedSlot(slotId)
    await loadBatchOrders(slotId)
  }

  async function handleDispatchBatch(slotId: string) {
    if (!confirm('Mark all orders in this batch as Out for Delivery?')) return
    setDispatching(slotId)
    const orders = batchOrders[slotId] || []
    const ids = orders.filter(o => o.status === 'being_prepared' || o.status === 'confirmed' || o.status === 'placed').map(o => o.id)
    if (ids.length === 0) { setDispatching(null); return }

    await supabase
      .from('orders')
      .update({ status: 'out_for_delivery', updated_at: new Date().toISOString() })
      .in('id', ids)

    setBatchOrders(b => ({
      ...b,
      [slotId]: (b[slotId] || []).map(o => ids.includes(o.id) ? { ...o, status: 'out_for_delivery' } : o),
    }))
    setDispatching(null)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Batch Delivery Slots</h1>
          <p className="text-xs text-gray-400 mt-0.5">Free scheduled delivery — group orders into time slots</p>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-2 px-4 py-2 bg-water-500 hover:bg-water-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Slot
        </button>
      </div>

      {/* Add slot form */}
      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Recurring Slot</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Day</label>
              <select
                value={form.day_of_week}
                onChange={e => setForm(f => ({ ...f, day_of_week: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Time</label>
              <input
                type="time"
                value={form.time_hhmm}
                onChange={e => setForm(f => ({ ...f, time_hhmm: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max Orders</label>
              <input
                type="number"
                min={1}
                value={form.max_orders}
                onChange={e => setForm(f => ({ ...f, max_orders: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cutoff (min before)</label>
              <input
                type="number"
                min={15}
                step={15}
                value={form.cutoff_minutes}
                onChange={e => setForm(f => ({ ...f, cutoff_minutes: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-2.5 bg-water-500 hover:bg-water-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save Slot'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20">
          <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No batch slots yet</p>
          <p className="text-gray-400 text-sm mt-1">Add a recurring slot to enable free scheduled delivery for customers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => {
            const next = nextOccurrence(slot.day_of_week, slot.time_hhmm)
            const cutoffTime = new Date(next.getTime() - slot.cutoff_minutes * 60000)
            const orders = batchOrders[slot.id] || []
            const isExpanded = expandedSlot === slot.id
            const dispatchable = orders.filter(o => ['placed', 'confirmed', 'being_prepared'].includes(o.status))

            return (
              <div key={slot.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${slot.is_active ? 'bg-water-50' : 'bg-gray-50'}`}>
                        <CalendarClock className={`w-5 h-5 ${slot.is_active ? 'text-water-500' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          Every {DAYS[slot.day_of_week]} at {slot.time_hhmm}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Next: {next.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })} · Cutoff {cutoffTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(slot)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                          slot.is_active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {slot.is_active ? 'Active' : 'Paused'}
                      </button>
                      <button onClick={() => handleDelete(slot.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Max {slot.max_orders} orders</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {slot.cutoff_minutes} min cutoff</span>
                    <span className="text-green-600 font-semibold">Free delivery</span>
                  </div>

                  <button
                    onClick={() => handleExpand(slot.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-water-600 hover:text-water-700 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" />
                    View batch orders
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Batch orders list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {orders.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No active orders in this slot yet.</p>
                    ) : (
                      <>
                        {orders.map(o => (
                          <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">{o.customer_name}</p>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                o.status === 'out_for_delivery' ? 'bg-orange-50 text-orange-600' :
                                o.status === 'delivered' ? 'bg-green-50 text-green-700' :
                                'bg-blue-50 text-blue-700'
                              }`}>{o.status.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mb-1">{o.delivery_address}</p>
                            <p className="text-xs text-gray-500">
                              {o.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}
                            </p>
                            <p className="text-xs font-bold text-gray-900 mt-1">₱{o.total_amount}</p>
                          </div>
                        ))}

                        {dispatchable.length > 0 && (
                          <button
                            onClick={() => handleDispatchBatch(slot.id)}
                            disabled={dispatching === slot.id}
                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
                          >
                            {dispatching === slot.id ? 'Dispatching…' : `🚚 Dispatch ${dispatchable.length} Order${dispatchable.length !== 1 ? 's' : ''} — Out for Delivery`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
