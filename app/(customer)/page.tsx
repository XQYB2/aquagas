'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Droplets, Flame, Sparkles, MapPin, LocateFixed, ChevronRight } from 'lucide-react'
import { ProviderCard } from '@/components/customer/ProviderCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Database } from '@/lib/supabase'
import Link from 'next/link'

type Provider = Database['public']['Tables']['providers']['Row']
type FilterType = 'all' | 'water' | 'lpg'

const RADIUS_KM = 15

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function HomePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  // User location state
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationReady, setLocationReady] = useState(false)

  // If Supabase redirects a password recovery token to the home page, forward to /auth/reset
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      window.location.replace('/auth/reset' + window.location.hash)
    }
  }, [])

  // Load providers
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

  // Load saved location from customer_addresses or localStorage
  useEffect(() => {
    const cached = localStorage.getItem('aq-user-location')
    if (cached) {
      try {
        const { lat, lng } = JSON.parse(cached)
        setUserLat(lat); setUserLng(lng); setLocationReady(true)
      } catch {}
    }
    // Also try to load from saved addresses if logged in
    if (user) {
      supabase
        .from('customer_addresses')
        .select('lat, lng')
        .eq('customer_id', user.id)
        .not('lat', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .then(({ data }) => {
          if (data?.[0]?.lat && data?.[0]?.lng && !cached) {
            const { lat, lng } = data[0]
            setUserLat(lat); setUserLng(lng); setLocationReady(true)
            localStorage.setItem('aq-user-location', JSON.stringify({ lat, lng }))
          }
        })
    }
  }, [user])

  function handleLocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLat(lat); setUserLng(lng); setLocationReady(true)
        localStorage.setItem('aq-user-location', JSON.stringify({ lat, lng }))
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 10000 }
    )
  }

  const providers = useMemo(() => {
    if (!locationReady || userLat == null || userLng == null) return []

    return allProviders
      .filter(p => {
        if (!p.lat || !p.lng) return false
        const dist = haversineKm(userLat, userLng, p.lat, p.lng)
        if (dist > RADIUS_KM) return false
        const matchesType = filter === 'all' || p.service_type === filter || p.service_type === 'both'
        const matchesQuery = !query ||
          p.store_name.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase())
        return matchesType && matchesQuery
      })
      .sort((a, b) => {
        const dA = haversineKm(userLat, userLng, a.lat!, a.lng!)
        const dB = haversineKm(userLat, userLng, b.lat!, b.lng!)
        return dA - dB
      })
  }, [query, filter, allProviders, userLat, userLng, locationReady])

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
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 40L1440 40L1440 10C1320 35 1080 0 720 20C360 40 120 5 0 20L0 40Z" fill="rgb(249 250 251)" />
          </svg>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Location banner */}
        {!locationReady ? (
          <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 bg-water-50 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-water-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Set your location to see nearby stores</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">We'll show stores within {RADIUS_KM} km of you.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleLocate}
                  disabled={locating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-water-500 hover:bg-water-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <LocateFixed className="w-4 h-4" />
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
                {user && (
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Use saved address
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
              <MapPin className="w-3 h-3" />
              Showing stores within {RADIUS_KM} km
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('aq-user-location')
                setUserLat(null); setUserLng(null); setLocationReady(false)
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Change
            </button>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex gap-3 mb-8">
          {[
            { key: 'all' as FilterType, label: 'All' },
            { key: 'water' as FilterType, label: '💧 Water Refill' },
            { key: 'lpg' as FilterType, label: '🔥 LPG Gas' },
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

        {/* Providers Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {filter === 'all' ? 'Nearby Stores' : filter === 'water' ? 'Water Refilling Stations' : 'LPG Gas Suppliers'}
            {locationReady && <span className="text-gray-400 font-normal text-sm ml-2">({providers.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading stores…</div>
        ) : !locationReady ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📍</p>
            <p className="text-gray-500 font-medium">Set your location above to see nearby stores.</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-500 font-medium">No stores within {RADIUS_KM} km of your location.</p>
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
