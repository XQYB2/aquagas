'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

export type OrderStatus =
  | 'pending_payment'
  | 'placed'
  | 'confirmed'
  | 'awaiting_pickup'
  | 'picked_up'
  | 'being_prepared'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type ProviderOrder = {
  id: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  status: OrderStatus
  total_amount: number
  delivery_fee: number
  payment_method: string
  payment_status: 'unpaid' | 'pending' | 'paid'
  notes: string
  estimated_delivery: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  created_at: string
  updated_at: string
  items: { id: string; product_name: string; quantity: number; unit_price: number }[]
}

export type ProviderProduct = {
  id: string
  provider_id: string
  name: string
  description: string
  price: number
  unit: string
  category: 'water' | 'lpg'
  image_url: string | null
  is_available: boolean
}

export type ProviderStore = {
  id: string
  store_name: string
  address: string
  service_type: 'water' | 'lpg' | 'both'
  is_open: boolean
  delivery_fee: number
  delivery_time_min: number
  rating: number
  logo_url: string | null
  phone: string
  description: string
  konfirma_pk: string | null
  konfirma_sk: string | null
  konfirma_wallet_id: string | null
  konfirma_webhook_secret: string | null
}

interface ProviderState {
  store: ProviderStore | null
  products: ProviderProduct[]
  orders: ProviderOrder[]
  isLoggedIn: boolean
  loading: boolean
}

const ProviderContext = createContext<ProviderState & {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateStore: (updates: Partial<ProviderStore>) => void
  updateProduct: (id: string, updates: Partial<ProviderProduct>) => void
  addProduct: (product: Omit<ProviderProduct, 'id' | 'provider_id'>) => void
  deleteProduct: (id: string) => void
  updateOrderStatus: (id: string, status: OrderStatus, extra?: { estimated_delivery?: string }) => void
}>({
  store: null, products: [], orders: [], isLoggedIn: false, loading: true,
  login: async () => false,
  logout: () => {},
  updateStore: () => {},
  updateProduct: () => {},
  addProduct: () => {},
  deleteProduct: () => {},
  updateOrderStatus: () => {},
})

