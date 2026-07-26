'use client'

import { useEffect, useRef, useState } from 'react'
import { useProvider } from '@/lib/provider-context'
import { Navigation, MapPin, CheckCircle2 } from 'lucide-react'

const ACTIVE_STATUSES = ['placed', 'confirmed', 'awaiting_pickup', 'picked_up', 'being_prepared', 'out_for_delivery']

const STATUS_COLORS: Record<string, string> = {
  placed:           '#7c3aed',
  confirmed:        '#0284c7',
  awaiting_pickup:  '#d97706',
  picked_up:        '#0891b2',
  being_prepared:   '#9333ea',
  out_for_delivery: '#2563eb',
}

const STATUS_LABELS: Record<string, string> = {
  placed:           'Placed',
  confirmed:        'Confirmed',
  awaiting_pickup:  'Awaiting Pickup',
  picked_up:        'Picked Up',
  being_prepared:   'Being Prepared',
  out_for_delivery: 'Out for Delivery',
}

function openRoute(targets: any[], storeLat: number, storeLng: number) {
  if (targets.length === 0) return
  if (targets.length === 1) {
    const { delivery_lat: lat, delivery_lng: lng } = targets[0]
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank')
    return
  }
  const stops = targets.map(o => `${o.delivery_lat},${o.delivery_lng}`).join('/')
  window.open(`https://www.google.com/maps/dir/${storeLat},${storeLng}/${stops}/`, '_blank')
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    const win = window as any
    if (win.L) { resolve(win.L); return }

    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link')
      css.id = 'leaflet-css'
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(css)
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(win.L)
    document.head.appendChild(script)
  })
}

export default function DeliveryMapPage() {
  const { orders, store } = useProvider()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mapReady, setMapReady] = useState(false)

  const activeOrders = orders.filter(o =>
    ACTIVE_STATUSES.includes(o.status) &&
    o.delivery_lat != null && o.delivery_lng != null
  )

  const storeLat = store?.lat ?? 14.5995
  const storeLng = store?.lng ?? 120.9842

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    loadLeaflet().then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, { zoomControl: true }).setView([storeLat, storeLng], 12)
      mapInstanceRef.current = map

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const storeIcon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:8px;background:#0284c7;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M20 4H4v2l8 5 8-5V4zM4 13v7h16v-7l-8 5-8-5z"/></svg></div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      })
      L.marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<b>${store?.store_name || 'Your Store'}</b><br/>Store location`)

      setMapReady(true)
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      setMapReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLat, storeLng])

  // Update delivery markers
  useEffect(() => {
    if (!mapReady) return
    const L = (window as any).L
    const map = mapInstanceRef.current
    if (!L || !map) return

    const currentIds = new Set(activeOrders.map(o => o.id))

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id) }
    })

    activeOrders.forEach(o => {
      if (markersRef.current.has(o.id)) return
      const color = STATUS_COLORS[o.status] || '#6b7280'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div>`,
        iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14],
      })
      const marker = L.marker([o.delivery_lat, o.delivery_lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${o.customer_name}</b><br/>${STATUS_LABELS[o.status] || o.status}<br/>₱${Number(o.total_amount).toFixed(0)}<br/><small>${(o.delivery_address || '').slice(0, 60)}</small>`)
      markersRef.current.set(o.id, marker)
    })

    if (activeOrders.length > 0) {
      const latlngs: [number, number][] = [
        ...activeOrders.map(o => [o.delivery_lat!, o.delivery_lng!] as [number, number]),
        [storeLat, storeLng],
      ]
      map.fitBounds(latlngs, { padding: [40, 40] })
    }
  }, [mapReady, activeOrders, storeLat, storeLng])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectedOrders = activeOrders.filter(o => selected.has(o.id))
  const routeTargets = selectedOrders.length > 0 ? selectedOrders : activeOrders

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Delivery Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeOrders.length} active delivery{activeOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => openRoute(routeTargets, storeLat, storeLng)}
          disabled={activeOrders.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-water-600 hover:bg-water-700 text-white text-sm font-bold disabled:opacity-40 transition-colors"
        >
          <Navigation className="w-4 h-4" />
          {selectedOrders.length > 0 ? `Route (${selectedOrders.length})` : 'Route All'}
        </button>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100" style={{ height: 420 }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Legend */}
      {activeOrders.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_COLORS).map(([status, color]) => {
            const count = activeOrders.filter(o => o.status === status).length
            if (!count) return null
            return (
              <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {STATUS_LABELS[status]} ({count})
              </div>
            )
          })}
        </div>
      )}

      {/* Order list */}
      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <MapPin className="w-10 h-10" />
          <p className="font-semibold text-gray-500">No active deliveries</p>
          <p className="text-sm text-center">Orders with delivery coordinates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              {selected.size > 0 ? `${selected.size} stop${selected.size !== 1 ? 's' : ''} selected` : 'Select stops for route'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set(activeOrders.map(o => o.id)))} className="text-xs font-bold text-water-600 hover:underline">
                All
              </button>
              <span className="text-gray-300">·</span>
              <button onClick={() => setSelected(new Set())} className="text-xs font-bold text-water-600 hover:underline">
                None
              </button>
            </div>
          </div>
          {activeOrders.map((o, idx) => {
            const isSelected = selected.has(o.id)
            const color = STATUS_COLORS[o.status] || '#6b7280'
            return (
              <button
                key={o.id}
                onClick={() => toggleSelect(o.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected ? 'border-water-400 bg-water-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${
                  isSelected ? 'bg-water-500 border-water-500 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {isSelected ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{o.customer_name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{o.delivery_address}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                    {STATUS_LABELS[o.status]}
                  </span>
                  <span className="text-xs font-bold text-gray-700">₱{Number(o.total_amount).toFixed(0)}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
