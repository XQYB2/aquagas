import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Droplets, Flame, MapPin, ShieldCheck } from 'lucide-react'
import { HowAquaGasWorks } from '@/components/HowAquaGasWorks'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'AquaGas | On-Demand Water & LPG Delivery',
  description: 'AquaGas connects you with local water refilling stations and LPG suppliers for fast, reliable home delivery.',
}

const SERVICES = [
  {
    icon: Droplets,
    title: 'Water delivery',
    description: 'Order purified water gallons from nearby refilling stations for your home or office.',
    iconClass: 'border-water-100 bg-water-50 text-water-600',
  },
  {
    icon: Flame,
    title: 'LPG delivery',
    description: 'Order LPG cylinders from local suppliers and get them delivered to your door.',
    iconClass: 'border-lpg-100 bg-lpg-50 text-lpg-600',
  },
  {
    icon: MapPin,
    title: 'Nearby providers',
    description: 'Browse providers within 15 km and see ratings, prices, and delivery times before ordering.',
    iconClass: 'border-green-100 bg-green-50 text-green-600',
  },
]

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <PublicHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-water-600 via-water-500 to-sky-400 text-white">
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            <div className="absolute left-1/4 top-4 h-64 w-64 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-white blur-2xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="max-w-2xl">
              <h1 className="max-w-[13ch] text-4xl font-extrabold leading-tight tracking-[-0.035em] md:text-5xl">
                Water & LPG delivered to your door
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-sky-50 md:text-lg">
                Order from local water refilling stations and LPG suppliers - fast, simple, and close to home.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-water-700 shadow-lg transition-colors hover:bg-water-50 ${focusRing}`}
                >
                  Find nearby providers
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className={`inline-flex h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-bold text-white transition-colors hover:bg-white/20 ${focusRing}`}
                >
                  Sign in
                </Link>
              </div>

              <p className="mt-6 flex items-center gap-2 text-sm font-medium text-sky-50">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Available in the Philippines
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0" aria-hidden="true">
            <svg viewBox="0 0 1440 40" fill="none" className="w-full" preserveAspectRatio="none">
              <path d="M0 40h1440V10c-120 25-360-10-720 10S120 5 0 20v20Z" fill="rgb(249 250 251)" />
            </svg>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:space-y-12 md:py-12">
          <section aria-labelledby="services-title">
            <div className="mb-6 max-w-2xl">
              <h2 id="services-title" className="text-2xl font-bold text-gray-900">Everyday delivery, made local</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 md:text-base">
                One familiar ordering experience for two essentials your household depends on.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:grid md:grid-cols-3">
              {SERVICES.map(({ icon: Icon, title, description, iconClass }, index) => (
                <article key={title} className={`p-5 sm:p-6 ${index > 0 ? 'border-t border-gray-100 md:border-l md:border-t-0' : ''}`}>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${iconClass}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <HowAquaGasWorks />

          <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-600">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ready to place an order?</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  Create an account, choose a nearby provider, and track your delivery in AquaGas.
                </p>
              </div>
            </div>
            <Link
              href="/register"
              className={`inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-water-700 px-5 text-sm font-bold text-white transition-colors hover:bg-sky-800 ${focusRing}`}
            >
              Get started
            </Link>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
