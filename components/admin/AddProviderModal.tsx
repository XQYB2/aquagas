'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { X, Upload, Loader2 } from 'lucide-react'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function AddProviderModal({ onClose }: { onClose: () => void }) {
  const { addProvider } = useAdmin()
  const [form, setForm] = useState({
    owner_name: '', owner_email: '', owner_phone: '', password: '',
    store_name: '', address: '', service_type: 'water' as 'water' | 'lpg' | 'both',
    delivery_fee: 30, delivery_time_min: 45,
  })
  const [permitFile, setPermitFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      const [permitBase64, idBase64] = await Promise.all([
        permitFile ? fileToBase64(permitFile) : Promise.resolve(undefined),
        idFile ? fileToBase64(idFile) : Promise.resolve(undefined),
      ])

      const result = await addProvider({
        ...form,
        business_permit_base64: permitBase64,
        business_permit_filename: permitFile?.name,
        owner_id_base64: idBase64,
        owner_id_filename: idFile?.name,
      })

      if (!result.success) {
        setError(result.error || 'Failed to add provider.')
        setSubmitting(false)
        return
      }
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-900">Add Provider</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Account</p>
            <div className="space-y-3">
              <Field label="Owner Name" value={form.owner_name} onChange={v => update('owner_name', v)} required />
              <Field label="Owner Email" type="email" value={form.owner_email} onChange={v => update('owner_email', v)} required />
              <Field label="Owner Phone" value={form.owner_phone} onChange={v => update('owner_phone', v)} />
              <Field label="Temporary Password" type="password" value={form.password} onChange={v => update('password', v)} required minLength={6} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Business</p>
            <div className="space-y-3">
              <Field label="Store Name" value={form.store_name} onChange={v => update('store_name', v)} required />
              <Field label="Address" value={form.address} onChange={v => update('address', v)} required />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Service Type</label>
                <select value={form.service_type} onChange={e => update('service_type', e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="water">Water</option>
                  <option value="lpg">LPG</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Delivery Fee (₱)" type="number" value={String(form.delivery_fee)} onChange={v => update('delivery_fee', Number(v))} />
                <Field label="Delivery Time (min)" type="number" value={String(form.delivery_time_min)} onChange={v => update('delivery_time_min', Number(v))} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documents (optional)</p>
            <div className="space-y-3">
              <FileField label="Business Permit" file={permitFile} onChange={setPermitFile} />
              <FileField label="Owner Valid ID" file={idFile} onChange={setIdFile} />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Provider Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, minLength }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}{required && <span className="text-red-400"> *</span>}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} required={required} minLength={minLength}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  )
}

function FileField({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors">
        <Upload className="w-4 h-4" />
        {file ? file.name : 'Choose file…'}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
      </label>
    </div>
  )
}
