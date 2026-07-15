import Link from 'next/link'
import { Star, Clock, Truck, Droplets, Flame } from 'lucide-react'

interface ProviderCardProps {
  id: string
  store_name: string
  logo_url: string | null
  address: string
  service_type: 'water' | 'lpg' | 'both'
  is_open: boolean
  delivery_fee: number
  delivery_time_min: number
  rating: number
  review_count?: number
}

export function ProviderCard({
  id, store_name, logo_url, address, service_type,
  is_open, delivery_fee, delivery_time_min, rating, review_count = 0
}: ProviderCardProps) {
  const serviceColor = service_type === 'water'
    ? 'bg-water-50 text-water-700'
    : service_type === 'lpg'
    ? 'bg-lpg-50 text-lpg-700'
    : 'bg-purple-50 text-purple-700'

  const ServiceIcon = service_type === 'lpg' ? Flame : Droplets

  const initials = store_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const bgColor = service_type === 'water' ? 'from-water-400 to-water-600' : service_type === 'lpg' ? 'from-lpg-400 to-lpg-600' : 'from-purple-400 to-purple-600'

  return (
    <Link href={`/store/${id}`}>
      <div className={`group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${!is_open ? 'opacity-60' : ''}`}>
        {/* Store Banner */}
        <div className={`h-32 bg-gradient-to-br ${bgColor} relative flex items-center justify-center`}>
          {logo_url ? (
            <img src={logo_url} alt={store_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>
          )}
          {!is_open && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full">Closed</span>
            </div>
          )}
          <div className={`absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${serviceColor} shadow-sm`}>
            <ServiceIcon className="w-3 h-3" />
            {service_type === 'both' ? 'Water & LPG' : service_type === 'water' ? 'Water' : 'LPG Gas'}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 group-hover:text-water-600 transition-colors">{store_name}</h3>
          <p className="text-gray-400 text-xs mb-3 truncate">{address}</p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-700">{rating.toFixed(1)}</span>
              {review_count > 0 && <span className="text-gray-400">({review_count})</span>}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>{delivery_time_min} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-gray-400" />
              <span>₱{delivery_fee}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
