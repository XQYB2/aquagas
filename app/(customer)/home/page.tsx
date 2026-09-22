'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Droplets, Flame, Sparkles, MapPin, LocateFixed, ChevronRight, ArrowUpDown } from 'lucide-react'
import { ProviderCard } from '@/components/customer/ProviderCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Database } from '@/lib/supabase'
import Link from 'next/link'
import { HowAquaGasWorks } from '@/components/HowAquaGasWorks'

type Provider = Database['public']['Tables']['providers']['Row']
type FilterType = 'all' | 'water' | 'lpg'
type SortType = 'nearest' | 'rating_desc' | 'rating_asc' | 'fastest'

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
  const [sort, setSort] = useState<SortType>('nearest')
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
      .in('approval_status', ['active', 'approved'])
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
        if (sort === 'rating_desc') return Number(b.rating || 0) - Number(a.rating || 0) || dA - dB
        if (sort === 'rating_asc') return Number(a.rating || 0) - Number(b.rating || 0) || dA - dB
        if (sort === 'fastest') {
          const timeA = Number(a.delivery_time_min) > 0 ? Number(a.delivery_time_min) : Number.POSITIVE_INFINITY
          const timeB = Number(b.delivery_time_min) > 0 ? Number(b.delivery_time_min) : Number.POSITIVE_INFINITY
          return timeA - timeB || dA - dB
        }
        return dA - dB
      })
  }, [query, filter, sort, allProviders, userLat, userLng, locationReady])

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-water-600 via-water-500 to-sky-400 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Fast delivery in your area
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5">
              Water & Gas<br />delivered to your door
            </h1>
            <p className="text-white/85 text-lg md:text-xl mb-9 max-w-2xl">
              Order from local water refilling stations and LPG suppliers — fast, safe, and hassle-free.
            </p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores or address…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full h-16 pl-12 pr-4 rounded-2xl text-gray-900 bg-white shadow-xl text-base focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

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
                  className="flex min-h-11 items-center gap-1.5 px-4 py-2 bg-water-500 hover:bg-water-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <LocateFixed className="w-4 h-4" />
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
                {user && (
                  <Link
                    href="/profile"
                    className="flex min-h-11 items-center gap-1.5 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
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
        <div className="sticky top-16 z-30 -mx-4 mb-8 flex flex-col gap-3 border-y border-gray-100 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:px-5">
          <div className="flex flex-wrap gap-2 sm:gap-3">
          {[
            { key: 'all' as FilterType, label: 'All', icon: Sparkles },
            { key: 'water' as FilterType, label: 'Water Refill', icon: Droplets },
            { key: 'lpg' as FilterType, label: 'LPG Gas', icon: Flame },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`min-h-11 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? tab.key === 'water'
                    ? 'bg-water-500 text-white shadow-md shadow-water-200'
                    : tab.key === 'lpg'
                    ? 'bg-lpg-500 text-white shadow-md shadow-lpg-200'
                    : 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2 inline h-4 w-4" />{tab.label}
            </button>
          ))}
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 transition-colors focus-within:border-water-400 focus-within:ring-2 focus-within:ring-water-100 sm:w-auto">
            <ArrowUpDown className="h-4 w-4 shrink-0 text-water-500" aria-hidden="true" />
            <span className="sr-only">Sort stores by</span>
            <select value={sort} onChange={event => setSort(event.target.value as SortType)} className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-2 pr-6 font-semibold text-gray-700 outline-none sm:min-w-48" aria-label="Sort stores by">
              <option value="nearest">Nearest to farthest</option>
              <option value="rating_desc">Highest rated</option>
              <option value="rating_asc">Lowest rated</option>
              <option value="fastest">Fastest delivery</option>
            </select>
          </label>
        </div>

        {/* Providers Grid */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {filter === 'all' ? 'Nearby Stores' : filter === 'water' ? 'Water Refilling Stations' : 'LPG Gas Suppliers'}
            {locationReady && <span className="text-gray-400 font-normal text-sm ml-2">({providers.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading stores…</div>
        ) : !locationReady ? (
          <div className="text-center py-20">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500 font-medium">Set your location above to see nearby stores.</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <Search className="mx-auto mb-4 h-11 w-11 text-gray-300" />
            <p className="text-gray-500 font-medium">No stores within {RADIUS_KM} km of your location.</p>
            <button onClick={() => { setQuery(''); setFilter('all'); setSort('nearest') }} className="mt-4 text-water-500 font-semibold text-sm hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {providers.map(p => (
              <ProviderCard key={p.id} {...p} />
            ))}
          </div>
        )}

        <HowAquaGasWorks className="mt-16" />
      </div>
    </div>
  )
}
