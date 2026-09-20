'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

export type AdminProvider = {
  id: string
  owner_name: string
  owner_email: string
  store_name: string
  service_type: 'water' | 'lpg' | 'both'
  address: string
  phone: string
  status: 'pending' | 'active' | 'suspended'
  date_registered: string
  total_orders: number
  total_revenue: number
  rating: number
  review_count: number
  delivery_fee: number
  is_open: boolean
  business_permit_url: string | null
  owner_id_url: string | null
}

export type NewProviderInput = {
  owner_name: string
  owner_email: string
  owner_phone: string
  password: string
  store_name: string
  address: string
  service_type: 'water' | 'lpg' | 'both'
  delivery_fee: number
  delivery_time_min: number
  business_permit_base64?: string
  business_permit_filename?: string
  owner_id_base64?: string
  owner_id_filename?: string
}

export type AdminCustomer = {
  id: string
  full_name: string
  email: string
  phone: string
  date_joined: string
  total_orders: number
  total_spent: number
  status: 'active' | 'suspended'
  last_order_at: string | null
}

export type AdminOrder = {
  id: string
  customer_name: string
  customer_phone: string
  provider_name: string
  provider_id: string
  service_type: 'water' | 'lpg'
  items_summary: string
  total_amount: number
  delivery_fee: number
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  payment_method: string
  delivery_address: string
  notes: string
  created_at: string
  updated_at: string
  admin_note: string
}

export type PlatformSettings = {
  platform_name: string
  commission_rate: number
  water_enabled: boolean
  lpg_enabled: boolean
  announcement: string
  announcement_active: boolean
}

export const defaultPlatformSettings: PlatformSettings = {
  platform_name: 'AquaGas',
  commission_rate: 5,
  water_enabled: true,
  lpg_enabled: true,
  announcement: '',
  announcement_active: false,
}

interface AdminState {
  providers: AdminProvider[]
  customers: AdminCustomer[]
  orders: AdminOrder[]
  settings: PlatformSettings
  isLoggedIn: boolean
  loading: boolean
}

