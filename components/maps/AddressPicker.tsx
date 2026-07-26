'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

const deliveryIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const storeIcon = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:8px;background:#0284c7;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M20 4H4v2l8 5 8-5V4zM4 13v7h16v-7l-8 5-8-5z"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const PH = { minLat: 4.5, maxLat: 21.5, minLng: 116.0, maxLng: 127.0 }

function isInPhilippines(lat: number, lng: number) {
  return lat >= PH.minLat && lat <= PH.maxLat && lng >= PH.minLng && lng <= PH.maxLng
}

function ClickHandler({
  onPick,
  onReject,
  storeCoord,
  radiusKm,
}: {
  onPick: (lat: number, lng: number) => void
  onReject: (reason: string) => void
  storeCoord: { lat: number; lng: number } | null
  radiusKm: number
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (!isInPhilippines(lat, lng)) {
        onReject('outside_ph')
        return
      }
      if (storeCoord) {
        const dist = haversineKm(storeCoord.lat, storeCoord.lng, lat, lng)
        if (dist > radiusKm) {
          onReject('outside_range')
          return
        }
      }
      onPick(lat, lng)
    },
  })
  return null
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  const prev = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (!target) return
    if (prev.current?.[0] === target[0] && prev.current?.[1] === target[1]) return
    prev.current = target
    map.flyTo(target, 17, { duration: 1 })
  }, [map, target])
  return null
}

type Props = {
  lat: number | null
  lng: number | null
  storeCoord?: { lat: number; lng: number } | null
  radiusKm?: number
  onChange: (lat: number, lng: number, address: string) => void
}

export function AddressPicker({ lat, lng, storeCoord = null, radiusKm = 15, onChange }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const defaultCenter: [number, number] = storeCoord
    ? [storeCoord.lat, storeCoord.lng]
    : [12.8797, 121.7740]
  const defaultZoom = position ? 16 : storeCoord ? 13 : 6

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleReject(reason: string) {
    if (reason === 'outside_ph') showToast('📍 Location must be within the Philippines')
    else showToast(`📍 Location is outside the ${radiusKm}km delivery range`)
  }

  async function reverseGeocode(lat: number, lng: number) {
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      )
      const data = await res.json()
      const address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      onChange(lat, lng, address)
    } catch {
      onChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setLoading(false)
    }
  }

  function handlePick(lat: number, lng: number) {
    const pos: [number, number] = [lat, lng]
    setPosition(pos)
    reverseGeocode(lat, lng)
  }

  function handleGeolocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        if (!isInPhilippines(latitude, longitude)) {
          showToast('📍 Your location is not within the Philippines')
          setLocating(false)
          return
        }
        if (storeCoord) {
          const dist = haversineKm(storeCoord.lat, storeCoord.lng, latitude, longitude)
          if (dist > radiusKm) {
            showToast(`📍 Your location is ${dist.toFixed(1)}km from the store — outside the ${radiusKm}km delivery range`)
            setLocating(false)
            return
          }
        }
        const target: [number, number] = [latitude, longitude]
        setPosition(target)
        setFlyTarget(target)
        reverseGeocode(latitude, longitude)
        setLocating(false)
      },
      () => setLocating(false),
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {storeCoord
            ? `Tap the map to pin your delivery location (within ${radiusKm}km of store)`
            : 'Tap the map to pin your delivery location'}
        </p>
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={locating}
          className="text-xs text-water-600 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          {locating ? '…locating' : '📍 Use my location'}
        </button>
      </div>
      <div className="h-52 rounded-xl overflow-hidden border border-gray-200 relative mb-1">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-water-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {toast && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1100] bg-gray-900/80 text-white text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap shadow-lg">
            {toast}
          </div>
        )}
        <MapContainer
          key="address-picker-map"
          center={position ?? defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} onReject={handleReject} storeCoord={storeCoord} radiusKm={radiusKm} />
          <FlyTo target={flyTarget} />
          {position && <Marker position={position} icon={deliveryIcon} />}
          {storeCoord && (
            <>
              <Marker position={[storeCoord.lat, storeCoord.lng]} icon={storeIcon} />
              <Circle
                center={[storeCoord.lat, storeCoord.lng]}
                radius={radiusKm * 1000}
                pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.05, dashArray: '6 4', weight: 2 }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  )
}
