'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Phone, Mail, MapPin, LogOut, Plus, Trash2, ChevronRight, Home, Briefcase, Heart, MoreHorizontal, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const AddressPicker = dynamic(() => import('@/components/maps/AddressPicker').then(m => m.AddressPicker), { ssr: false })

const CATEGORIES = [
  { value: 'Home',            icon: Home,          color: 'text-blue-500',   bg: 'bg-blue-50'   },
  { value: "Partner's House", icon: Heart,         color: 'text-pink-500',   bg: 'bg-pink-50'   },
  { value: 'Work',            icon: Briefcase,     color: 'text-amber-500',  bg: 'bg-amber-50'  },
  { value: 'Other',           icon: MoreHorizontal,color: 'text-gray-400',   bg: 'bg-gray-50'   },
]

interface Address {
  id: string
  label: string | null
  address: string
  lat: number | null
  lng: number | null
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addingAddr, setAddingAddr] = useState(false)
  const [newAddr, setNewAddr]     = useState('')
  const [newLabel, setNewLabel]   = useState('Home')
  const [newLat, setNewLat]       = useState<number | null>(null)
  const [newLng, setNewLng]       = useState<number | null>(null)
  const [saving, setSaving]       = useState(false)

  // inline editing
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  // phone verification flow
  const [phoneStep, setPhoneStep] = useState<'idle' | 'enter' | 'otp'>('idle')
  const [phoneVal, setPhoneVal] = useState('')
  const [otpVal, setOtpVal] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  async function saveField(field: 'full_name', value: string) {
    if (!user) return
    setSavingProfile(true)
    setProfileError('')
    const { error } = await supabase.from('profiles').update({ [field]: value.trim() }).eq('id', user.id)
    setSavingProfile(false)
    if (error) { setProfileError(error.message); return }
    if (field === 'full_name') setEditingName(false)
  }

  async function sendPhoneOtp() {
    setPhoneError('')
    const formatted = phoneVal.trim().startsWith('+') ? phoneVal.trim() : '+63' + phoneVal.trim().replace(/^0/, '')
    setPhoneLoading(true)
    const { error } = await supabase.auth.updateUser({ phone: formatted })
    setPhoneLoading(false)
    if (error) { setPhoneError(error.message); return }
    setPhoneStep('otp')
  }

  async function verifyPhoneOtp() {
    setPhoneError('')
    const formatted = phoneVal.trim().startsWith('+') ? phoneVal.trim() : '+63' + phoneVal.trim().replace(/^0/, '')
    setPhoneLoading(true)
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otpVal.trim(), type: 'phone_change' })
    if (error) { setPhoneError(error.message); setPhoneLoading(false); return }
    // Save to profiles table too
    await supabase.from('profiles').update({ phone: formatted }).eq('id', user!.id)
    setPhoneLoading(false)
    setPhoneStep('idle')
    setOtpVal('')
  }

  useEffect(() => {
    if (!user) return
    supabase
      .from('customer_addresses')
      .select('id, label, address, lat, lng')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAddresses(data) })
  }, [user])

  async function handleAddAddress() {
    if (!newAddr.trim() || !user) return
    setSaving(true)
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({ customer_id: user.id, address: newAddr.trim(), label: newLabel, lat: newLat, lng: newLng })
      .select('id, label, address, lat, lng')
      .single()
    setSaving(false)
    if (!error && data) {
      setAddresses(a => [...a, data])
      // Cache first pinned location as user location for store filtering
      if (newLat && newLng) {
        localStorage.setItem('aq-user-location', JSON.stringify({ lat: newLat, lng: newLng }))
      }
      setNewAddr('')
      setNewLabel('Home')
      setNewLat(null)
      setNewLng(null)
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

          {profileError && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl mb-3">{profileError}</p>
          )}

          <div className="space-y-1">
            {/* Full Name */}
            <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
                {editingName ? (
                  <input
                    autoFocus
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveField('full_name', nameVal); if (e.key === 'Escape') setEditingName(false) }}
                    className="w-full text-sm font-medium text-gray-800 border-b border-water-400 focus:outline-none bg-transparent pb-0.5"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800 truncate">{profile?.full_name || '—'}</p>
                )}
              </div>
              {editingName ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => saveField('full_name', nameVal)} disabled={savingProfile} className="w-7 h-7 rounded-lg bg-water-500 text-white flex items-center justify-center hover:bg-water-600 transition-colors disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setNameVal(profile?.full_name || ''); setEditingName(true) }} className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Phone */}
            <div className="py-2.5 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                  {phoneStep === 'idle' && (
                    <p className={`text-sm font-medium truncate ${profile?.phone ? 'text-gray-800' : 'text-amber-500'}`}>
                      {profile?.phone || 'Not set — required to order'}
                    </p>
                  )}
                  {phoneStep === 'enter' && (
                    <input
                      autoFocus
                      type="tel"
                      value={phoneVal}
                      onChange={e => setPhoneVal(e.target.value)}
                      placeholder="09xxxxxxxxx"
                      className="w-full text-sm font-medium text-gray-800 border-b border-water-400 focus:outline-none bg-transparent pb-0.5 placeholder:text-gray-300"
                    />
                  )}
                  {phoneStep === 'otp' && (
                    <input
                      autoFocus
                      type="number"
                      value={otpVal}
                      onChange={e => setOtpVal(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full text-sm font-medium text-gray-800 border-b border-water-400 focus:outline-none bg-transparent pb-0.5 placeholder:text-gray-300"
                    />
                  )}
                </div>
                {phoneStep === 'idle' && (
                  <button
                    onClick={() => { setPhoneVal(profile?.phone?.replace('+63', '0') || ''); setPhoneStep('enter'); setPhoneError('') }}
                    className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {phoneStep === 'enter' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={sendPhoneOtp} disabled={phoneLoading || !phoneVal.trim()} className="w-7 h-7 rounded-lg bg-water-500 text-white flex items-center justify-center hover:bg-water-600 transition-colors disabled:opacity-50">
                      {phoneLoading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { setPhoneStep('idle'); setPhoneError('') }} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {phoneStep === 'otp' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={verifyPhoneOtp} disabled={phoneLoading || otpVal.length < 6} className="w-7 h-7 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50">
                      {phoneLoading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { setPhoneStep('idle'); setPhoneError(''); setOtpVal('') }} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {phoneStep === 'otp' && !phoneError && (
                <p className="text-xs text-water-600 mt-1.5 ml-7">OTP sent to +63{phoneVal.replace(/^0/, '')} — check your SMS</p>
              )}
              {phoneError && <p className="text-xs text-red-500 mt-1.5 ml-7">{phoneError}</p>}
            </div>

            {/* Email — read only */}
            <div className="flex items-center gap-3 py-2.5">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-800 truncate">{user?.email || '—'}</p>
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
            <button
              onClick={() => setAddingAddr(a => !a)}
              className="text-water-600 text-sm font-semibold flex items-center gap-1 hover:text-water-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Add form */}
          {addingAddr && (
            <div className="mb-4 space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const active = newLabel === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewLabel(cat.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                        active
                          ? `${cat.bg} border-transparent ${cat.color}`
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.value}
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                value={newAddr}
                onChange={e => setNewAddr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAddress()}
                placeholder="Enter address…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400"
              />
              <AddressPicker
                lat={newLat}
                lng={newLng}
                onChange={(lat, lng, addr) => {
                  setNewLat(lat)
                  setNewLng(lng)
                  if (!newAddr) setNewAddr(addr)
                }}
              />
              {!newLat && !newLng && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">Pin your location on the map — required to save</p>
                </div>
              )}
              <button
                onClick={handleAddAddress}
                disabled={!newAddr.trim() || !newLat || !newLng || saving}
                className="w-full py-2.5 bg-water-500 hover:bg-water-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Saving…' : 'Save Address'}
              </button>
            </div>
          )}

          {addresses.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No saved addresses yet.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map(addr => {
                const cat = CATEGORIES.find(c => c.value === addr.label) ?? CATEGORIES[3]
                const Icon = cat.icon
                return (
                  <div key={addr.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-8 h-8 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        {addr.label || 'Saved'}
                        {addr.lat && addr.lng && <span className="text-green-500 text-[10px]">📍 pinned</span>}
                      </p>
                      <p className="text-sm text-gray-700 truncate">{addr.address}</p>
                    </div>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
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
