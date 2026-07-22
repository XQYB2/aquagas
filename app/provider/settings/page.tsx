'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/provider-context'
import { supabase } from '@/lib/supabase'
import { Store, Clock, Truck, Phone, MapPin, Star, Save, ToggleLeft, ToggleRight, Droplets, Flame, ImagePlus } from 'lucide-react'

export default function ProviderSettingsPage() {
  const { store, updateStore } = useProvider()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')

  async function handleLogoUpload(file: File) {
    if (!store) return
    setLogoError('')
    setUploadingLogo(true)

    const ext = file.name.split('.').pop()
    const path = `${store.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setLogoError(uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('store-logos').getPublicUrl(path)
    await updateStore({ logo_url: `${data.publicUrl}?t=${Date.now()}` })
    setUploadingLogo(false)
  }

  const [form, setForm] = useState({
    store_name: '',
    address: '',
    phone: '',
    description: '',
    service_type: 'water' as 'water' | 'lpg' | 'both',
    delivery_fee: '',
    delivery_time_min: '',
    is_open: true,
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)


  useEffect(() => {
    if (store) {
      setForm({
        store_name: store.store_name,
        address: store.address,
        phone: store.phone,
        description: store.description,
        service_type: store.service_type,
        delivery_fee: store.delivery_fee.toString(),
        delivery_time_min: store.delivery_time_min.toString(),
        is_open: store.is_open,
      })
    }
  }, [store])

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    updateStore({
      store_name: form.store_name,
      address: form.address,
      phone: form.phone,
      description: form.description,
      service_type: form.service_type,
      delivery_fee: parseFloat(form.delivery_fee) || 0,
      delivery_time_min: parseInt(form.delivery_time_min) || 30,
      is_open: form.is_open,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const changed = store && (
    form.store_name !== store.store_name ||
    form.address !== store.address ||
    form.phone !== store.phone ||
    form.description !== store.description ||
    form.service_type !== store.service_type ||
    form.delivery_fee !== store.delivery_fee.toString() ||
    form.delivery_time_min !== store.delivery_time_min.toString() ||
    form.is_open !== store.is_open
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Store Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 font-semibold text-sm px-3 py-2 rounded-xl border border-green-100">
            ✓ Settings saved
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Store Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Store Status</h2>
              <p className="text-xs text-gray-400 mt-0.5">Customers can only order from open stores</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, is_open: !f.is_open }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                form.is_open
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {form.is_open
                ? <><ToggleRight className="w-5 h-5" /> Open</>
                : <><ToggleLeft className="w-5 h-5" /> Closed</>
              }
            </button>
          </div>
        </div>

        {/* Store Logo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-water-500" />
            Store Photo
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs">No photo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-block px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                {uploadingLogo ? 'Uploading…' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleLogoUpload(file)
                    e.target.value = ''
                  }}
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">Shown on your store page and browse cards.</p>
              {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-water-500" />
            Store Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Store Name</label>
              <input
                type="text"
                value={form.store_name}
                onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Contact Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="09xxxxxxxxx"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Store Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Tell customers about your store…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 resize-none placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Service Type */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Service Type</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['water', 'lpg', 'both'] as const).map(type => (
              <button
                key={type}
                onClick={() => setForm(f => ({ ...f, service_type: type }))}
                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                  form.service_type === type
                    ? type === 'water'
                      ? 'border-water-500 bg-water-50 text-water-700'
                      : type === 'lpg'
                      ? 'border-lpg-500 bg-lpg-50 text-lpg-700'
                      : 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {type === 'water' && <Droplets className="w-5 h-5" />}
                {type === 'lpg' && <Flame className="w-5 h-5" />}
                {type === 'both' && <span className="text-lg">💧🔥</span>}
                {type === 'water' ? 'Water Only' : type === 'lpg' ? 'LPG Only' : 'Both'}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-water-500" />
            Delivery Settings
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Delivery Fee (₱)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₱</span>
                <input
                  type="number"
                  value={form.delivery_fee}
                  onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
                  min="0"
                  step="5"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Est. Delivery (min)
              </label>
              <input
                type="number"
                value={form.delivery_time_min}
                onChange={e => setForm(f => ({ ...f, delivery_time_min: e.target.value }))}
                min="5"
                step="5"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            These are shown to customers on the browse page.
          </p>
        </div>

        {/* Rating display */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Store Rating</h2>
              <p className="text-xs text-gray-400 mt-0.5">Based on customer reviews</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-xl font-bold text-gray-900">{store?.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!changed || saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-water-500 hover:bg-water-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-all shadow-lg shadow-water-200 disabled:shadow-none"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {changed ? 'Save Changes' : 'No Changes'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
