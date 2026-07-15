'use client'

import { useState, useEffect } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Droplets, Flame, Save, ToggleLeft, ToggleRight, Plus, Trash2, Shield, Megaphone, Percent, Settings2 } from 'lucide-react'

export default function AdminSettingsPage() {
  const { settings, updateSettings } = useAdmin()

  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [admins, setAdmins] = useState([
    { id: '1', name: 'Platform Admin', email: 'admin@aquagas.ph', role: 'super' },
    { id: '2', name: 'Operations Manager', email: 'ops@aquagas.ph', role: 'admin' },
  ])
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)

  useEffect(() => { setForm(settings) }, [settings])

  const changed = JSON.stringify(form) !== JSON.stringify(settings)

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    updateSettings(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleAddAdmin() {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return
    setAdmins(a => [...a, { id: Date.now().toString(), name: newAdminEmail.split('@')[0], email: newAdminEmail, role: 'admin' }])
    setNewAdminEmail('')
    setAddingAdmin(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Platform Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 font-semibold text-sm px-3 py-2 rounded-xl border border-green-100">
            ✓ Settings saved
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Platform info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-500" /> Platform Information
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Platform Name</label>
            <input
              type="text" value={form.platform_name}
              onChange={e => setForm(f => ({ ...f, platform_name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-xs text-gray-400 mt-1.5">Displayed across all three sites (customer, provider, admin).</p>
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-500" /> Commission Rate
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="number" value={form.commission_rate} min={0} max={30} step={0.5}
                onChange={e => setForm(f => ({ ...f, commission_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">%</span>
            </div>
            <div className="text-sm text-gray-500">
              per completed order
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Platform commission deducted from each provider's payout. For future billing integration.</p>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-500" /> Service Types
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-water-50 rounded-lg flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-water-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Water Delivery</p>
                  <p className="text-xs text-gray-400">Water refilling stations & gallon delivery</p>
                </div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, water_enabled: !f.water_enabled }))}>
                {form.water_enabled
                  ? <ToggleRight className="w-8 h-8 text-water-500" />
                  : <ToggleLeft className="w-8 h-8 text-gray-300" />}
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-lpg-50 rounded-lg flex items-center justify-center">
                  <Flame className="w-4 h-4 text-lpg-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">LPG Gas Delivery</p>
                  <p className="text-xs text-gray-400">Cooking gas cylinder delivery</p>
                </div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, lpg_enabled: !f.lpg_enabled }))}>
                {form.lpg_enabled
                  ? <ToggleRight className="w-8 h-8 text-lpg-500" />
                  : <ToggleLeft className="w-8 h-8 text-gray-300" />}
              </button>
            </div>
          </div>
          {(!form.water_enabled || !form.lpg_enabled) && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3">
              ⚠️ Disabled services will be hidden from the customer homepage and provider registration.
            </p>
          )}
        </div>

        {/* Announcement banner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-500" /> Announcement Banner
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">{form.announcement_active ? 'Visible to customers' : 'Hidden'}</span>
              <button onClick={() => setForm(f => ({ ...f, announcement_active: !f.announcement_active }))}>
                {form.announcement_active
                  ? <ToggleRight className="w-7 h-7 text-indigo-500" />
                  : <ToggleLeft className="w-7 h-7 text-gray-300" />}
              </button>
            </div>
          </div>
          <textarea
            value={form.announcement}
            onChange={e => setForm(f => ({ ...f, announcement: e.target.value }))}
            rows={2}
            placeholder="Message shown on the customer homepage…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none placeholder:text-gray-400"
          />
          {form.announcement_active && form.announcement && (
            <div className="mt-3 bg-water-50 border border-water-100 rounded-xl px-4 py-2.5">
              <p className="text-xs font-semibold text-water-700 mb-0.5">Preview on customer homepage:</p>
              <p className="text-sm text-water-800">📢 {form.announcement}</p>
            </div>
          )}
        </div>

        {/* Admin accounts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" /> Admin Accounts
            </h2>
            <button onClick={() => setAddingAdmin(a => !a)}
              className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Add Admin
            </button>
          </div>

          {addingAdmin && (
            <div className="mb-4 flex gap-2">
              <input
                type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="new-admin@aquagas.ph"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400"
              />
              <button onClick={handleAddAdmin}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Add
              </button>
              <button onClick={() => setAddingAdmin(false)}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          )}

          <div className="space-y-2">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{admin.name}</p>
                    <p className="text-xs text-gray-400">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${admin.role === 'super' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {admin.role === 'super' ? 'Super Admin' : 'Admin'}
                  </span>
                  {admin.role !== 'super' && (
                    <button onClick={() => setAdmins(a => a.filter(x => x.id !== admin.id))}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Admin accounts have full platform access. Set role = 'admin' in Supabase for real auth.</p>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={!changed || saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-200 disabled:shadow-none">
          {saving ? (
            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving…</>
          ) : (
            <><Save className="w-4 h-4" />{changed ? 'Save Changes' : 'No Changes'}</>
          )}
        </button>
      </div>
    </div>
  )
}
