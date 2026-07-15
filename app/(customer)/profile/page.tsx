'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Phone, Mail, MapPin, LogOut, Plus, Trash2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Address {
  id: string
  address: string
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [newAddr, setNewAddr] = useState('')
  const [addingAddr, setAddingAddr] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('customer_addresses')
      .select('id, address')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAddresses(data) })
  }, [user])

  async function handleAddAddress() {
    if (!newAddr.trim() || !user) return
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({ customer_id: user.id, address: newAddr.trim() })
      .select('id, address')
      .single()
    if (!error && data) {
      setAddresses(a => [...a, data])
      setNewAddr('')
      setAddingAddr(false)
    }
  }

  async function handleDeleteAddress(id: string) {
    setAddresses(a => a.filter(addr => addr.id !== id))
    await supabase.from('customer_addresses').delete().eq('id', id)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🔐</p>
        <h2 className="text-xl font-bold mb-2">Sign in to view your profile</h2>
        <Link href="/login" className="inline-block mt-4 bg-water-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-water-600 transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="space-y-4">
        {/* User Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-water-400 to-water-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {(profile?.full_name || user?.email || 'G')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile?.full_name || 'Your Name'}</p>
              <p className="text-sm text-gray-400">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
                <p className="text-sm font-medium text-gray-800">{profile?.full_name || '—'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                <p className="text-sm font-medium text-gray-800">{profile?.phone || 'Not set'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="flex items-center gap-3 py-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-800">{user?.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-water-500" />
              Saved Addresses
            </h2>
            <button onClick={() => setAddingAddr(a => !a)} className="text-water-600 text-sm font-semibold flex items-center gap-1 hover:text-water-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {addingAddr && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newAddr}
                onChange={e => setNewAddr(e.target.value)}
                placeholder="Enter address…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400"
              />
              <button
                onClick={handleAddAddress}
                className="px-4 py-2 bg-water-500 text-white rounded-xl text-sm font-semibold hover:bg-water-600 transition-colors"
              >
                Save
              </button>
            </div>
          )}

          {addresses.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No saved addresses yet.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map(addr => (
                <div key={addr.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                  <p className="text-sm text-gray-700 flex-1">{addr.address}</p>
                  <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Quick Links</h2>
          <div className="space-y-1">
            <Link href="/orders" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-water-600 transition-colors">
              <span>My Orders</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