export function ProviderAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProviderState>({
    store: null,
    products: [],
    orders: [],
    isLoggedIn: false,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProviderData(session.user.id)
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ store: null, products: [], orders: [], isLoggedIn: false, loading: false })
      } else if (event === 'SIGNED_IN' && session?.user) {
        await loadProviderData(session.user.id)
      }
      // ignore TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION — already handled by getSession above
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProviderData(userId: string) {
    setState(s => ({ ...s, loading: true }))

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile || profile.role !== 'provider') {
      setState({ store: null, products: [], orders: [], isLoggedIn: false, loading: false })
      return
    }

    const { data: providerRow } = await supabase.from('providers').select('*').eq('user_id', userId).single()
    if (!providerRow) {
      setState({ store: null, products: [], orders: [], isLoggedIn: true, loading: false })
      return
    }

    const store: ProviderStore = {
      id: providerRow.id,
      store_name: providerRow.store_name,
      address: providerRow.address,
      service_type: providerRow.service_type,
      is_open: providerRow.is_open,
      delivery_fee: providerRow.delivery_fee,
      delivery_time_min: providerRow.delivery_time_min,
      rating: providerRow.rating,
      logo_url: providerRow.logo_url,
      phone: '',
      description: '',
      konfirma_pk: providerRow.konfirma_pk ?? null,
      konfirma_sk: providerRow.konfirma_sk ?? null,
      konfirma_wallet_id: providerRow.konfirma_wallet_id ?? null,
      konfirma_webhook_secret: providerRow.konfirma_webhook_secret ?? null,
    }

    const { data: productRows } = await supabase.from('products').select('*').eq('provider_id', providerRow.id)
    const products: ProviderProduct[] = (productRows || []).map(p => ({
      id: p.id,
      provider_id: p.provider_id,
      name: p.name,
      description: p.description || '',
      price: p.price,
      unit: p.unit,
      category: p.category,
      image_url: p.image_url,
      is_available: p.is_available,
    }))

    const orders = await loadOrders(providerRow.id)

    setState({ store, products, orders, isLoggedIn: true, loading: false })
  }

  async function loadOrders(providerId: string): Promise<ProviderOrder[]> {
    const { data: orderRows } = await supabase
      .from('orders')
      .select('id, status, total_amount, delivery_address, delivery_lat, delivery_lng, payment_method, payment_status, notes, estimated_delivery, created_at, updated_at, customer_id')
      .eq('provider_id', providerId)
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })

    if (!orderRows || orderRows.length === 0) return []

    const orderIds = orderRows.map((o: any) => o.id)
    const customerIds = Array.from(new Set(orderRows.map((o: any) => o.customer_id).filter(Boolean)))

    const [{ data: itemRows }, { data: profileRows }, { data: providerRow }] = await Promise.all([
      supabase.from('order_items').select('id, order_id, quantity, unit_price, products(name)').in('order_id', orderIds),
      supabase.from('profiles').select('id, full_name, phone').in('id', customerIds),
      supabase.from('providers').select('delivery_fee').eq('id', providerId).single(),
    ])

    const profileMap = Object.fromEntries((profileRows || []).map((p: any) => [p.id, p]))
    const deliveryFee = providerRow?.delivery_fee || 0

    return orderRows.map((o: any) => {
      const profile = profileMap[o.customer_id]
      return {
      id: o.id,
      customer_name: profile?.full_name || 'Customer',
      customer_phone: profile?.phone || '',
      delivery_address: o.delivery_address,
      status: o.status,
      total_amount: o.total_amount,
      delivery_fee: deliveryFee,
      payment_method: o.payment_method,
      payment_status: o.payment_status ?? 'unpaid',
      notes: o.notes || '',
      estimated_delivery: o.estimated_delivery || null,
      delivery_lat: o.delivery_lat || null,
      delivery_lng: o.delivery_lng || null,
      created_at: o.created_at,
      updated_at: o.updated_at,
      items: (itemRows || [])
        .filter((i: any) => i.order_id === o.id)
        .map((i: any) => ({ id: i.id, product_name: i.products?.name || 'Item', quantity: i.quantity, unit_price: i.unit_price })),
      }
    })
  }

  async function login(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return false

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || profile.role !== 'provider') {
      await supabase.auth.signOut()
      return false
    }

    await loadProviderData(data.user.id)
    return true
  }

  async function logout() {
    await supabase.auth.signOut()
    setState({ store: null, products: [], orders: [], isLoggedIn: false, loading: false })
  }

  async function updateStore(updates: Partial<ProviderStore>) {
    if (!state.store) return
    const { phone, description, ...dbUpdates } = updates
    const updated = { ...state.store, ...updates }
    setState(s => ({ ...s, store: updated }))
    await supabase.from('providers').update(dbUpdates).eq('id', state.store.id)
  }

  async function updateProduct(id: string, updates: Partial<ProviderProduct>) {
    setState(s => ({ ...s, products: s.products.map(p => p.id === id ? { ...p, ...updates } : p) }))
    await supabase.from('products').update(updates).eq('id', id)
  }

  async function addProduct(product: Omit<ProviderProduct, 'id' | 'provider_id'>) {
    if (!state.store) return
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, provider_id: state.store.id })
      .select()
      .single()

    if (!error && data) {
      const newProduct: ProviderProduct = {
        id: data.id,
        provider_id: data.provider_id,
        name: data.name,
        description: data.description || '',
        price: data.price,
        unit: data.unit,
        category: data.category,
        image_url: data.image_url,
        is_available: data.is_available,
      }
      setState(s => ({ ...s, products: [newProduct, ...s.products] }))
    }
  }

  async function deleteProduct(id: string) {
    setState(s => ({ ...s, products: s.products.filter(p => p.id !== id) }))
    await supabase.from('products').delete().eq('id', id)
  }

  async function updateOrderStatus(id: string, status: OrderStatus, extra?: { estimated_delivery?: string }) {
    const updated_at = new Date().toISOString()
    setState(s => ({
      ...s,
      orders: s.orders.map(o => o.id === id ? { ...o, status, updated_at, ...extra } : o),
    }))
    await supabase.from('orders').update({ status, updated_at, ...extra }).eq('id', id)
  }

  return (
    <ProviderContext.Provider value={{ ...state, login, logout, updateStore, updateProduct, addProduct, deleteProduct, updateOrderStatus }}>
      {children}
    </ProviderContext.Provider>
  )
}

export const useProvider = () => useContext(ProviderContext)
