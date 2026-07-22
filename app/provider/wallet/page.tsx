'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/provider-context'
import { supabase } from '@/lib/supabase'
import { Wallet, Eye, EyeOff, Save, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react'

export default function ProviderWalletPage() {
  const { store, updateStore } = useProvider()

  const [form, setForm] = useState({ pk: '', sk: '', wallet_id: '' })
  const [showSecrets, setShowSecrets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/payment/webhook`
    : '/api/payment/webhook'

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (store) {
      setForm({
        pk: store.konfirma_pk ?? '',
        sk: store.konfirma_sk ?? '',
        wallet_id: store.konfirma_wallet_id ?? '',
      })
    }
  }, [store])

  const isConfigured = !!(store?.konfirma_pk && store?.konfirma_sk && store?.konfirma_wallet_id)

  async function handleSave() {
    if (!store) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('providers').update({
      konfirma_pk: form.pk || null,
      konfirma_sk: form.sk || null,
      konfirma_wallet_id: form.wallet_id || null,
    }).eq('id', store.id)
    setSaving(false)
    if (err) {
      setError('Failed to save. Please try again.')
    } else {
      updateStore({
        konfirma_pk: form.pk || null,
        konfirma_sk: form.sk || null,
        konfirma_wallet_id: form.wallet_id || null,
        konfirma_webhook_secret: null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const FIELDS = [
    { label: 'Public Key (PK)', field: 'pk' as const, placeholder: 'pk_live_…', secret: false },
    { label: 'Secret Key (SK)', field: 'sk' as const, placeholder: 'sk_live_…', secret: true },
    { label: 'Wallet Account ID', field: 'wallet_id' as const, placeholder: 'Paste your wallet account ID…', secret: false },
  ]

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
        {isConfigured && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> GCash Active
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Status card */}
        <div className={`rounded-2xl border p-5 ${isConfigured ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex items-start gap-3">
            {isConfigured
              ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-semibold ${isConfigured ? 'text-green-800' : 'text-amber-800'}`}>
                {isConfigured ? 'GCash payments are enabled' : 'GCash payments not set up yet'}
              </p>
              <p className={`text-xs mt-0.5 ${isConfigured ? 'text-green-600' : 'text-amber-600'}`}>
                {isConfigured
                  ? 'Customers can choose GCash at checkout for orders from your store.'
                  : 'Fill in your Konfirma keys below to accept GCash payments. Customers will only see Cash on Delivery until this is configured.'}
              </p>
            </div>
          </div>
        </div>

        {/* Keys form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-500" />
              Konfirma GCash Keys
            </h2>
            <button
              onClick={() => setShowSecrets(s => !s)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showSecrets ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>}
            </button>
          </div>

          <div className="space-y-3">
            {FIELDS.map(({ label, field, placeholder, secret }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {label}
                </label>
                <input
                  type={secret && !showSecrets ? 'password' : 'text'}
                  value={form[field]}
                  onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setSaved(false) }}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-500">{error}</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Keys'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <CheckCircle className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>
        </div>

        {/* Webhook URL */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your Webhook URL</p>
          <p className="text-xs text-gray-400 mb-3">Paste this into your Konfirma dashboard under <strong>Settings → Webhooks</strong>. This is how AquaGas gets notified when a payment is confirmed.</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="flex-1 text-xs font-mono text-gray-700 break-all">{webhookUrl}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
        </div>

        {/* Help */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-xs text-gray-500 space-y-1.5">
          <p className="font-semibold text-gray-700 text-sm mb-2">How to get your keys</p>
          <p>1. Log in to your <strong>Konfirma</strong> dashboard.</p>
          <p>2. Go to <strong>API Keys</strong> → copy your Public Key and Secret Key.</p>
          <p>3. Go to <strong>Wallets</strong> → copy the Wallet Account ID shown next to your GCash wallet.</p>
          <p className="text-gray-400 pt-1">The webhook is handled automatically — no extra setup needed on your end.</p>
        </div>
      </div>
    </div>
  )
}
