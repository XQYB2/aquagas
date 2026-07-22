'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

const destIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const riderIcon = L.divIcon({
  html: `<div style="background:#0ea5e9;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">🛵</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  const prev = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (!target) return
    if (prev.current?.[0] === target[0] && prev.current?.[1] === target[1]) return
    prev.current = target
    map.flyTo(target, 16, { duration: 1 })
  }, [map, target])
  return null
}

type Props = {
  destLat: number
  destLng: number
  customerName: string
  address: string
}

export function DeliveryMap({ destLat, destLng, customerName, address }: Props) {
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)

  function handleLocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const pos2: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setRiderPos(pos2)
        setFlyTarget(pos2)
        setLocating(false)
      },
      () => setLocating(false),
    )
  }

  function openGoogleMaps() {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`,
      '_blank',
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 220 }}>
        {/* Overlay buttons */}
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={handleLocate}
            disabled={locating}
            title="Show my location"
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {locating ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
            ) : '📍'}
            My Location
          </button>
        </div>

        <MapContainer
          key={`${destLat},${destLng}`}
          center={[destLat, destLng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo target={flyTarget} />

          {/* Customer delivery pin */}
          <Marker position={[destLat, destLng]} icon={destIcon}>
            <Popup>
              <strong>{customerName}</strong><br />
              <span className="text-xs text-gray-500">{address}</span>
            </Popup>
          </Marker>

          {/* Rider current position */}
          {riderPos && (
            <Marker position={riderPos} icon={riderIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Navigate button */}
      <button
        onClick={openGoogleMaps}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Navigate with Google Maps
      </button>
    </div>
  )
}
