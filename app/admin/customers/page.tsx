'use client'

import { useState, useMemo } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { CustomerStatusBadge, exportToCsv } from '@/components/admin/AdminUI'
import { Search, Ban, RefreshCw, X, Phone, Mail, ShoppingBag, Banknote, Download } from 'lucide-react'
import type { AdminCustomer } from '@/lib/admin-context'

type Tab = 'all' | 'active' | 'suspended'

export default function AdminCustomersPage() {
  const { customers, orders, suspendCustomer, reactivateCustomer } = useAdmin()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminCustomer | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  const counts = useMemo(() => ({
    all: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    suspended: customers.filter(c => c.status === 'suspended').length,
  }), [customers])

  const filtered = useMemo(() => customers
    .filter(c => tab === 'all' || c.status === tab)
    .filter(c => !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
    .sort((a, b) => new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime()),
  [customers, tab, search])

  const customerOrders = useMemo(() =>
    selected ? orders.filter(o => o.customer_name === selected.full_name) : [],
  [selected, orders])

  async function handleAction(id: string, action: 'suspend' | 'reactivate') {
    setActioning(id)
    await new Promise(r => setTimeout(r, 500))
    action === 'suspend' ? suspendCustomer(id) : reactivateCustomer(id)
    setActioning(null)
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: action === 'suspend' ? 'suspended' : 'active' } : null)
    }
  }

  function handleExport() {
    exportToCsv('aquagas-customers.csv', filtered.map(c => ({
      Name: c.full_name, Email: c.email, Phone: c.phone,
      'Date Joined': new Date(c.date_joined).toLocaleDateString('en-PH'),
      'Total Orders': c.total_orders, 'Total Spent': c.total_spent,
      Status: c.status,
    })))
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return 'just now'
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, phone…"
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400 w-52"
            />
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Customer', 'Contact', 'Joined', 'Orders', 'Spent', 'Last Order', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(c)} className="text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 font-bold text-xs">{c.full_name[0]}</span>
                        </div>
                        <p className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors whitespace-nowrap">{c.full_name}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600 text-xs">{c.email}</p>
                    <p className="text-gray-400 text-xs">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(c.date_joined).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.total_orders}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₱{c.total_spent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {c.last_order_at ? timeAgo(c.last_order_at) : '—'}
                  </td>
                  <td className="px-4 py-3"><CustomerStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {c.status === 'active' ? (
                        <button onClick={() => handleAction(c.id, 'suspend')} disabled={actioning === c.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          {actioning === c.id ? '…' : <><Ban className="w-3 h-3" /> Suspend</>}
                        </button>
                      ) : (
                        <button onClick={() => handleAction(c.id, 'reactivate')} disabled={actioning === c.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          {actioning === c.id ? '…' : <><RefreshCw className="w-3 h-3" /> Reactivate</>}
                        </button>
                      )}
                      <button onClick={() => setSelected(c)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <span className="text-indigo-600 font-bold">{selected.full_name[0]}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selected.full_name}</p>
                  <CustomerStatusBadge status={selected.status} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Contact */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" /> {selected.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" /> {selected.phone}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{selected.total_orders}</p>
                  <p className="text-xs text-gray-400">Orders</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">₱{(selected.total_spent / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-gray-400">Spent</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {selected.total_orders > 0 ? Math.round(selected.total_spent / selected.total_orders) : 0}
                  </p>
                  <p className="text-xs text-gray-400">Avg Order</p>
                </div>
              </div>

              {/* Action */}
              <div>
                {selected.status === 'active' ? (
                  <button onClick={() => handleAction(selected.id, 'suspend')}
                    className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-sm transition-colors">
                    Suspend Account
                  </button>
                ) : (
                  <button onClick={() => handleAction(selected.id, 'reactivate')}
                    className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 font-semibold text-sm transition-colors">
                    Reactivate Account
                  </button>
                )}
              </div>

              {/* Order history */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order History</p>
                {customerOrders.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No orders found.</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs font-mono font-semibold text-indigo-600">#{o.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">{o.provider_name}</p>
                          <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-sm">₱{o.total_amount.toLocaleString()}</p>
                          <span className={`text-xs font-semibold ${o.status === 'delivered' ? 'text-green-600' : o.status === 'cancelled' ? 'text-red-500' : 'text-amber-600'}`}>
                            {o.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Member since {new Date(selected.date_joined).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
