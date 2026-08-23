'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, Check, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react'

type Message = {
  id: string
  order_id: string
  sender_id: string
  sender_role: 'customer' | 'provider'
  content: string
  created_at: string
  is_read: boolean
}

type Props = {
  orderId: string
  currentUserId: string
  currentRole: 'customer' | 'provider'
  otherPartyName: string
  orderStatus: string
}

const TYPING_TIMEOUT = 3000

export function OrderChat({ orderId, currentUserId, currentRole, otherPartyName, orderStatus }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [isOtherOnline, setIsOtherOnline] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isClosed = orderStatus === 'delivered' || orderStatus === 'cancelled'
  const otherRole = currentRole === 'customer' ? 'provider' : 'customer'

  // Mark incoming messages as read
  const markAsRead = useCallback(async (msgIds: string[]) => {
    if (msgIds.length === 0) return
    await supabase
      .from('order_messages')
      .update({ is_read: true })
      .in('id', msgIds)
      .neq('sender_id', currentUserId)
  }, [currentUserId])

  useEffect(() => {
    // Load messages
    async function loadMessages() {
      const { data } = await supabase
        .from('order_messages')
        .select('id, order_id, sender_id, sender_role, content, created_at, is_read')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      if (data) {
        setMessages(data)
        // Mark unread messages from other party as read
        const unread = data.filter(m => m.sender_id !== currentUserId && !m.is_read).map(m => m.id)
        markAsRead(unread)
      }
    }
    loadMessages()

    // Realtime: new messages — no filter, client-side filter instead
    const msgChannel = supabase
      .channel(`chat-messages-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
      }, payload => {
        const msg = payload.new as Message
        if (msg.order_id !== orderId) return
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        if (msg.sender_id !== currentUserId) {
          if (open) {
            markAsRead([msg.id])
          } else {
            setUnread(n => n + 1)
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'order_messages',
      }, payload => {
        const updated = payload.new as Message
        if (updated.order_id !== orderId) return
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m))
      })
      .subscribe(status => {
        console.log('[OrderChat] realtime status:', status)
      })

    // Presence channel: typing + online status
    const presenceChannel = supabase.channel(`chat-presence-${orderId}`, {
      config: { presence: { key: currentUserId } },
    })
    presenceChannelRef.current = presenceChannel

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const otherOnline = Object.keys(state).some(k => k !== currentUserId)
        setIsOtherOnline(otherOnline)
      })
      .on('broadcast', { event: 'typing' }, payload => {
        if (payload.payload?.userId !== currentUserId) {
          setOtherTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT)
        }
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ userId: currentUserId, role: currentRole })
        }
      })

    return () => {
      supabase.removeChannel(msgChannel)
      presenceChannel.untrack()
      supabase.removeChannel(presenceChannel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [orderId, currentUserId, currentRole, markAsRead, open])

  // Auto-scroll to bottom when open
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, otherTyping, open])

  // Mark as read when opened
  useEffect(() => {
    if (open && messages.length > 0) {
      setUnread(0)
      const unreadIds = messages.filter(m => m.sender_id !== currentUserId && !m.is_read).map(m => m.id)
      markAsRead(unreadIds)
    }
  }, [open])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    // Broadcast typing event
    presenceChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId },
    })
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending || isClosed) return
    setSending(true)
    setInput('')
    const { data, error } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_id: currentUserId,
      sender_role: currentRole,
      content: text,
      is_read: false,
    }).select()
    console.log('[OrderChat] insert result:', data, 'error:', error)
    if (!error && data?.[0]) {
      setMessages(prev => prev.some(m => m.id === data[0].id) ? prev : [...prev, data[0]])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }

  // Get status label for my sent messages (last message only)
  function getMessageStatus(msg: Message, index: number) {
    if (msg.sender_id !== currentUserId) return null
    const isLast = index === messages.length - 1 || messages.slice(index + 1).every(m => m.sender_id !== currentUserId)
    if (!isLast) return null

    if (msg.is_read) {
      return (
        <span className="flex items-center gap-0.5 text-[10px] text-water-400 font-medium">
          <CheckCheck className="w-3 h-3" /> Seen
        </span>
      )
    }
    if (isOtherOnline) {
      return (
        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
          <CheckCheck className="w-3 h-3" /> Delivered
        </span>
      )
    }
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-gray-300">
        <Check className="w-3 h-3" /> Sent
      </span>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="relative">
          <div className="w-8 h-8 bg-water-50 rounded-full flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-water-500" />
          </div>
          {isOtherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 text-sm">Chat with {otherPartyName}</h2>
            {unread > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            {otherTyping ? (
              <span className="text-water-500 font-medium">typing…</span>
            ) : isOtherOnline ? (
              <span className="text-green-500">Online</span>
            ) : (
              'Offline'
            )}
          </p>
        </div>
        {isClosed && (
          <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full mr-2">
            Closed
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Messages + input — only shown when open */}
      {open && <div className="border-t border-gray-100" />}
      {open && <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <MessageCircle className="w-7 h-7 text-gray-200" />
            <p className="text-xs text-gray-400 text-center">
              No messages yet.<br />Start the conversation!
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId
          const status = getMessageStatus(msg, i)
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-water-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                  {status}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>}

      {open && (isClosed ? (
        <div className="px-4 py-3 border-t border-gray-100 text-center bg-white">
          <p className="text-xs text-gray-400">Chat is closed for {orderStatus} orders.</p>
        </div>
      ) : (
        <div className="px-3 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-300"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-9 h-9 bg-water-500 hover:bg-water-600 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