const AdminContext = createContext<AdminState & {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  approveProvider: (id: string) => void
  suspendProvider: (id: string) => void
  reactivateProvider: (id: string) => void
  addProvider: (input: NewProviderInput) => Promise<{ success: boolean; error?: string }>
  getDocumentUrl: (path: string) => Promise<string | null>
  suspendCustomer: (id: string) => void
  reactivateCustomer: (id: string) => void
  forceCancelOrder: (id: string, note: string) => void
  updateSettings: (s: Partial<PlatformSettings>) => void
}>({
  providers: [], customers: [], orders: [], settings: defaultPlatformSettings,
  isLoggedIn: false, loading: true,
  login: async () => false, logout: () => {},
  approveProvider: () => {}, suspendProvider: () => {}, reactivateProvider: () => {},
  addProvider: async () => ({ success: false, error: 'Not initialized' }),
  getDocumentUrl: async () => null,
  suspendCustomer: () => {}, reactivateCustomer: () => {},
  forceCancelOrder: () => {}, updateSettings: () => {},
})

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminState>({
    providers: [],
    customers: [],
    orders: [],
    settings: defaultPlatformSettings,
    isLoggedIn: false,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadAdminData(session.user.id)
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadAdminData(session.user.id)
      } else {
        setState(s => ({ ...s, isLoggedIn: false, loading: false }))
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAdminData(userId: string) {
    setState(s => ({ ...s, loading: true }))

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile || profile.role !== 'admin') {
      setState(s => ({ ...s, isLoggedIn: false, loading: false }))
      return
    }

    const [providersRes, customersRes, ordersRes, settingsRes] = await Promise.all([
      supabase.from('providers').select('*, profiles(full_name, phone)'),
      supabase.from('profiles').select('*').eq('role', 'customer'),
      supabase.from('orders').select('*, providers(store_name, service_type, delivery_fee), profiles(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
    ])

    const providerRows = providersRes.data || []
    const orderRows = ordersRes.data || []

    const orderIds = orderRows.map((o: any) => o.id)
    const { data: allItems } = orderIds.length
      ? await supabase.from('order_items').select('order_id, quantity, products(name)').in('order_id', orderIds)
      : { data: [] as any[] }
    const itemsSummaryByOrder: Record<string, string> = {}
    for (const o of orderRows as any[]) {
      const items = (allItems || []).filter((i: any) => i.order_id === o.id)
      itemsSummaryByOrder[o.id] = items.map((i: any) => `${i.products?.name || 'Item'} ×${i.quantity}`).join(', ')
    }

    const providers: AdminProvider[] = providerRows.map((p: any) => {
      const providerOrders = orderRows.filter((o: any) => o.provider_id === p.id)
      const revenue = providerOrders.filter((o: any) => o.status === 'delivered').reduce((s: number, o: any) => s + o.total_amount, 0)
      return {
        id: p.id,
        owner_name: p.profiles?.full_name || 'Unknown',
        owner_email: p.owner_email || '',
        store_name: p.store_name,
        service_type: p.service_type,
        address: p.address,
        phone: p.profiles?.phone || '',
        status: p.approval_status,
        date_registered: p.created_at,
        total_orders: providerOrders.length,
        total_revenue: revenue,
        rating: p.rating,
        review_count: 0,
        delivery_fee: p.delivery_fee,
        is_open: p.is_open,
        business_permit_url: p.business_permit_url || null,
        owner_id_url: p.owner_id_url || null,
      }
    })

    const customerRows = customersRes.data || []
    const customers: AdminCustomer[] = customerRows.map((c: any) => {
      const customerOrders = orderRows.filter((o: any) => o.customer_id === c.id)
      const spent = customerOrders.filter((o: any) => o.status === 'delivered').reduce((s: number, o: any) => s + o.total_amount, 0)
      const lastOrder = customerOrders[0]
      return {
        id: c.id,
        full_name: c.full_name || 'Customer',
        email: '',
        phone: c.phone || '',
        date_joined: c.created_at,
        total_orders: customerOrders.length,
        total_spent: spent,
        status: c.suspended ? 'suspended' : 'active',
        last_order_at: lastOrder ? lastOrder.created_at : null,
      }
    })

    const orders: AdminOrder[] = orderRows.map((o: any) => ({
      id: o.id,
      customer_name: o.profiles?.full_name || 'Customer',
      customer_phone: o.profiles?.phone || '',
      provider_name: o.providers?.store_name || 'Store',
      provider_id: o.provider_id,
      service_type: o.providers?.service_type === 'lpg' ? 'lpg' : 'water',
      items_summary: itemsSummaryByOrder[o.id] || '',
      total_amount: o.total_amount,
      delivery_fee: o.providers?.delivery_fee || 0,
      status: o.status,
      payment_method: o.payment_method,
      delivery_address: o.delivery_address,
      notes: o.notes || '',
      created_at: o.created_at,
      updated_at: o.updated_at,
      admin_note: o.admin_note || '',
    }))

    const settings: PlatformSettings = settingsRes.data ? {
      platform_name: settingsRes.data.platform_name,
      commission_rate: settingsRes.data.commission_rate,
      water_enabled: settingsRes.data.water_enabled,
      lpg_enabled: settingsRes.data.lpg_enabled,
      announcement: settingsRes.data.announcement || '',
      announcement_active: settingsRes.data.announcement_active,
    } : defaultPlatformSettings

    setState({ providers, customers, orders, settings, isLoggedIn: true, loading: false })
  }

  async function login(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return false

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut()
      return false
    }

    await loadAdminData(data.user.id)
    return true
  }

  async function logout() {
    await supabase.auth.signOut()
    setState(s => ({ ...s, isLoggedIn: false }))
  }

  async function approveProvider(id: string) {
    setState(s => ({ ...s, providers: s.providers.map(p => p.id === id ? { ...p, status: 'active' as const } : p) }))
    await supabase.from('providers').update({ approval_status: 'active' }).eq('id', id)
  }
  async function suspendProvider(id: string) {
    setState(s => ({ ...s, providers: s.providers.map(p => p.id === id ? { ...p, status: 'suspended' as const, is_open: false } : p) }))
    await supabase.from('providers').update({ approval_status: 'suspended', is_open: false }).eq('id', id)
  }
  async function reactivateProvider(id: string) {
    setState(s => ({ ...s, providers: s.providers.map(p => p.id === id ? { ...p, status: 'active' as const } : p) }))
    await supabase.from('providers').update({ approval_status: 'active' }).eq('id', id)
  }

  async function addProvider(input: NewProviderInput): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, error: 'Not authenticated' }

    const res = await fetch('/api/admin/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { success: false, error: json.error || 'Failed to add provider' }

    await loadAdminData(session.user.id)
    return { success: true }
  }

  async function getDocumentUrl(path: string): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const res = await fetch('/api/admin/providers/document-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.url || null
  }

  async function suspendCustomer(id: string) {
    setState(s => ({ ...s, customers: s.customers.map(c => c.id === id ? { ...c, status: 'suspended' as const } : c) }))
    await supabase.from('profiles').update({ suspended: true }).eq('id', id)
  }
  async function reactivateCustomer(id: string) {
    setState(s => ({ ...s, customers: s.customers.map(c => c.id === id ? { ...c, status: 'active' as const } : c) }))
    await supabase.from('profiles').update({ suspended: false }).eq('id', id)
  }

  async function forceCancelOrder(id: string, note: string) {
    const updated_at = new Date().toISOString()
    setState(s => ({
      ...s,
      orders: s.orders.map(o => o.id === id ? { ...o, status: 'cancelled' as const, admin_note: note, updated_at } : o),
    }))
    await supabase.from('orders').update({ status: 'cancelled', admin_note: note, updated_at }).eq('id', id)
  }

  async function updateSettings(updates: Partial<PlatformSettings>) {
    const updated = { ...state.settings, ...updates }
    setState(s => ({ ...s, settings: updated }))
    await supabase.from('platform_settings').update(updated).eq('id', 1)
  }

  return (
    <AdminContext.Provider value={{
      ...state, login, logout,
      approveProvider, suspendProvider, reactivateProvider,
      addProvider, getDocumentUrl,
      suspendCustomer, reactivateCustomer,
      forceCancelOrder, updateSettings,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => useContext(AdminContext)
