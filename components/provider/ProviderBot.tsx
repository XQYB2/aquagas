'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useProvider } from '@/lib/provider-context'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm your store assistant 👋 I can summarize today's orders, check revenue, list pending deliveries, or help with anything about your store. What do you need?",
}

const SUGGESTIONS = [
  "Summarize today's orders",
  'How many pending orders?',
  "What's my revenue today?",
  'Which orders are out for delivery?',
]

export function ProviderBot() {
  const { store, orders, products } = useProvider()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)
  const [dark, setDark] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setHasSpeech(!!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    ))
    // detect system dark mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, open])

  // stop speech when closing
  useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel()
      setSpeakingIdx(null)
    }
  }, [open])

  function buildStoreContext() {
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
    const revenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0)
    const byStatus: Record<string, number> = {}
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1

    return {
      storeName: store?.store_name,
      storeOpen: store?.is_open,
      serviceType: store?.service_type,
      totalOrdersToday: todayOrders.length,
      revenueToday: revenue,
      totalOrders: orders.length,
      ordersByStatus: byStatus,
      products: products.map((p: any) => ({
        name: p.name, price: p.price, unit: p.unit,
        available: p.is_available, category: p.category,
      })),
      recentOrders: orders.slice(0, 10).map((o: any) => ({
        id: o.id?.slice(-6)?.toUpperCase(),
        status: o.status, amount: o.total_amount,
        customer: o.customer?.full_name || o.customer?.email,
        address: o.delivery_address,
        paymentMethod: o.payment_method, deliveryType: o.delivery_type,
      })),
    }
  }

  function speakMessage(text: string, idx: number) {
    if (speakingIdx === idx) {
      window.speechSynthesis?.cancel()
      setSpeakingIdx(null)
      return
    }
    window.speechSynthesis?.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-PH'
    utter.rate = 1.0
    utter.onend = () => setSpeakingIdx(null)
    utter.onerror = () => setSpeakingIdx(null)
    utteranceRef.current = utter
    setSpeakingIdx(idx)
    window.speechSynthesis.speak(utter)
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-PH'
    recognition.interimResults = false
    recognition.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false) }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  async function sendMessage(text?: string, e?: React.FormEvent) {
    e?.preventDefault()
    const content = (text ?? input).trim()
    if (!content || loading) return
    const userMsg: Message = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/provider-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, storeContext: buildStoreContext() }),
      })
      const data = await res.json()
      const reply = data.reply ?? data.error ?? 'Sorry, something went wrong.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const showSuggestions = messages.length === 1 && !loading

  const d = dark
  const bg = d ? '#0f172a' : '#ffffff'
  const msgBg = d ? '#1e293b' : '#f8fafc'
  const border = d ? '#1e3a5f' : '#dbeafe'
  const bubbleBotBg = d ? '#1e293b' : '#ffffff'
  const bubbleBotBorder = d ? '#334155' : '#e2e8f0'
  const bubbleText = d ? '#e2e8f0' : '#1e293b'
  const inputBg = d ? '#1e293b' : '#ffffff'
  const inputBorder = d ? '#334155' : '#bfdbfe'
  const inputText = d ? '#e2e8f0' : '#1e293b'
  const chipBg = d ? 'rgba(37,99,235,0.2)' : '#eff6ff'
  const chipBorder = d ? '#1d4ed8' : '#bfdbfe'
  const chipText = d ? '#93c5fd' : '#1d4ed8'
  const inputBarBg = d ? '#0f172a' : '#ffffff'
  const inputBarBorder = d ? '#1e3a5f' : '#dbeafe'

  return (
    <>
      {open && (
        <div
          className="fixed right-4 z-50 bottom-36 md:bottom-24 w-[calc(100vw-2rem)] max-w-[360px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: 'calc(100dvh - 10rem)', border: `1px solid ${border}`, background: bg }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0284c7)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Store Assistant</p>
              <p className="text-blue-100 text-xs leading-tight">{store?.store_name || 'Your store'}</p>
            </div>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(d => !d)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <span className="text-white text-xs">{dark ? '☀️' : '🌙'}</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ background: msgBg }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' ? (
                  <div className="flex items-end gap-1 max-w-[90%]">
                    <div
                      className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed whitespace-pre-wrap shadow-sm"
                      style={{ background: bubbleBotBg, color: bubbleText, border: `1px solid ${bubbleBotBorder}` }}
                    >
                      {msg.content}
                    </div>
                    {/* Speak button */}
                    <button
                      onClick={() => speakMessage(msg.content, i)}
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors mb-0.5"
                      style={{ background: speakingIdx === i ? '#0284c7' : (d ? '#334155' : '#e2e8f0') }}
                      title={speakingIdx === i ? 'Stop' : 'Speak'}
                    >
                      {speakingIdx === i
                        ? <VolumeX className="w-3 h-3 text-white" />
                        : <Volume2 className="w-3 h-3" style={{ color: d ? '#94a3b8' : '#64748b' }} />
                      }
                    </button>
                  </div>
                ) : (
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap text-white"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #0284c7)' }}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm" style={{ background: bubbleBotBg, border: `1px solid ${bubbleBotBorder}` }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#0284c7' }} />
                </div>
              </div>
            )}
            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs rounded-full px-3 py-1 transition-colors font-semibold"
                    style={{ background: chipBg, color: chipText, border: `1px solid ${chipBorder}` }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={e => sendMessage(undefined, e)}
            className="flex items-center gap-2 p-3 shrink-0"
            style={{ background: inputBarBg, borderTop: `1px solid ${inputBarBorder}` }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask about your store…'}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{
                background: inputBg, color: inputText,
                border: `1px solid ${inputBorder}`,
                '--tw-ring-color': '#93c5fd',
              } as any}
              disabled={loading || listening}
            />
            {hasSpeech && (
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                disabled={loading}
                className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 ${
                  listening ? 'animate-pulse' : ''
                }`}
                style={{ background: listening ? '#dc2626' : (d ? '#334155' : '#e2e8f0') }}
              >
                {listening
                  ? <MicOff className="w-4 h-4 text-white" />
                  : <Mic className="w-4 h-4" style={{ color: d ? '#94a3b8' : '#64748b' }} />
                }
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 shrink-0 rounded-xl text-white flex items-center justify-center transition-colors disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0284c7)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-4 z-50 bottom-20 md:bottom-6 w-14 h-14 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1d4ed8, #0284c7)', boxShadow: '0 4px 20px rgba(2,132,199,0.5)' }}
        aria-label="Open Store Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>
    </>
  )
}
