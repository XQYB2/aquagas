'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react'

type Message = {
  id: string
  sender_id: string
  sender_role: 'customer' | 'provider'
  content: string
  created_at: string
}

type Props = {
  orderId: string
  currentUserId: string
  currentRole: 'customer' | 'provider'
  otherPartyName: string
  orderStatus: string
}

export function OrderChat({ orderId, currentUserId, currentRole, otherPartyName, orderStatus }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isClosed = orderStatus === 'delivered' || orderStatus === 'cancelled'

  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('order_messages')
        .select('id, sender_id, sender_role, content, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    loadMessages()

    const channel = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${orderId}`,
      }, payload => {
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
        if (!open && msg.sender_id !== currentUserId) {
          setUnread(n => n + 1)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId, currentUserId, open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [open, messages.length])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending || isClosed) return
    setSending(true)
    setInput('')
    await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_id: currentUserId,
      sender_role: currentRole,
      content: text,
    })
    setSending(false)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-water-500 hover:bg-water-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ maxHeight: '480px' }}>
          {/* Header */}
          <div className="bg-water-500 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-white/80" />
              <div>
                <p className="text-white font-semibold text-sm">{otherPartyName}</p>
                <p className="text-white/70 text-xs">{isClosed ? 'Chat closed' : 'Online'}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No messages yet. Say hello!</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-water-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {isClosed ? (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">This order is {orderStatus} — chat is closed.</p>
            </div>
          ) : (
            <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
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
          )}
        </div>
      )}
    </>
  )
}
