'use client'

import { useState, useMemo } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { OrderStatusBadge, exportToCsv } from '@/components/admin/AdminUI'
import { Search, X, AlertTriangle, Download, Droplets, Flame, Phone, MapPin } from 'lucide-react'
import type { AdminOrder } from '@/lib/admin-context'

type StatusFilter = 'all' | 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
type ServiceFilter = 'all' | 'water' | 'lpg'

export default function AdminOrdersPage() {
  const { orders, providers, forceCancelOrder } = useAdmin()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [cancelNote, setCancelNote] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'placed', label: 'New' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'out_for_delivery', label: 'On the Way' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const activeProviders = useMemo(() => providers.filter(p => p.status === 'active'), [providers])

  const filtered = useMemo(() => orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => serviceFilter === 'all' || o.service_type === serviceFilter)
    .filter(o => providerFilter === 'all' || o.provider_id === providerFilter)
    .filter(o => !search ||
      o.id.includes(search) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.provider_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [orders, statusFilter, serviceFilter, providerFilter, search])

  async function handleForceCancel() {
    if (!selected || !cancelNote.trim()) return
    setCancelling(true)
    await new Promise(r => setTimeout(r, 600))
    forceCancelOrder(selected.id, cancelNote)
    setSelected(prev => prev ? { ...prev, status: 'cancelled', admin_note: cancelNote } : null)
    setCancelling(false)
    setShowCancelModal(false)
    setCancelNote('')
  }

  function handleExport() {
    exportToCsv('aquagas-orders.csv', filtered.map(o => ({
      'Order ID': o.id, Customer: o.customer_name, Provider: o.provider_name,
      Service: o.service_type, Items: o.items_summary, Total: o.total_amount,
      Status: o.status, Date: new Date(o.created_at).toLocaleDateString('en-PH'),
    })))
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">All Orders</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Order ID, customer…"
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400 w-48"
            />
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === t.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Service type */}
        <div className="flex gap-1.5 ml-auto">
          {(['all', 'water', 'lpg'] as ServiceFilter[]).map(s => (
            <button key={s} onClick={() => setServiceFilter(s)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                serviceFilter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {s === 'water' && <Droplets className="w-3 h-3" />}
              {s === 'lpg' && <Flame className="w-3 h-3" />}
              {s === 'all' ? 'All Types' : s === 'water' ? 'Water' : 'LPG'}
            </button>
          ))}
        </div>

        {/* Provider filter */}
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="all">All Providers</option>
          {activeProviders.map(p => <option key={p.id} value={p.id}>{p.store_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Order', 'Customer', 'Provider', 'Items', 'Total', 'Status', 'Time', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(order)} className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                      #{order.id.slice(-6).toUpperCase()}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.customer_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap max-w-[120px] truncate">{order.provider_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{order.items_summary}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">₱{order.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{timeAgo(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelected(order)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors">
                        Details
                      </button>
                      {!['delivered', 'cancelled'].includes(order.status) && (
                        <button onClick={() => { setSelected(order); setShowCancelModal(true) }}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-colors">
                          Force Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No orders match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selected && !showCancelModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <p className="font-bold text-gray-900">Order #{selected.id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-gray-400">{new Date(selected.created_at).toLocaleString('en-PH')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <OrderStatusBadge status={selected.status} />

              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
                <p className="font-semibold text-gray-900">{selected.customer_name}</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{selected.customer_phone}</div>
                <div className="flex items-start gap-1.5 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{selected.delivery_address}</div>
                {selected.notes && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1">📝 {selected.notes}</p>}
              </div>

              {/* Provider */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Provider</p>
                <p className="font-semibold text-gray-900">{selected.provider_name}</p>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold mt-1 ${selected.service_type === 'water' ? 'bg-water-50 text-water-700' : 'bg-lpg-50 text-lpg-700'}`}>
                  {selected.service_type === 'water' ? <Droplets className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                  {selected.service_type === 'water' ? 'Water' : 'LPG Gas'}
                </span>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                <p className="text-sm text-gray-700">{selected.items_summary}</p>
                <div className="mt-3 flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="text-sm text-gray-500">Delivery Fee</span>
                  <span className="text-sm text-gray-700">₱{selected.delivery_fee}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900 text-lg">₱{selected.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Admin note */}
              {selected.admin_note && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Admin Note</p>
                  <p className="text-sm text-red-700">{selected.admin_note}</p>
                </div>
              )}

              {/* Force cancel */}
              {!['delivered', 'cancelled'].includes(selected.status) && (
                <button onClick={() => setShowCancelModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-sm transition-colors">
                  <AlertTriangle className="w-4 h-4" /> Force Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Force Cancel Modal */}
      {showCancelModal && selected && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Force Cancel Order</h3>
                <p className="text-xs text-gray-400">#{selected.id.slice(-6).toUpperCase()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">This will cancel the order and notify both the customer and provider. Please provide a reason.</p>
            <textarea
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder="Reason for cancellation (required)…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none placeholder:text-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelModal(false); setCancelNote('') }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button onClick={handleForceCancel} disabled={!cancelNote.trim() || cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
