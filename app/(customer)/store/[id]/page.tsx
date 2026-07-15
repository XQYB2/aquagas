'use client'

import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useCart } from '@/lib/cart-context'
import { Star, Clock, Truck, Droplets, Flame, Plus, Minus, ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const StoreMap = dynamic(() => import('@/components/maps/StoreMap').then(m => m.StoreMap), { ssr: false })

type Provider = Database['public']['Tables']['providers']['Row']
type Product = Database['public']['Tables']['products']['Row']

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_name: string
}

export default function StorePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { state, dispatch } = useCart()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  const [confirmSwitch, setConfirmSwitch] = useState<null | (() => void)>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('providers').select('*').eq('id', id).single(),
      supabase.from('products').select('*').eq('provider_id', id),
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(full_name)')
        .eq('provider_id', id)
        .order('created_at', { ascending: false }),
    ]).then(([providerRes, productsRes, reviewsRes]) => {
      if (cancelled) return
      setProvider(providerRes.data || null)
      setProducts(productsRes.data || [])
      setReviews(
        (reviewsRes.data || []).map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: r.profiles?.full_name || 'AquaGas Customer',
        }))
      )
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">
        Loading…
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-xl font-bold mb-2">Store not found</h2>
        <Link href="/" className="text-water-500 hover:underline">Go back home</Link>
      </div>
    )
  }

  const bgColor = provider.service_type === 'water'
    ? 'from-water-400 to-water-600'
    : provider.service_type === 'lpg'
    ? 'from-lpg-400 to-lpg-600'
    : 'from-purple-400 to-purple-600'

  function getQty(productId: string) {
    return state.items.find(i => i.product_id === productId)?.quantity ?? 0
  }

  function handleAdd(product: typeof products[0]) {
    const isSameProvider = !state.provider_id || state.provider_id === provider!.id

    function doAdd() {
      dispatch({
        type: 'ADD_ITEM',
        payload: {
          id: `cart-${product.id}`,
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          unit: product.unit,
          category: product.category,
          provider_id: provider!.id,
          provider_name: provider!.store_name,
          delivery_fee: provider!.delivery_fee,
        }
      })
    }

    if (!isSameProvider) {
      setConfirmSwitch(() => () => { doAdd(); setConfirmSwitch(null) })
    } else {
      doAdd()
    }
  }

  function handleDecrease(product: typeof products[0]) {
    const item = state.items.find(i => i.product_id === product.id)
    if (item) {
      dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, quantity: item.quantity - 1 } })
    }
  }

  const waterProducts = products.filter(p => p.category === 'water')
  const lpgProducts = products.filter(p => p.category === 'lpg')

  return (
    <div>
      {/* Banner */}
      <div className={`h-40 md:h-56 bg-gradient-to-br ${bgColor} relative overflow-hidden`}>
        {provider.logo_url && (
          <img src={provider.logo_url} alt={provider.store_name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <Link href="/" className="absolute top-4 left-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>
        {!provider.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-3xl font-extrabold">
                {provider.store_name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Store Info */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 -mt-6 relative z-10 p-5 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{provider.store_name}</h1>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{provider.address}</span>
              </div>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${provider.is_open ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {provider.is_open ? 'Open' : 'Closed'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-700">{provider.rating.toFixed(1)}</span>
              {provider.review_count > 0 && (
                <span className="text-gray-400">({provider.review_count})</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{provider.delivery_time_min} min delivery</span>
            </div>
            <div className="flex items-center gap-1">
              <Truck className="w-4 h-4" />
              <span>₱{provider.delivery_fee} delivery fee</span>
            </div>
          </div>
        </div>

        {/* Store map */}
        {provider.lat && provider.lng && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 200 }}>
            <StoreMap lat={provider.lat} lng={provider.lng} storeName={provider.store_name} />
          </div>
        )}

        {/* Products */}
        {waterProducts.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-5 h-5 text-water-500" />
              <h2 className="text-base font-bold text-gray-900">Water Products</h2>
            </div>
            <div className="space-y-3">
              {waterProducts.map(product => (
                <ProductRow key={product.id} product={product} qty={getQty(product.id)} onAdd={() => handleAdd(product)} onDecrease={() => handleDecrease(product)} />
              ))}
            </div>
          </section>
        )}

        {lpgProducts.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-lpg-500" />
              <h2 className="text-base font-bold text-gray-900">LPG Products</h2>
            </div>
            <div className="space-y-3">
              {lpgProducts.map(product => (
                <ProductRow key={product.id} product={product} qty={getQty(product.id)} onAdd={() => handleAdd(product)} onDecrease={() => handleDecrease(product)} />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-gray-900">
              Ratings & Reviews
              {provider.review_count > 0 && <span className="text-gray-400 font-normal text-sm ml-2">({provider.review_count})</span>}
            </h2>
          </div>

          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 p-5 text-center">
              No reviews yet. Be the first to order and leave feedback!
            </p>
          ) : (
            <>
              <RatingBreakdown reviews={reviews} />
              <div className="space-y-3 mt-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-gray-900 text-sm">{review.reviewer_name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Switch store confirmation modal */}
      {confirmSwitch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-2">Start a new cart?</h3>
            <p className="text-gray-500 text-sm mb-6">Your current cart from another store will be cleared.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSwitch(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmSwitch} className="flex-1 py-2.5 rounded-xl bg-water-500 text-white font-semibold text-sm hover:bg-water-600 transition-colors">
                Start New Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const counts = [5, 4, 3, 2, 1].map(star => reviews.filter(r => r.rating === star).length)
  const max = Math.max(...counts, 1)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1.5">
      {[5, 4, 3, 2, 1].map((star, i) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-3 text-gray-500 font-medium">{star}</span>
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(counts[i] / max) * 100}%` }} />
          </div>
          <span className="w-6 text-right text-gray-400">{counts[i]}</span>
        </div>
      ))}
    </div>
  )
}

function ProductRow({
  product, qty, onAdd, onDecrease
}: {
  product: { id: string; name: string; description: string | null; price: number; unit: string; is_available: boolean; category: 'water' | 'lpg' }
  qty: number
  onAdd: () => void
  onDecrease: () => void
}) {
  const accent = product.category === 'water' ? 'text-water-600' : 'text-lpg-600'

  return (
    <div className={`flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 ${!product.is_available ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
        <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{product.description}</p>
        <p className={`font-bold text-sm mt-1.5 ${accent}`}>₱{product.price} <span className="text-gray-400 font-normal text-xs">/ {product.unit}</span></p>
      </div>

      {!product.is_available ? (
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">Unavailable</span>
      ) : qty === 0 ? (
        <button
          onClick={onAdd}
          className="w-9 h-9 rounded-xl bg-water-500 text-white flex items-center justify-center hover:bg-water-600 transition-colors shadow-sm shadow-water-200"
        >
          <Plus className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={onDecrease} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <Minus className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <span className="w-6 text-center font-bold text-gray-900">{qty}</span>
          <button onClick={onAdd} className="w-8 h-8 rounded-lg bg-water-500 text-white flex items-center justify-center hover:bg-water-600 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
