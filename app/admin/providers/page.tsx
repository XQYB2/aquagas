'use client'

import { useState, useMemo } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { ProviderStatusBadge } from '@/components/admin/AdminUI'
import { AddProviderModal } from '@/components/admin/AddProviderModal'
import {
  Search, CheckCircle, Ban, RefreshCw, X, Plus,
  Star, Phone, MapPin, ShoppingBag, Banknote, Droplets, Flame,
  ChevronDown, FileText,
} from 'lucide-react'
import type { AdminProvider } from '@/lib/admin-context'

type Tab = 'all' | 'pending' | 'active' | 'suspended'

export default function AdminProvidersPage() {
  const { providers, approveProvider, suspendProvider, reactivateProvider, getDocumentUrl } = useAdmin()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminProvider | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  async function viewDocument(path: string) {
    const url = await getDocumentUrl(path)
    if (url) window.open(url, '_blank')
    else alert('Could not load document.')
  }

  const counts = useMemo(() => ({
    all: providers.length,
    pending: providers.filter(p => p.status === 'pending').length,
    active: providers.filter(p => p.status === 'active').length,
    suspended: providers.filter(p => p.status === 'suspended').length,
  }), [providers])

  const filtered = useMemo(() => providers
    .filter(p => tab === 'all' || p.status === tab)
    .filter(p => !search ||
      p.store_name.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.date_registered).getTime() - new Date(a.date_registered).getTime()),
  [providers, tab, search])

  async function handleAction(id: string, action: 'approve' | 'suspend' | 'reactivate') {
    setActioning(id)
    await new Promise(r => setTimeout(r, 600))
    if (action === 'approve') approveProvider(id)
    else if (action === 'suspend') suspendProvider(id)
    else reactivateProvider(id)
    setActioning(null)
    // update selected if open
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: action === 'suspend' ? 'suspended' : 'active' } : null)
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'active', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Providers</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email…"
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400 w-52"
            />
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>
      </div>

      {showAddModal && <AddProviderModal onClose={() => setShowAddModal(false)} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
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
                {['Business', 'Owner', 'Service', 'Orders', 'Rating', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(p)} className="text-left">
                      <p className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">{p.store_name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{p.address}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{p.owner_name}</p>
                    <p className="text-xs text-gray-400">{p.owner_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                      p.service_type === 'water' ? 'bg-water-50 text-water-700' :
                      p.service_type === 'lpg' ? 'bg-lpg-50 text-lpg-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {p.service_type === 'water' ? '💧' : p.service_type === 'lpg' ? '🔥' : '💧🔥'}
                      {p.service_type === 'water' ? 'Water' : p.service_type === 'lpg' ? 'LPG' : 'Both'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.total_orders.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {p.rating > 0 ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-900">{p.rating.toFixed(1)}</span>
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(p.date_registered).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3"><ProviderStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {p.status === 'pending' && (
                        <button onClick={() => handleAction(p.id, 'approve')} disabled={actioning === p.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          {actioning === p.id ? '…' : <><CheckCircle className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                      )}
                      {p.status === 'active' && (
                        <button onClick={() => handleAction(p.id, 'suspend')} disabled={actioning === p.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          {actioning === p.id ? '…' : <><Ban className="w-3.5 h-3.5" /> Suspend</>}
                        </button>
                      )}
                      {p.status === 'suspended' && (
                        <button onClick={() => handleAction(p.id, 'reactivate')} disabled={actioning === p.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          {actioning === p.id ? '…' : <><RefreshCw className="w-3.5 h-3.5" /> Reactivate</>}
                        </button>
                      )}
                      <button onClick={() => setSelected(p)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No providers found.</td></tr>
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
              <h2 className="font-bold text-gray-900">{selected.store_name}</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status + action */}
              <div className="flex items-center justify-between">
                <ProviderStatusBadge status={selected.status} />
                <div className="flex gap-2">
                  {selected.status === 'pending' && (
                    <button onClick={() => { handleAction(selected.id, 'approve'); setSelected(p => p ? { ...p, status: 'active' } : null) }}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors">
                      ✓ Approve
                    </button>
                  )}
                  {selected.status === 'active' && (
                    <button onClick={() => { handleAction(selected.id, 'suspend'); setSelected(p => p ? { ...p, status: 'suspended' } : null) }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors">
                      Suspend
                    </button>
                  )}
                  {selected.status === 'suspended' && (
                    <button onClick={() => { handleAction(selected.id, 'reactivate'); setSelected(p => p ? { ...p, status: 'active' } : null) }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition-colors">
                      Reactivate
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <Row icon={<MapPin className="w-4 h-4 text-gray-400" />} label="Address" value={selected.address} />
                <Row icon={<Phone className="w-4 h-4 text-gray-400" />} label="Phone" value={selected.phone} />
                <Row icon={selected.service_type === 'lpg' ? <Flame className="w-4 h-4 text-lpg-500" /> : <Droplets className="w-4 h-4 text-water-500" />} label="Service Type" value={selected.service_type === 'both' ? 'Water & LPG' : selected.service_type === 'water' ? 'Water Refilling' : 'LPG Gas'} />
                <Row icon={<Banknote className="w-4 h-4 text-gray-400" />} label="Delivery Fee" value={`₱${selected.delivery_fee}`} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{selected.total_orders.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Orders</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">₱{selected.total_revenue > 0 ? (selected.total_revenue / 1000).toFixed(0) + 'k' : '0'}</p>
                  <p className="text-xs text-gray-400">Revenue</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{selected.rating > 0 ? selected.rating.toFixed(1) : '—'}</p>
                  <p className="text-xs text-gray-400">Rating</p>
                </div>
              </div>

              {/* Owner */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Owner</p>
                <p className="font-semibold text-gray-900">{selected.owner_name}</p>
                <p className="text-sm text-gray-500">{selected.owner_email}</p>
              </div>

              {/* Documents */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Submitted Documents
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Business Permit</span>
                    {selected.business_permit_url ? (
                      <button onClick={() => viewDocument(selected.business_permit_url!)} className="text-xs text-indigo-600 font-semibold hover:underline">View</button>
                    ) : <span className="text-xs text-gray-400">Not uploaded</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Owner Valid ID</span>
                    {selected.owner_id_url ? (
                      <button onClick={() => viewDocument(selected.owner_id_url!)} className="text-xs text-indigo-600 font-semibold hover:underline">View</button>
                    ) : <span className="text-xs text-gray-400">Not uploaded</span>}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Registered: {new Date(selected.date_registered).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )
}
