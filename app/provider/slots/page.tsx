'use client'

import { useState, useEffect } from 'react'
import { useProvider, type OrderStatus } from '@/lib/provider-context'
import { supabase } from '@/lib/supabase'
import { STATUS_LABELS, OrderStatusBadge, getNextStatuses } from '@/components/provider/OrderStatusBadge'
import { CalendarClock, Plus, Trash2, Users, Clock, ChevronDown, ChevronUp, Package, Loader2 } from 'lucide-react'

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
  status: OrderStatus
  total_amount: number
  customer_name: string
  delivery_address: string
  containers_ready_at: string | null
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
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

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
    const { data: orderRows } = await supabase
      .from('orders')
      .select('id, status, total_amount, delivery_address, customer_id, containers_ready_at')
      .eq('slot_id', slotId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at')

    if (!orderRows || orderRows.length === 0) { setBatchOrders(b => ({ ...b, [slotId]: [] })); return }

    const customerIds = Array.from(new Set(orderRows.map((o: any) => o.customer_id)))
    const orderIds = orderRows.map((o: any) => o.id)

    const [{ data: profiles }, { data: items }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', customerIds),
      supabase.from('order_items').select('order_id, product_name, quantity, products(name)').in('order_id', orderIds),
    ])

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]))
    const orders: BatchOrder[] = orderRows.map((o: any) => ({
      id: o.id,
      status: o.status as OrderStatus,
      total_amount: o.total_amount,
      customer_name: profileMap[o.customer_id] || 'Customer',
      delivery_address: o.delivery_address,
      containers_ready_at: o.containers_ready_at || null,
      items: (items || [])
        .filter((i: any) => i.order_id === o.id)
        .map((i: any) => ({ product_name: i.product_name || i.products?.name || 'Product unavailable', quantity: i.quantity })),
    }))
    setBatchOrders(b => ({ ...b, [slotId]: orders }))
  }

  async function handleExpand(slotId: string) {
    if (expandedSlot === slotId) { setExpandedSlot(null); return }
    setActionError('')
    setExpandedSlot(slotId)
    await loadBatchOrders(slotId)
  }

  function getNextAction(order: BatchOrder): OrderStatus | null {
    return getNextStatuses(order.status).find(status => status !== 'cancelled') || null
  }

  async function handleOrderStatus(slotId: string, order: BatchOrder, nextStatus: OrderStatus) {
    if (nextStatus === 'picked_up' && !order.containers_ready_at) return

    setUpdatingOrder(order.id)
    setActionError('')
    const updatedAt = new Date().toISOString()
    const changes: { status: OrderStatus; updated_at: string; delivered_at?: string } = {
      status: nextStatus,
      updated_at: updatedAt,
    }
    if (nextStatus === 'delivered') changes.delivered_at = updatedAt

    let query = supabase
      .from('orders')
      .update(changes)
      .eq('id', order.id)
      .eq('status', order.status)

    if (nextStatus === 'picked_up') query = query.not('containers_ready_at', 'is', null)
    const { data, error } = await query.select('id')

    if (error || !data?.length) {
      setActionError(error?.message || 'This order changed elsewhere. Close and reopen the batch, then try again.')
      setUpdatingOrder(null)
      return
    }

    setBatchOrders(current => ({
      ...current,
      [slotId]: (current[slotId] || []).map(item => item.id === order.id ? { ...item, status: nextStatus } : item),
    }))
    setUpdatingOrder(null)
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Batch Delivery Slots</h1>
          <p className="text-xs text-gray-400 mt-0.5">Free scheduled delivery — group orders into time slots</p>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-water-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-water-600 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Slot
        </button>
      </div>

      {/* Add slot form */}
      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Recurring Slot</h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="grid gap-3 xl:grid-cols-2">
          {slots.map(slot => {
            const next = nextOccurrence(slot.day_of_week, slot.time_hhmm)
            const cutoffTime = new Date(next.getTime() - slot.cutoff_minutes * 60000)
            const orders = batchOrders[slot.id] || []
            const isExpanded = expandedSlot === slot.id
            return (
              <div key={slot.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${slot.is_active ? 'bg-water-50' : 'bg-gray-50'}`}>
                        <CalendarClock className={`w-5 h-5 ${slot.is_active ? 'text-water-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
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

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
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
                    {actionError && (
                      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {actionError}
                      </div>
                    )}
                    {orders.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No active orders in this slot yet.</p>
                    ) : (
                      <>
                        {orders.map(o => {
                          const nextAction = getNextAction(o)
                          const waitingForCustomer = o.status === 'awaiting_pickup' && !o.containers_ready_at
                          const isUpdating = updatingOrder === o.id

                          return (
                          <div key={o.id} className="rounded-xl border border-gray-100 bg-white p-3">
                            <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <p className="min-w-0 break-words text-sm font-semibold text-gray-900">{o.customer_name}</p>
                              <OrderStatusBadge status={o.status} />
                            </div>
                            <p className="mb-1 break-words text-xs text-gray-400">{o.delivery_address}</p>
                            <p className="break-words text-xs text-gray-500">
                              {o.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}
                            </p>
                            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs font-bold text-gray-900">₱{o.total_amount}</p>
                              {nextAction && (
                                <button
                                  type="button"
                                  onClick={() => handleOrderStatus(slot.id, o, nextAction)}
                                  disabled={isUpdating || waitingForCustomer || updatingOrder !== null}
                                  aria-describedby={waitingForCustomer ? `pickup-wait-${o.id}` : undefined}
                                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-water-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-water-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
                                >
                                  {isUpdating && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                                  {isUpdating ? 'Updating...' : waitingForCustomer ? 'Waiting for customer' : STATUS_LABELS[nextAction]}
                                </button>
                              )}
                            </div>
                            {waitingForCustomer && (
                              <p id={`pickup-wait-${o.id}`} className="mt-2 text-xs text-amber-700">
                                The customer must confirm that the empty gallons are outside before pickup.
                              </p>
                            )}
                          </div>
                        )})}
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
