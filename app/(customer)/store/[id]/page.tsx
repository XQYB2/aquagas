'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useCart } from '@/lib/cart-context'
import { Star, Clock, Truck, Droplets, Flame, Plus, Minus, MapPin, ShoppingCart, Info, MessageSquare, X, Search, Map, Heart } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { BackLink } from '@/components/navigation/BackLink'

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
  const searchParams = useSearchParams()
  const { state, dispatch } = useCart()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [reorderApplied, setReorderApplied] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [reviewRatingFilter, setReviewRatingFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all')
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [showStoreInfo, setShowStoreInfo] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [productFilter, setProductFilter] = useState<'all' | 'water' | 'lpg'>('all')
  const [productSort, setProductSort] = useState<'default' | 'price-high' | 'price-low' | 'size-high' | 'size-low'>('default')
  const [favorite, setFavorite] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)

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

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id || null
      setCustomerId(userId)
      if (!userId) return
      const { data: saved } = await supabase.from('customer_favorite_providers').select('provider_id').eq('customer_id', userId).eq('provider_id', id).maybeSingle()
      setFavorite(Boolean(saved))
    })
  }, [id])

  async function toggleFavorite() {
    if (!customerId) return router.push('/login')
    setFavorite(value => !value)
    const result = favorite
      ? await supabase.from('customer_favorite_providers').delete().eq('customer_id', customerId).eq('provider_id', id)
      : await supabase.from('customer_favorite_providers').upsert({ customer_id: customerId, provider_id: id })
    if (result.error) setFavorite(favorite)
  }

  // Pre-fill cart from reorder query param
  useEffect(() => {
    if (reorderApplied || loading || products.length === 0) return
    const raw = searchParams.get('reorder')
    if (!raw) return
    try {
      const items: { product_id: string; quantity: number }[] = JSON.parse(decodeURIComponent(raw))
      const cartItems = items
        .map(({ product_id, quantity }) => {
          const product = products.find(p => p.id === product_id)
          if (!product || !product.is_available) return null
          if (product.stock_quantity < 1) return null
          return { id: product.id, product_id: product.id, name: product.name, price: product.price, quantity: Math.min(quantity, product.stock_quantity), max_quantity: product.stock_quantity, unit: product.unit, category: product.category as 'water' | 'lpg' }
        })
        .filter(Boolean) as any[]
      if (cartItems.length > 0) {
        dispatch({ type: 'LOAD_CART', payload: { items: cartItems, provider_id: id as string, provider_name: provider?.store_name || '', delivery_fee: provider?.delivery_fee ?? 0 } })
      }
      setReorderApplied(true)
    } catch {}
  }, [loading, products, reorderApplied])

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
        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-bold mb-2">Store not found</h2>
        <Link href="/home" className="text-water-500 hover:underline">Go back home</Link>
      </div>
    )
  }

  const bgColor = provider.service_type === 'water'
    ? 'from-water-400 to-water-600'
    : provider.service_type === 'lpg'
    ? 'from-lpg-400 to-lpg-600'
    : 'from-water-500 to-red-500'

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
          max_quantity: product.stock_quantity,
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
  const matchesProduct = (product: Product) => !productQuery.trim() || `${product.name} ${product.description || ''}`.toLowerCase().includes(productQuery.toLowerCase())
  const productSize = (product: Product) => {
    const match = `${product.name} ${product.unit}`.toLowerCase().replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*(ml|liters?|litres?|l|gallons?|gal|kg|grams?|g)\b/)
    if (!match) return 0
    const value = Number(match[1])
    if (match[2] === 'ml') return value
    if (['l', 'liter', 'liters', 'litre', 'litres'].includes(match[2])) return value * 1000
    if (['gal', 'gallon', 'gallons'].includes(match[2])) return value * 3785.41
    if (match[2] === 'kg') return value * 1000
    return value
  }
  const sortProducts = (items: Product[]) => [...items].sort((a, b) => {
    if (productSort === 'price-high') return b.price - a.price
    if (productSort === 'price-low') return a.price - b.price
    if (productSort === 'size-high') return productSize(b) - productSize(a)
    if (productSort === 'size-low') return productSize(a) - productSize(b)
    return 0
  })
  const filteredWaterProducts = productFilter !== 'lpg' ? sortProducts(waterProducts.filter(matchesProduct)) : []
  const filteredLpgProducts = productFilter !== 'water' ? sortProducts(lpgProducts.filter(matchesProduct)) : []
  const filteredReviews = reviews
    .filter(review => reviewRatingFilter === 'all' || review.rating === reviewRatingFilter)
    .sort((a, b) => {
      if (reviewSort === 'highest') return b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (reviewSort === 'lowest') return a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <div>
      {/* Banner */}
      <div className={`h-52 sm:h-64 lg:h-72 bg-gradient-to-br ${bgColor} relative overflow-hidden`}>
        {provider.logo_url && (
          <img src={provider.logo_url} alt={provider.store_name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <BackLink
          href="/home"
          label="Back to stores"
          variant="inverse"
          iconOnly
          className="absolute left-4 top-4 z-10 rounded-full backdrop-blur-sm"
        />
        <button onClick={toggleFavorite} aria-label={favorite ? 'Remove saved store' : 'Save store'} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/45">
          <Heart className={`h-5 w-5 ${favorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[1.75rem] shadow-lg border border-gray-100 -mt-10 relative z-10 p-5 sm:p-7 mb-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">{provider.store_name}</h1>
              <div className="flex items-start gap-2 text-sm sm:text-base text-gray-500 mb-3 max-w-3xl">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{provider.address}</span>
              </div>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${provider.is_open ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {provider.is_open ? 'Open' : 'Closed'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm sm:text-base text-gray-500">
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
            <button onClick={() => setShowReviews(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-water-700 hover:bg-water-50">
              <MessageSquare className="h-4 w-4" /> See reviews
            </button>
            <button onClick={() => setShowStoreInfo(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-gray-700 hover:bg-gray-50">
              <Info className="h-4 w-4" /> Store information
            </button>
          </div>
        </div>

        <div className="sticky top-[4.5rem] z-20 -mx-4 mb-8 border-y border-gray-100 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex-1"><span className="sr-only">Search products</span><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><input value={productQuery} onChange={event => setProductQuery(event.target.value)} placeholder="Search this store's products" className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-900 outline-none focus:border-water-400 focus:ring-2 focus:ring-water-100" /></label>
            <select value={productSort} onChange={event => setProductSort(event.target.value as typeof productSort)} aria-label="Sort products" className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-water-400 focus:ring-2 focus:ring-water-100">
              <option value="default">Sort products</option><option value="price-high">Price: highest to lowest</option><option value="price-low">Price: lowest to highest</option><option value="size-high">Amount: largest to smallest</option><option value="size-low">Amount: smallest to largest</option>
            </select>
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'water', 'lpg'] as const).map(value => <button key={value} onClick={() => setProductFilter(value)} className={`min-h-11 whitespace-nowrap rounded-full px-5 text-sm font-bold transition-colors ${productFilter === value ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:border-water-300'}`}>{value === 'all' ? 'All products' : value === 'water' ? 'Water' : 'LPG'}</button>)}
            </div>
          </div>
        </div>

        {/* Products */}
        {filteredWaterProducts.length > 0 && (
          <section id="water-products" className="mb-10 scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-5 h-5 text-water-500" />
              <h2 className="text-base font-bold text-gray-900">Water Products</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredWaterProducts.map(product => (
                <ProductRow key={product.id} product={product} qty={getQty(product.id)} onAdd={() => handleAdd(product)} onDecrease={() => handleDecrease(product)} />
              ))}
            </div>
          </section>
        )}

        {filteredLpgProducts.length > 0 && (
          <section id="lpg-products" className="mb-10 scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-lpg-500" />
              <h2 className="text-base font-bold text-gray-900">LPG Products</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredLpgProducts.map(product => (
                <ProductRow key={product.id} product={product} qty={getQty(product.id)} onAdd={() => handleAdd(product)} onDecrease={() => handleDecrease(product)} />
              ))}
            </div>
          </section>
        )}

        {filteredWaterProducts.length === 0 && filteredLpgProducts.length === 0 && (
          <div className="mb-10 rounded-3xl border border-gray-200 bg-white py-16 text-center">
            <Search className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-bold text-gray-900">No matching products</p>
            <p className="mt-1 text-sm text-gray-500">Try another search or product category.</p>
          </div>
        )}

        {/* Reviews */}
        <section className="mb-10 rounded-[1.75rem] bg-gray-50 p-5 sm:p-7">
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
              <ReviewFilters
                rating={reviewRatingFilter}
                sort={reviewSort}
                onRatingChange={setReviewRatingFilter}
                onSortChange={setReviewSort}
              />
              <div className="grid gap-3 mt-4 md:grid-cols-2">
                {filteredReviews.slice(0, 4).map(review => (
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
              {filteredReviews.length === 0 && <div className="mt-4 rounded-2xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">No reviews match this rating.</div>}
              {filteredReviews.length > 4 && <button onClick={() => setShowReviews(true)} className="mt-5 min-h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 hover:border-water-300">Read all {filteredReviews.length} matching reviews</button>}
            </>
          )}
        </section>
      </div>

      {/* Sticky checkout bar */}
      {state.items.length > 0 && state.provider_id === provider.id && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40 flex justify-center">
          <button
            onClick={() => router.push('/checkout')}
            className="w-full max-w-sm flex items-center justify-between gap-3 bg-water-500 hover:bg-water-600 text-white rounded-2xl px-5 py-4 shadow-xl shadow-water-300/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {state.items.reduce((s, i) => s + i.quantity, 0)}
              </span>
              <span className="font-bold text-sm">View Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">₱{(state.items.reduce((s, i) => s + i.price * i.quantity, 0) + (state.delivery_fee ?? 0)).toFixed(0)}</span>
              <ShoppingCart className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

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

      {showReviews && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="reviews-title">
          <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
              <div><h2 id="reviews-title" className="text-xl font-extrabold text-gray-900">{provider.store_name}</h2><p className="text-sm text-gray-500">Ratings and reviews</p></div>
              <button onClick={() => setShowReviews(false)} aria-label="Close reviews" className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div><p className="text-5xl font-black text-gray-900">{provider.rating.toFixed(1)}</p><div className="my-2 flex">{[1,2,3,4,5].map(n => <Star key={n} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}</div><p className="text-sm text-gray-500">{reviews.length} verified review{reviews.length === 1 ? '' : 's'}</p></div>
                <RatingBreakdown reviews={reviews} />
              </div>
              <ReviewFilters rating={reviewRatingFilter} sort={reviewSort} onRatingChange={setReviewRatingFilter} onSortChange={setReviewSort} />
              <div className="mt-4 space-y-3">{filteredReviews.map(review => <div key={review.id} className="rounded-2xl border border-gray-200 p-5"><div className="flex justify-between gap-4"><p className="font-bold text-gray-900">{review.reviewer_name}</p><p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('en-PH')}</p></div><div className="my-2 flex">{[1,2,3,4,5].map(n => <Star key={n} className={`h-4 w-4 ${n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}</div>{review.comment && <p className="text-sm leading-6 text-gray-600">{review.comment}</p>}</div>)}</div>
              {filteredReviews.length === 0 && <div className="mt-4 rounded-2xl border border-gray-200 py-12 text-center text-sm text-gray-500">No reviews match this rating.</div>}
            </div>
          </div>
        </div>
      )}

      {showStoreInfo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="store-info-title">
          <div className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4"><div><h2 id="store-info-title" className="text-2xl font-extrabold text-gray-900">{provider.store_name}</h2><p className="mt-1 text-sm text-gray-500">Store and delivery information</p></div><button onClick={() => setShowStoreInfo(false)} aria-label="Close store information" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"><X className="h-5 w-5" /></button></div>
            <div className="mb-6 flex items-start gap-3 text-base font-semibold text-gray-800"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-water-500" />{provider.address}</div>
            {provider.lat && provider.lng && !showMap && <button onClick={() => setShowMap(true)} className="mb-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-water-50 font-bold text-water-700 hover:bg-water-100"><Map className="h-5 w-5" /> View store on map</button>}
            {provider.lat && provider.lng && showMap && <div className="mb-6"><div className="mb-3 flex items-center justify-between"><p className="font-bold text-gray-900">Store location</p><button onClick={() => setShowMap(false)} className="text-sm font-semibold text-gray-500 hover:text-gray-900">Hide map</button></div><div className="h-80 overflow-hidden rounded-2xl border border-gray-100"><StoreMap lat={provider.lat} lng={provider.lng} storeName={provider.store_name} /></div></div>}
            <div className="grid gap-5 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2"><div><p className="text-sm font-bold text-gray-900">Delivery time</p><p className="mt-1 text-base text-gray-500">About {provider.delivery_time_min} minutes</p></div><div><p className="text-sm font-bold text-gray-900">Delivery fee</p><p className="mt-1 text-base text-gray-500">₱{provider.delivery_fee}</p></div></div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewFilters({
  rating,
  sort,
  onRatingChange,
  onSortChange,
}: {
  rating: 'all' | 1 | 2 | 3 | 4 | 5
  sort: 'newest' | 'highest' | 'lowest'
  onRatingChange: (rating: 'all' | 1 | 2 | 3 | 4 | 5) => void
  onSortChange: (sort: 'newest' | 'highest' | 'lowest') => void
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter reviews by rating">
        {(['all', 5, 4, 3, 2, 1] as const).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onRatingChange(value)}
            aria-pressed={rating === value}
            className={`min-h-10 shrink-0 rounded-xl px-3 text-sm font-semibold transition-colors ${
              rating === value
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-yellow-300 hover:text-gray-900'
            }`}
          >
            {value === 'all' ? 'All reviews' : `${value} star${value === 1 ? '' : 's'}`}
          </button>
        ))}
      </div>
      <label className="shrink-0">
        <span className="sr-only">Sort reviews</span>
        <select
          value={sort}
          onChange={event => onSortChange(event.target.value as typeof sort)}
          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-water-400 focus:ring-2 focus:ring-water-100 sm:w-auto"
        >
          <option value="newest">Newest</option>
          <option value="highest">Highest rating</option>
          <option value="lowest">Lowest rating</option>
        </select>
      </label>
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
  product: { id: string; name: string; description: string | null; price: number; unit: string; is_available: boolean; stock_quantity: number; image_url: string | null; category: 'water' | 'lpg' }
  qty: number
  onAdd: () => void
  onDecrease: () => void
}) {
  const accent = product.category === 'water' ? 'text-water-600' : 'text-lpg-600'
  const fallbackBg = product.category === 'water' ? 'bg-water-50' : 'bg-lpg-50'
  const FallbackIcon = product.category === 'water' ? Droplets : Flame

  return (
    <div className={`flex min-h-36 items-center gap-4 bg-white rounded-2xl border border-gray-200 p-4 transition-shadow hover:shadow-md ${!product.is_available || product.stock_quantity === 0 ? 'opacity-50' : ''}`}>
      {/* Product image */}
      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 ${fallbackBg} flex items-center justify-center`}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <FallbackIcon className={`h-9 w-9 ${product.category === 'water' ? 'text-water-500' : 'text-lpg-500'}`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-base">{product.name}</p>
        {product.description && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
        )}
        <p className={`font-extrabold text-base mt-2 ${accent}`}>₱{product.price} <span className="text-gray-400 font-normal text-xs">/ {product.unit}</span></p>
        <p className={`text-xs mt-1 font-medium ${product.stock_quantity <= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
          {product.stock_quantity === 0 ? 'Out of stock' : `${product.stock_quantity} available`}
        </p>
      </div>

      <div className="shrink-0">
        {!product.is_available || product.stock_quantity === 0 ? (
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
            <button onClick={onAdd} disabled={qty >= product.stock_quantity} className="w-8 h-8 rounded-lg bg-water-500 disabled:bg-gray-200 text-white flex items-center justify-center hover:bg-water-600 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
