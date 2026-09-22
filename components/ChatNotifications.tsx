'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'

type ChatNotice = {
  id: string
  order_id: string
  content: string
  created_at: string
}

type Props = {
  userId: string
  role: 'customer' | 'provider'
  orderIds?: string[]
}

function age(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

export function ChatNotifications({ userId, role, orderIds }: Props) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const channelIdRef = useRef(`chat-notifications-${role}-${userId}-${Math.random().toString(36).slice(2)}`)
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<ChatNotice[]>([])

  const load = useCallback(async () => {
    let ids = orderIds || []
    if (role === 'customer') {
      const { data } = await supabase.from('orders').select('id').eq('customer_id', userId)
      ids = (data || []).map(order => order.id)
    }
    if (!ids.length) { setNotices([]); return }

    const { data } = await supabase
      .from('order_messages')
      .select('id, order_id, content, created_at')
      .in('order_id', ids)
      .neq('sender_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotices((data || []) as ChatNotice[])
  }, [orderIds, role, userId])

  useEffect(() => {
    void load()
    const channel = supabase.channel(channelIdRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, () => void load())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [load, role, userId])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (open && !rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function openMessage(notice: ChatNotice) {
    await supabase.from('order_messages').update({ is_read: true }).eq('id', notice.id)
    setNotices(current => current.filter(item => item.id !== notice.id))
    setOpen(false)
    router.push(role === 'provider' ? `/provider/orders/${notice.order_id}` : `/orders/${notice.order_id}`)
  }

  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} aria-label={`Chat messages${notices.length ? `, ${notices.length} unread` : ''}`} className="relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-400">
      <MessageCircle className="h-5 w-5" />
      {notices.length > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notices.length > 9 ? '9+' : notices.length}</span>}
    </button>
    {open && createPortal(<div ref={panelRef} role="dialog" aria-label="Unread chat messages" className={`fixed right-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[100] w-[calc(100vw-1.5rem)] max-w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.18)] ${role === 'provider' ? 'md:left-[15.75rem] md:right-auto md:top-3' : 'md:top-16'}`}>
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div><p className="font-bold text-gray-900">Chat messages</p><p className="text-xs text-gray-500">{notices.length ? `${notices.length} unread` : 'No unread messages'}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close chat notifications" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"><X className="h-4 w-4" /></button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {notices.length === 0 ? <div className="flex items-center gap-3 px-3 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"><MessageCircle className="h-5 w-5" /></span><p className="text-sm font-medium text-gray-600">You are all caught up.</p></div> : notices.map(notice => <button key={notice.id} type="button" onClick={() => openMessage(notice)} className="mb-1 flex min-h-16 w-full items-center gap-3 rounded-xl bg-water-50 p-3 text-left hover:bg-water-100">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-water-600"><MessageCircle className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-water-700">Order #{notice.order_id.slice(-6).toUpperCase()}</span><span className="mt-0.5 block truncate text-sm text-gray-700">{notice.content}</span></span>
          <span className="text-[11px] font-semibold text-gray-400">{age(notice.created_at)}</span>
        </button>)}
      </div>
    </div>, document.body)}
  </div>
}
