'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Droplets, Flame, Sparkles, ChevronRight } from 'lucide-react'
import { ProviderCard } from '@/components/customer/ProviderCard'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Provider = Database['public']['Tables']['providers']['Row']

type FilterType = 'all' | 'water' | 'lpg'

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  // If Supabase redirects a password recovery token to the home page, forward to /auth/reset
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      window.location.replace('/auth/reset' + window.location.hash)
    }
  }, [])

  useEffect(() => {
    supabase
      .from('providers')
      .select('*')
      .eq('approval_status', 'active')
      .then(({ data }) => {
        setAllProviders(data || [])
        setLoading(false)
      })
  }, [])

  const providers = useMemo(() => {
    return allProviders.filter(p => {
      const matchesType =
        filter === 'all' ||
        p.service_type === filter ||
        p.service_type === 'both'
      const matchesQuery =
        !query ||
        p.store_name.toLowerCase().includes(query.toLowerCase()) ||
        p.address.toLowerCase().includes(query.toLowerCase())
      return matchesType && matchesQuery
    })
  }, [query, filter, allProviders])

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-water-600 via-water-500 to-sky-400 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Fast delivery in your area
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              Water & Gas<br />delivered to your door
            </h1>
            <p className="text-white/80 text-base md:text-lg mb-8">
              Order from local water refilling stations and LPG suppliers — fast, safe, and hassle-free.
            </p>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores or address…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 bg-white shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 40L1440 40L1440 10C1320 35 1080 0 720 20C360 40 120 5 0 20L0 40Z" fill="rgb(249 250 251)" />
          </svg>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Category Filters */}
        <div className="flex gap-3 mb-8">
          {[
            { key: 'all' as FilterType, label: 'All', icon: null },
            { key: 'water' as FilterType, label: '💧 Water Refill', icon: null },
            { key: 'lpg' as FilterType, label: '🔥 LPG Gas', icon: null },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? tab.key === 'water'
                    ? 'bg-water-500 text-white shadow-md shadow-water-200'
                    : tab.key === 'lpg'
                    ? 'bg-lpg-500 text-white shadow-md shadow-lpg-200'
                    : 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3 bg-water-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-water-100 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-water-600" />
            </div>
            <div>
              <p className="text-xs text-water-600 font-medium">Water Stations</p>
              <p className="text-lg font-bold text-water-700">
                {allProviders.filter(p => p.service_type === 'water' || p.service_type === 'both').length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-lpg-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-lpg-100 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-lpg-600" />
            </div>
            <div>
              <p className="text-xs text-lpg-600 font-medium">LPG Suppliers</p>
              <p className="text-lg font-bold text-lpg-700">
                {allProviders.filter(p => p.service_type === 'lpg' || p.service_type === 'both').length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xs font-bold">✓</span>
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Open Now</p>
              <p className="text-lg font-bold text-green-700">
                {allProviders.filter(p => p.is_open).length}
              </p>
            </div>
          </div>
        </div>

        {/* Providers Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {filter === 'all' ? 'All Stores' : filter === 'water' ? 'Water Refilling Stations' : 'LPG Gas Suppliers'}
            <span className="text-gray-400 font-normal text-sm ml-2">({providers.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading stores…</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-500 font-medium">No stores match your search.</p>
            <button onClick={() => { setQuery(''); setFilter('all') }} className="mt-4 text-water-500 font-semibold text-sm hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(p => (
              <ProviderCard key={p.id} {...p} />
            ))}
          </div>
        )}

        {/* How It Works */}
        <section className="mt-16 bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">How AquaGas works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { emoji: '🏪', title: 'Choose a store', desc: 'Browse water stations and LPG suppliers near you.' },
              { emoji: '🛒', title: 'Add to cart', desc: 'Select your gallons or gas cylinders and quantities.' },
              { emoji: '🚚', title: 'Get it delivered', desc: 'Cash on delivery — pay when your order arrives.' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-3">{step.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
