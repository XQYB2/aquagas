'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng) },
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
  onChange: (lat: number, lng: number, address: string) => void
}

export function AddressPicker({ lat, lng, onChange }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)

  const defaultCenter: [number, number] = [12.8797, 121.7740]

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
        <p className="text-xs text-gray-500">Tap the map to pin your delivery location</p>
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={locating}
          className="text-xs text-water-600 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          {locating ? '…locating' : '📍 Use my location'}
        </button>
      </div>
      <div className="h-52 rounded-xl overflow-hidden border border-gray-200 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-water-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <MapContainer
          center={position ?? defaultCenter}
          zoom={position ? 16 : 6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          <FlyTo target={flyTarget} />
          {position && <Marker position={position} icon={icon} />}
        </MapContainer>
      </div>
    </div>
  )
}
