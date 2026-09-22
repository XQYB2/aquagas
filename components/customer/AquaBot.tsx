'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Bot, Mic, MicOff, Sparkles, ShoppingCart, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'

type Message = {
  role: 'user' | 'assistant'
  content: string
  cartAction?: CartRecommendation | null
  cartStatus?: 'added'
}

type CartRecommendation = {
  product_id: string
  product_name: string
  price: number
  unit: string
  category: 'water' | 'lpg'
  provider_id: string
  provider_name: string
  delivery_fee: number
}

const SUGGESTIONS = [
  'Track my latest order',
  'Find water stores nearby',
  'Recommend affordable water',
  'What payment methods can I use?',
]

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm AquaBot. I can help you find water or LPG products, place orders, or answer questions. How can I help you today?",
}

export function AquaBot() {
  const { user } = useAuth()
  const { state: cart, dispatch } = useCart()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setHasSpeech(!!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    ))
  }, [])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      requestAnimationFrame(() => triggerRef.current?.focus())
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-PH'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
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

  function addRecommendationToCart(action: CartRecommendation, messageIndex: number) {
    if (!user) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in first so I can add this product to your cart.',
      }])
      return
    }

    if (cart.provider_id && cart.provider_id !== action.provider_id) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Your cart already contains items from ${cart.provider_name}. Clear it first before adding a product from ${action.provider_name}.`,
      }])
      return
    }

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: `cart-${action.product_id}`,
        product_id: action.product_id,
        name: action.product_name,
        price: action.price,
        quantity: 1,
        max_quantity: 99,
        unit: action.unit,
        category: action.category,
        provider_id: action.provider_id,
        provider_name: action.provider_name,
        delivery_fee: action.delivery_fee,
      },
    })

    setMessages(prev => prev.map((message, index) =>
      index === messageIndex ? { ...message, cartStatus: 'added' } : message
    ))
  }

  async function submitMessage(value: string) {
    const text = value.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, userId: user?.id }),
      })
      const data = await res.json()
      const recommendation = data.cartAction as CartRecommendation | undefined
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? data.error ?? 'Sorry, something went wrong.',
        cartAction: recommendation?.product_id ? recommendation : null,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    void submitMessage(input)
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          id="aquabot-panel"
          role="dialog"
          aria-labelledby="aquabot-title"
          className="fixed right-3 sm:right-6 z-[60] bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+5.5rem)] md:bottom-28 w-[calc(100vw-1.5rem)] sm:w-[440px] lg:w-[480px] flex flex-col rounded-[1.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ height: 'min(650px, calc(100dvh - var(--mobile-nav-height) - env(safe-area-inset-bottom, 0px) - 8rem))', maxHeight: 'calc(100dvh - var(--mobile-nav-height) - env(safe-area-inset-bottom, 0px) - 8rem)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-water-500 to-water-700 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p id="aquabot-title" className="text-white font-bold text-base leading-tight">AquaBot</p>
              <p className="text-water-100 text-sm leading-tight">Your AquaGas assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div aria-live="polite" className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 dark:bg-gray-800 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[86%]">
                  <div className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-water-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.content}
                  </div>
                  {msg.cartAction && (
                    <button
                      type="button"
                      onClick={() => addRecommendationToCart(msg.cartAction!, i)}
                      disabled={msg.cartStatus === 'added'}
                      className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-water-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 active:translate-y-px disabled:cursor-default disabled:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
                    >
                      {msg.cartStatus === 'added' ? (
                        <><Check className="h-4 w-4" aria-hidden="true" /> Added to cart</>
                      ) : (
                        <><ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add {msg.cartAction.product_name} to cart</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 text-water-400 animate-spin" />
                </div>
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div className="pt-1">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Sparkles className="h-3.5 w-3.5 text-water-500" /> Try asking
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submitMessage(suggestion)}
                      className="min-h-10 rounded-full border border-water-200 bg-white px-3 py-2 text-left text-xs font-semibold text-water-700 transition-colors hover:border-water-400 hover:bg-water-50 dark:border-gray-600 dark:bg-gray-700 dark:text-water-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-2 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
            <label htmlFor="aquabot-message" className="sr-only">Message AquaBot</label>
            <input
              id="aquabot-message"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask me anything…'}
              className="h-12 flex-1 min-w-0 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-water-300"
              disabled={loading || listening}
            />
            {hasSpeech && (
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                disabled={loading}
                aria-label={listening ? 'Stop recording' : 'Voice input'}
                className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 ${
                  listening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="w-11 h-11 shrink-0 rounded-xl bg-water-700 hover:bg-sky-800 text-white flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className="fixed right-4 sm:right-6 z-[60] bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] md:bottom-6 w-16 h-16 rounded-full bg-gradient-to-br from-water-600 to-water-700 text-white shadow-[0_12px_32px_rgba(2,132,199,0.36)] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-water-700"
        aria-label={open ? 'Close AquaBot' : 'Open AquaBot'}
        aria-expanded={open}
        aria-controls="aquabot-panel"
      >
        {open ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
      </button>
    </>
  )
}
