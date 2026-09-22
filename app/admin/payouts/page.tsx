'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Clock3, Loader2, RefreshCw, Search, Send, WalletCards, XCircle } from 'lucide-react'

type Payout = { id: string; provider_id: string; provider_name: string; amount: number; status: 'requested' | 'processing' | 'completed' | 'rejected'; requested_at: string; processed_at: string | null; reference_number: string | null; admin_note: string | null; payout_method: 'gcash' | 'bank' | null; account_name: string | null; account_number: string | null; bank_name: string | null }
const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Payout['status']>('all')
  const [reference, setReference] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const [{ data: payoutRows, error: payoutError }, { data: providers }] = await Promise.all([
      supabase.from('provider_payouts').select('*').order('requested_at', { ascending: false }),
      supabase.from('providers').select('id, store_name'),
    ])
    if (payoutError) setError('Payout records could not be loaded. Apply the wallet migration and check admin access.')
    const names = new Map((providers || []).map((provider: any) => [provider.id, provider.store_name]))
    setPayouts((payoutRows || []).map((payout: any) => ({ ...payout, amount: Number(payout.amount), provider_name: names.get(payout.provider_id) || 'Provider' })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const visible = useMemo(() => payouts.filter(payout => filter === 'all' || payout.status === filter).filter(payout => !search.trim() || `${payout.provider_name} ${payout.reference_number || ''}`.toLowerCase().includes(search.toLowerCase())), [payouts, filter, search])
  const awaiting = payouts.filter(payout => payout.status === 'requested').reduce((sum, payout) => sum + payout.amount, 0)
  const processing = payouts.filter(payout => payout.status === 'processing').reduce((sum, payout) => sum + payout.amount, 0)
  const completed = payouts.filter(payout => payout.status === 'completed').reduce((sum, payout) => sum + payout.amount, 0)

  async function update(id: string, status: Payout['status']) {
    const ref = reference[id]?.trim()
    if (status === 'completed' && !ref) { setError('Enter the GCash or transfer reference before marking a payout completed.'); return }
    setWorking(id); setError('')
    const { error: updateError } = await supabase.from('provider_payouts').update({ status, processed_at: ['completed', 'rejected'].includes(status) ? new Date().toISOString() : null, reference_number: ref || null }).eq('id', id)
    if (updateError) setError(updateError.message)
    else await load()
    setWorking(null)
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black tracking-tight text-gray-950">Provider payouts</h1><p className="mt-2 text-sm text-gray-500">Settle QR Ph balances collected by AquaGas and record every transfer reference.</p></div><button onClick={load} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></header>
    {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
    <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white sm:grid-cols-3"><Metric label="Awaiting review" value={peso(awaiting)} icon={<Clock3 />} tone="text-amber-600 bg-amber-50" /><Metric label="Being processed" value={peso(processing)} icon={<Send />} tone="text-blue-600 bg-blue-50" /><Metric label="Completed payouts" value={peso(completed)} icon={<CheckCircle2 />} tone="text-green-600 bg-green-50" /></div>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search provider or reference" className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label><select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700"><option value="all">All statuses</option><option value="requested">Requested</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select></div>
    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center"><WalletCards className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-bold text-gray-900">No payout requests found</p></div> : <div className="space-y-3">{visible.map(payout => <article key={payout.id} className="rounded-2xl border border-gray-200 bg-white p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-black text-gray-950">{payout.provider_name}</h2><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold capitalize text-gray-700">{payout.status}</span></div><p className="mt-1 text-sm text-gray-500">Requested {new Date(payout.requested_at).toLocaleString('en-PH')}</p><p className="mt-3 text-2xl font-black text-gray-950">{peso(payout.amount)}</p>{payout.payout_method && <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-950"><p className="font-bold capitalize">{payout.payout_method === 'gcash' ? 'GCash' : payout.bank_name || 'Bank transfer'}</p><p className="mt-1">{payout.account_name} · {payout.account_number}</p></div>}</div><div className="w-full lg:max-w-md">{!['completed', 'rejected'].includes(payout.status) ? <><input value={reference[payout.id] || ''} onChange={event => setReference(values => ({ ...values, [payout.id]: event.target.value }))} placeholder="GCash / bank reference number" className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /><div className="mt-2 flex flex-wrap gap-2">{payout.status === 'requested' && <button onClick={() => update(payout.id, 'processing')} disabled={working === payout.id} className="min-h-10 rounded-xl bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100">Start processing</button>}<button onClick={() => update(payout.id, 'completed')} disabled={working === payout.id} className="min-h-10 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700">Mark paid</button><button onClick={() => update(payout.id, 'rejected')} disabled={working === payout.id} className="min-h-10 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"><XCircle className="mr-1 inline h-4 w-4" />Reject</button></div></> : <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{payout.reference_number ? <>Transfer reference: <strong>{payout.reference_number}</strong></> : 'No transfer reference recorded.'}</div>}</div></div></article>)}</div>}
  </div>
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) { return <div className="border-gray-100 p-5 first:border-0 sm:border-l"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone} [&>svg]:h-4 [&>svg]:w-4`}>{icon}</span><p className="mt-4 text-xs font-bold text-gray-500">{label}</p><p className="mt-1 text-xl font-black text-gray-950">{value}</p></div> }
