'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Bot, Mic, MicOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm AquaBot 👋 I can help you find water or LPG products, place orders, or answer any questions. How can I help you today?",
}

export function AquaBot() {
  const { user } = useAuth()
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

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? data.error ?? 'Sorry, something went wrong.',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          id="aquabot-panel"
          role="dialog"
          aria-labelledby="aquabot-title"
          className="fixed right-4 z-[60] bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+5.5rem)] md:bottom-24 w-[calc(100vw-2rem)] max-w-[360px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ maxHeight: 'calc(100dvh - var(--mobile-nav-height) - env(safe-area-inset-bottom, 0px) - 8rem)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-water-500 to-water-700 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p id="aquabot-title" className="text-white font-semibold text-sm leading-tight">AquaBot</p>
              <p className="text-water-100 text-xs leading-tight">AI Assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div aria-live="polite" className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-water-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.content}
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
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
            <label htmlFor="aquabot-message" className="sr-only">Message AquaBot</label>
            <input
              id="aquabot-message"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask me anything…'}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-water-300"
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
        className="fixed right-4 z-[60] bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] md:bottom-4 w-14 h-14 rounded-full bg-gradient-to-br from-water-600 to-water-700 text-white shadow-[0_10px_28px_rgba(2,132,199,0.32)] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-water-700"
        aria-label={open ? 'Close AquaBot' : 'Open AquaBot'}
        aria-expanded={open}
        aria-controls="aquabot-panel"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  )
}
