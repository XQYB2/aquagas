'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

const customerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const storeIcon = L.divIcon({
  html: `<div style="background:#0ea5e9;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🏪</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

type OrderPin = {
  id: string
  customerName: string
  address: string
  status: string
  lat: number
  lng: number
}

type Props = {
  storeLat: number
  storeLng: number
  storeName: string
  orders: OrderPin[]
}

const STATUS_COLORS: Record<string, string> = {
  placed:           '#3b82f6',
  confirmed:        '#6366f1',
  awaiting_pickup:  '#a855f7',
  picked_up:        '#06b6d4',
  being_prepared:   '#eab308',
  out_for_delivery: '#f97316',
  delivered:        '#22c55e',
  cancelled:        '#ef4444',
}

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

export function OrdersMap({ storeLat, storeLng, storeName, orders }: Props) {
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)

  function handleLocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFlyTarget([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      () => setLocating(false),
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Locate me button overlaid on map */}
      <button
        onClick={handleLocate}
        disabled={locating}
        title="Zoom to my location"
        className="absolute top-2 right-2 z-[1000] bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
      >
        {locating ? (
          <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
        ) : (
          <span>📍</span>
        )}
        My Location
      </button>

      <MapContainer
        center={[storeLat, storeLng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo target={flyTarget} />

        {/* Store marker */}
        <Marker position={[storeLat, storeLng]} icon={storeIcon}>
          <Popup><strong>{storeName}</strong><br />Your store</Popup>
        </Marker>

        {/* Customer order markers */}
        {orders.map(order => {
          const color = STATUS_COLORS[order.status] ?? '#6b7280'
          const icon = L.divIcon({
            html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })
          return (
            <Marker key={order.id} position={[order.lat, order.lng]} icon={icon}>
              <Popup>
                <strong>{order.customerName}</strong><br />
                {order.address}<br />
                <span style={{ color, fontWeight: 600, textTransform: 'capitalize' }}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
