'use client'

import { useEffect, useState } from 'react'
import { X, ChevronRight, ChevronLeft, LayoutDashboard, ShoppingBag, Package, Map, Sparkles, Bell, Settings, Wallet, CalendarClock, CheckCircle } from 'lucide-react'

const STEPS = [
  {
    icon: LayoutDashboard,
    color: 'from-blue-500 to-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Dashboard',
    desc: 'Your command center. See today\'s order count, revenue, and toggle your store open or closed in one tap.',
    tip: 'Keep your store open during operating hours so customers can place orders.',
  },
  {
    icon: ShoppingBag,
    color: 'from-violet-500 to-violet-700',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    title: 'Managing Orders',
    desc: 'New orders appear here with a badge. Confirm, prepare, dispatch, and mark delivered — each step notifies the customer automatically.',
    tip: 'Tap an order to see the customer\'s pin location on a map and their contact details.',
  },
  {
    icon: Package,
    color: 'from-amber-500 to-amber-700',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Products',
    desc: 'Add your water containers, LPG tanks, and any other products. Set prices, units, and toggle availability anytime.',
    tip: 'Mark a product unavailable instead of deleting it — you can re-enable it later.',
  },
  {
    icon: Map,
    color: 'from-green-500 to-green-700',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Delivery Map',
    desc: 'See all active deliveries on a live map. Select stops and tap Route to open Google Maps with multi-stop navigation.',
    tip: 'Set your store location in Settings first so the 15km delivery radius works correctly.',
  },
  {
    icon: Wallet,
    color: 'from-emerald-500 to-emerald-700',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'GCash Payments',
    desc: 'Connect your Konfirma account to accept GCash payments. Customers can pay digitally — funds go straight to your wallet.',
    tip: 'You can accept both Cash on Delivery and GCash at the same time.',
  },
  {
    icon: CalendarClock,
    color: 'from-cyan-500 to-cyan-700',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    title: 'Batch Delivery Slots',
    desc: 'Schedule fixed delivery windows (e.g. Mon 8AM, Wed 2PM). Customers opt in for free delivery — you deliver multiple orders in one trip.',
    tip: 'Batch deliveries save fuel and time — great for high-volume areas.',
  },
  {
    icon: Sparkles,
    color: 'from-indigo-500 to-blue-600',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    title: 'Store Assistant (AI)',
    desc: 'The blue ✦ button at the bottom-right is your AI assistant. Ask it anything — "summarize today\'s orders", "how many pending?", "what\'s my revenue?"',
    tip: 'It reads your live store data in real time, so answers are always up to date.',
  },
  {
    icon: Settings,
    color: 'from-gray-500 to-gray-700',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    title: 'Store Settings',
    desc: 'Set your store name, address, logo, service type, delivery fee, and pin your exact location on the map.',
    tip: 'Pinning your store location enables the delivery radius map and the 15km customer pin limit.',
  },
]

const STORAGE_KEY = 'aq-provider-tutorial-done'

export function ProviderTutorial() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) setVisible(true)
    }
  }, [])

  function dismiss(permanent = true) {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      setExiting(false)
      if (permanent) localStorage.setItem(STORAGE_KEY, '1')
    }, 250)
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible) return null

  const s = STEPS[step]
  const Icon = s.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-250 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-gradient-to-r from-water-400 to-water-600 transition-all duration-400"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${s.color} px-6 pt-6 pb-10 relative`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="AquaGas" className="w-6 h-6 rounded-lg" />
              <span className="text-white/80 text-xs font-semibold">Provider Tutorial</span>
            </div>
            <button onClick={() => dismiss()} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-black text-white">{s.title}</h2>
          <p className="text-white/70 text-xs mt-1">{step + 1} of {STEPS.length}</p>
        </div>

        {/* Body */}
        <div className="px-6 -mt-5">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">{s.desc}</p>

            <div className="flex items-start gap-2 mt-4 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
              <p className="text-xs text-amber-700 leading-relaxed">{s.tip}</p>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${i === step ? 'w-5 h-2 bg-water-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 pb-5">
            <button
              onClick={prev}
              disabled={step === 0}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className={`flex-1 h-10 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-colors ${
                isLast
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-water-500 hover:bg-water-600'
              }`}
            >
              {isLast ? (
                <><CheckCircle className="w-4 h-4" /> Got it, let's go!</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <button
            onClick={() => dismiss()}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-500 pb-4 -mt-1 transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  )
}
