'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Bell, CheckCircle2, Clock3, CreditCard, Package, ShieldCheck, Truck, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Notice = { id: string; status: string; updated_at: string; total_amount: number; provider_name: string }
type ReadVersions = Record<string, string>

const statusInfo: Record<string, { label: string; icon: typeof Package; tone: string }> = {
  placed: { label: 'Order placed', icon: CheckCircle2, tone: 'bg-indigo-100 text-indigo-700' },
  confirmed: { label: 'Order confirmed', icon: ShieldCheck, tone: 'bg-blue-100 text-blue-700' },
  awaiting_pickup: { label: 'Awaiting pickup', icon: Clock3, tone: 'bg-amber-100 text-amber-700' },
  picked_up: { label: 'Gallons picked up', icon: Package, tone: 'bg-cyan-100 text-cyan-700' },
  being_prepared: { label: 'Being prepared', icon: Package, tone: 'bg-yellow-100 text-yellow-800' },
  out_for_delivery: { label: 'Out for delivery', icon: Truck, tone: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Order delivered', icon: CheckCircle2, tone: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Order cancelled', icon: XCircle, tone: 'bg-red-100 text-red-700' },
  pending_payment: { label: 'Payment pending', icon: CreditCard, tone: 'bg-amber-100 text-amber-700' },
}

function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationOverlay({ userId }: { userId: string }) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [readVersions, setReadVersions] = useState<ReadVersions>({})
  const [legacyReadAt, setLegacyReadAt] = useState('1970-01-01T00:00:00.000Z')
  const storageKey = `aquagas-notification-versions-${userId}`

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, updated_at, total_amount, providers(store_name)')
      .eq('customer_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20)
    setNotices((data || []).map((order: any) => ({
      id: order.id,
      status: order.status,
      updated_at: order.updated_at,
      total_amount: Number(order.total_amount || 0),
      provider_name: order.providers?.store_name || 'Store',
    })))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    try { setReadVersions(JSON.parse(localStorage.getItem(storageKey) || '{}')) } catch { setReadVersions({}) }
    setLegacyReadAt(localStorage.getItem(`aquagas-notifications-read-${userId}`) || '1970-01-01T00:00:00.000Z')
    void load()
    const channel = supabase.channel(`notification-overlay-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` }, () => void load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` }, () => void load())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [load, storageKey, userId])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (open && rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape) }
  }, [open])

  const isUnread = (notice: Notice) => readVersions[notice.id]
    ? readVersions[notice.id] !== notice.updated_at
    : new Date(notice.updated_at).getTime() > new Date(legacyReadAt).getTime()
  const unreadCount = notices.filter(isUnread).length

  function openNotice(notice: Notice) {
    if (isUnread(notice)) {
      const next = { ...readVersions, [notice.id]: notice.updated_at }
      setReadVersions(next)
      localStorage.setItem(storageKey, JSON.stringify(next))
    }
    setOpen(false)
    router.push(`/orders/${notice.id}`)
  }

  return <div ref={rootRef} className="relative">
    <button
      type="button"
      onClick={() => setOpen(value => !value)}
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-400 dark:hover:bg-gray-800"
    >
      <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      {unreadCount > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>

    {open && <div role="dialog" aria-label="Notifications" className="fixed inset-x-3 top-20 z-[70] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-[26rem] dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div><p className="font-extrabold text-gray-900 dark:text-white">Notifications</p><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p></div>
      </div>
      <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-2">
        {loading ? <p className="px-4 py-10 text-center text-sm text-gray-500">Loading notifications…</p> : notices.length === 0 ? <div className="px-5 py-12 text-center"><Bell className="mx-auto h-8 w-8 text-gray-300" /><p className="mt-3 text-sm font-bold text-gray-700 dark:text-gray-200">No notifications yet</p></div> : notices.map(notice => {
          const info = statusInfo[notice.status] || { label: notice.status, icon: AlertCircle, tone: 'bg-gray-100 text-gray-700' }
          const Icon = info.icon
          const unread = isUnread(notice)
          return <button key={`${notice.id}-${notice.updated_at}`} type="button" onClick={() => openNotice(notice)} className={`mb-2 flex w-full min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition-colors last:mb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-400 ${unread ? 'border-water-200 bg-water-50 hover:bg-water-100 dark:border-water-800 dark:bg-water-950/40' : 'border-transparent bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${info.tone}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className={`truncate text-sm ${unread ? 'font-extrabold text-gray-950 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>{info.label}</span>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-water-500" aria-label="Unread" />}</span><span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{notice.provider_name} · ₱{notice.total_amount.toFixed(0)}</span></span>
            <span className="shrink-0 text-[11px] font-semibold text-gray-400">{timeAgo(notice.updated_at)}</span>
          </button>
        })}
      </div>
    </div>}
  </div>
}
