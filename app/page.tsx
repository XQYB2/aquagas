import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AquaGas — On-Demand Water & LPG Delivery',
  description: 'AquaGas connects you with local water refilling stations and LPG suppliers for fast, reliable home delivery.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="AquaGas" className="w-9 h-9 rounded-xl" />
          <span className="font-black text-lg">
            <span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/register" className="text-sm font-bold px-4 py-2 rounded-xl bg-water-500 hover:bg-water-600 text-white transition-colors">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-water-50 text-water-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-water-100 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-water-500" />
          Now available in the Philippines
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-5 leading-tight text-balance">
          Water & LPG delivered<br className="hidden md:block" /> to your door
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
          AquaGas connects you with trusted local water refilling stations and LPG gas suppliers. Order in minutes, track in real time, pay on delivery.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/register" className="px-6 py-3 rounded-xl bg-water-500 hover:bg-water-600 text-white font-bold text-sm transition-colors shadow-lg shadow-water-200">
            Order now
          </Link>
          <Link href="/login" className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '💧',
              title: 'Water Delivery',
              desc: 'Order purified water gallons from nearby refilling stations. Fast delivery, right to your home or office.',
            },
            {
              icon: '🔥',
              title: 'LPG Gas Delivery',
              desc: 'Never run out of gas. Order LPG tanks from local suppliers and get them delivered safely and quickly.',
            },
            {
              icon: '📍',
              title: 'Nearby Providers',
              desc: 'Browse verified providers within 15km of your location. See ratings, prices, and delivery times upfront.',
            },
          ].map(f => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 border-t border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create account', desc: 'Sign up for free in under a minute.' },
              { step: '2', title: 'Find a provider', desc: 'Browse stores near your location.' },
              { step: '3', title: 'Place your order', desc: 'Choose products and confirm delivery.' },
              { step: '4', title: 'Get it delivered', desc: 'Track your order and pay on arrival.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-water-500 text-white font-bold text-sm flex items-center justify-center mx-auto mb-3">{s.step}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="AquaGas" className="w-7 h-7 rounded-lg" />
            <span className="font-black text-sm">
              <span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/changelog" className="hover:text-gray-600">Changelog</Link>
            <a href="mailto:aquagas.business@gmail.com" className="hover:text-gray-600">Contact</a>
          </div>
          <p className="text-xs text-gray-400">© 2025 AquaGas. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
