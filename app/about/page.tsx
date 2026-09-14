import type { Metadata } from 'next'
import { Droplets, Flame, MapPin } from 'lucide-react'

import { HowAquaGasWorks } from '@/components/HowAquaGasWorks'
import { BackLink } from '@/components/navigation/BackLink'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'About AquaGas | Water & LPG Delivery',
  description: 'Learn how AquaGas connects customers with trusted local water refilling stations and LPG suppliers.',
}

const SERVICES = [
  {
    icon: Droplets,
    title: 'Water delivery',
    description: 'Order purified water gallons from nearby refilling stations for your home or office.',
  },
  {
    icon: Flame,
    title: 'LPG delivery',
    description: 'Find local LPG suppliers and get cooking gas delivered safely and quickly.',
  },
  {
    icon: MapPin,
    title: 'Nearby providers',
    description: 'Compare verified providers near your location, including prices and delivery details.',
  },
]

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PublicHeader />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <BackLink href="/" label="Back to home" variant="inline" className="mb-5" />

          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-water-600 via-water-500 to-sky-400 px-5 py-10 text-white shadow-sm sm:px-10 sm:py-14">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold text-water-50">About AquaGas</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Local essentials, delivered simply</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-water-50 sm:text-lg">
                AquaGas connects customers with trusted local water refilling stations and LPG suppliers. Order in minutes, track progress, and pay when your delivery arrives.
              </p>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="grid divide-y divide-gray-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {SERVICES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="p-5 sm:p-6">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-water-50 text-water-600">
                    <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h2 className="font-bold text-gray-900">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <HowAquaGasWorks className="mt-8" />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
