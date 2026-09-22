'use client'

import { useEffect, useMemo, useState } from 'react'
import { useProvider } from '@/lib/provider-context'
import { supabase } from '@/lib/supabase'
import { ArrowDownToLine, CheckCircle2, Clock3, Landmark, Loader2, QrCode, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'

type Payout = { id: string; amount: number; status: 'requested' | 'processing' | 'completed' | 'rejected'; requested_at: string; processed_at: string | null; reference_number: string | null; admin_note: string | null; payout_method: 'gcash' | 'bank' | null; account_name: string | null; account_number: string | null; bank_name: string | null }

const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export default function ProviderWalletPage() {
  const { store, orders } = useProvider()
  const [commissionRate, setCommissionRate] = useState(5)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [destination, setDestination] = useState({ method: 'gcash' as 'gcash' | 'bank', accountName: '', accountNumber: '', bankName: '' })

  async function loadWallet() {
    if (!store) return
    setLoading(true)
    const [settingsResult, payoutsResult] = await Promise.all([
      supabase.from('platform_settings').select('commission_rate').eq('id', 1).maybeSingle(),
      supabase.from('provider_payouts').select('id, amount, status, requested_at, processed_at, reference_number, admin_note, payout_method, account_name, account_number, bank_name').eq('provider_id', store.id).order('requested_at', { ascending: false }),
    ])
    if (settingsResult.data?.commission_rate != null) setCommissionRate(Number(settingsResult.data.commission_rate))
    if (payoutsResult.error) setMessage({ tone: 'error', text: 'Wallet records could not be loaded. Apply the latest database migration, then refresh.' })
    else setPayouts((payoutsResult.data || []).map((payout: any) => ({ ...payout, amount: Number(payout.amount) })))
    setLoading(false)
  }

  useEffect(() => { loadWallet() }, [store?.id])

  const wallet = useMemo(() => {
    const paidQr = orders.filter(order => order.payment_method === 'qrph' && order.payment_status === 'paid' && order.status !== 'cancelled')
    const deliveredGross = paidQr.filter(order => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total_amount), 0)
    const pendingGross = paidQr.filter(order => order.status !== 'delivered').reduce((sum, order) => sum + Number(order.total_amount), 0)
    const netEarned = deliveredGross * (1 - commissionRate / 100)
    const reserved = payouts.filter(payout => ['requested', 'processing', 'completed'].includes(payout.status)).reduce((sum, payout) => sum + payout.amount, 0)
    const completed = payouts.filter(payout => payout.status === 'completed').reduce((sum, payout) => sum + payout.amount, 0)
    return { available: Math.max(0, netEarned - reserved), pending: pendingGross * (1 - commissionRate / 100), deliveredGross, platformFee: deliveredGross * commissionRate / 100, completed }
  }, [orders, payouts, commissionRate])

  async function requestPayout() {
    if (wallet.available <= 0 || requesting) return
    if (!destination.accountName.trim() || !destination.accountNumber.trim() || (destination.method === 'bank' && !destination.bankName.trim())) {
      setMessage({ tone: 'error', text: 'Complete the payout destination before requesting a payout.' })
      return
    }
    setRequesting(true); setMessage(null)
    const { error } = await supabase.rpc('request_provider_payout', { p_payout_method: destination.method, p_account_name: destination.accountName.trim(), p_account_number: destination.accountNumber.trim(), p_bank_name: destination.method === 'bank' ? destination.bankName.trim() : null })
    if (error) setMessage({ tone: 'error', text: error.message || 'Payout request failed. Please try again.' })
    else { setMessage({ tone: 'success', text: 'Payout requested. AquaGas can now review and send your funds.' }); await loadWallet() }
    setRequesting(false)
  }

  return <div className="space-y-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-3xl font-black tracking-tight text-gray-950 dark:text-white">Wallet</h1><p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Track QR Ph payments collected by AquaGas and request your available provider payout.</p></div>
      <button onClick={loadWallet} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </header>

    {message && <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${message.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

    <section className="overflow-hidden rounded-[2rem] bg-gray-950 text-white shadow-xl shadow-gray-300/30 dark:border dark:border-gray-800">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:p-10">
        <div><div className="flex items-center gap-2 text-sm font-bold text-blue-300"><WalletCards className="h-5 w-5" />Available for payout</div><p className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">{loading ? '—' : peso(wallet.available)}</p><p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">Delivered QR Ph earnings after the {commissionRate}% AquaGas commission and previous payout requests.</p></div>
        <div className="flex flex-col justify-end"><p className="text-sm font-bold text-white">Request your full available balance</p><p className="mt-2 text-sm leading-6 text-gray-400">Choose where AquaGas should send the funds, then submit the payout request below.</p></div>
      </div>
      <div className="grid border-t border-white/10 sm:grid-cols-3">
        <WalletMetric icon={<Clock3 />} label="Pending delivery" value={peso(wallet.pending)} note="Paid orders not delivered yet" />
        <WalletMetric icon={<Landmark />} label="Paid out" value={peso(wallet.completed)} note="Completed provider payouts" />
        <WalletMetric icon={<ShieldCheck />} label="Platform fee" value={peso(wallet.platformFee)} note={`${commissionRate}% of delivered QR Ph sales`} />
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Payout destination</h2><p className="mt-1 text-sm text-gray-500">These details are saved with this request and shown only to payout administrators.</p></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Transfer method<select value={destination.method} onChange={event => setDestination(value => ({ ...value, method: event.target.value as 'gcash' | 'bank' }))} className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950"><option value="gcash">GCash</option><option value="bank">Bank transfer</option></select></label>
        {destination.method === 'bank' && <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Bank name<input value={destination.bankName} onChange={event => setDestination(value => ({ ...value, bankName: event.target.value }))} placeholder="Bank name" className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950" /></label>}
        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Account name<input value={destination.accountName} onChange={event => setDestination(value => ({ ...value, accountName: event.target.value }))} placeholder="Name registered to the account" className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950" /></label>
        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">{destination.method === 'gcash' ? 'GCash number' : 'Account number'}<input value={destination.accountNumber} onChange={event => setDestination(value => ({ ...value, accountNumber: event.target.value }))} inputMode="numeric" placeholder={destination.method === 'gcash' ? '09XXXXXXXXX' : 'Account number'} className="mt-1 h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950" /></label>
      </div>
      <button onClick={requestPayout} disabled={loading || requesting || wallet.available <= 0} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-water-600 px-5 font-bold text-white transition-colors hover:bg-water-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{requesting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}{requesting ? 'Requesting…' : `Request ${peso(wallet.available)}`}</button>
    </section>

    <section>
      <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black text-gray-950 dark:text-white">Payout history</h2><p className="mt-1 text-sm text-gray-500">Requests and transfer references from AquaGas.</p></div></div>
      {loading ? <div className="flex min-h-48 items-center justify-center rounded-2xl border border-gray-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-water-500" /></div> : payouts.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-800 dark:bg-gray-900"><QrCode className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-bold text-gray-900 dark:text-white">No payouts yet</p><p className="mt-1 text-sm text-gray-500">Your first request will appear here.</p></div> : <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">{payouts.map((payout, index) => <div key={payout.id} className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${index ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}><div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${payout.status === 'completed' ? 'bg-green-50 text-green-600' : payout.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{payout.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</span><div><p className="font-black text-gray-900 dark:text-white">{peso(payout.amount)}</p><p className="text-xs text-gray-500">Requested {new Date(payout.requested_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div></div><div className="sm:text-right"><span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-200">{payout.status}</span>{payout.reference_number && <p className="mt-1 text-xs text-gray-500">Ref: {payout.reference_number}</p>}</div></div>)}</div>}
    </section>
  </div>
}

function WalletMetric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <div className="border-white/10 p-5 first:border-0 sm:border-l sm:p-6"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-blue-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</div><p className="text-xs font-bold text-gray-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p><p className="mt-1 text-xs text-gray-500">{note}</p></div>
}
