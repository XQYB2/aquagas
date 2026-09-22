'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, BellOff, CheckCircle2, Clock3, CreditCard, Package, ShieldCheck, Truck, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type OrderNotice = { id: string; status: string; updated_at: string; total_amount: number; provider_name: string }

const statusInfo: Record<string, { label: string; icon: typeof Package; tone: string }> = {
  placed: { label: 'Order placed', icon: CheckCircle2, tone: 'bg-indigo-50 text-indigo-600' },
  confirmed: { label: 'Order confirmed', icon: ShieldCheck, tone: 'bg-blue-50 text-blue-600' },
  awaiting_pickup: { label: 'Awaiting pickup', icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
  picked_up: { label: 'Gallons picked up', icon: Package, tone: 'bg-cyan-50 text-cyan-600' },
  being_prepared: { label: 'Being prepared', icon: Package, tone: 'bg-yellow-50 text-yellow-700' },
  out_for_delivery: { label: 'Out for delivery', icon: Truck, tone: 'bg-orange-50 text-orange-600' },
  delivered: { label: 'Order delivered', icon: CheckCircle2, tone: 'bg-green-50 text-green-600' },
  cancelled: { label: 'Order cancelled', icon: XCircle, tone: 'bg-red-50 text-red-600' },
  pending_payment: { label: 'Payment pending', icon: CreditCard, tone: 'bg-amber-50 text-amber-600' },
}

function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notices, setNotices] = useState<OrderNotice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('orders').select('id, status, updated_at, total_amount, providers(store_name)').eq('customer_id', user.id).order('updated_at', { ascending: false }).limit(50).then(({ data }) => {
      setNotices((data || []).map((order: any) => ({ id: order.id, status: order.status, updated_at: order.updated_at, total_amount: order.total_amount, provider_name: order.providers?.store_name || 'Store' })))
      setLoading(false)
    })
  }, [user])

  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-8"><h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Notifications</h1><p className="mt-2 text-base text-gray-500">Recent activity from your AquaGas orders.</p></div>
    {loading ? <div className="py-20 text-center text-gray-400">Loading notifications…</div> : notices.length === 0 ? <div className="rounded-3xl border border-gray-200 bg-white py-20 text-center"><BellOff className="mx-auto h-12 w-12 text-gray-300" /><h2 className="mt-4 text-lg font-bold text-gray-900">No notifications yet</h2><p className="mt-1 text-sm text-gray-500">Your order updates will appear here.</p></div> : <div className="space-y-3">{notices.map(notice => { const info = statusInfo[notice.status] || { label: notice.status, icon: AlertCircle, tone: 'bg-gray-100 text-gray-600' }; const Icon = info.icon; return <Link href={`/orders/${notice.id}`} key={notice.id} className="flex min-h-24 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-water-200 hover:shadow-md"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${info.tone}`}><Icon className="h-6 w-6" /></span><span className="min-w-0 flex-1"><span className="block font-bold text-gray-900">{info.label}</span><span className="mt-1 block truncate text-sm text-gray-500">{notice.provider_name} · ₱{Number(notice.total_amount || 0).toFixed(0)}</span></span><span className="text-xs font-semibold text-gray-400">{timeAgo(notice.updated_at)}</span></Link> })}</div>}
  </div>
}
