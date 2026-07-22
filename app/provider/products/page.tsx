'use client'

import { useRef, useState } from 'react'
import { useProvider } from '@/lib/provider-context'
import { Plus, Pencil, Trash2, Droplets, Flame, ToggleLeft, ToggleRight, X, ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ProviderProduct } from '@/lib/provider-context'

type ProductForm = {
  name: string
  description: string
  price: string
  unit: string
  category: 'water' | 'lpg'
  is_available: boolean
  image_url: string | null
}

const EMPTY_FORM: ProductForm = {
  name: '', description: '', price: '', unit: 'gallon', category: 'water', is_available: true, image_url: null,
}

export default function ProductsPage() {
  const { products, updateProduct, addProduct, deleteProduct } = useProvider()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const waterProducts = products.filter(p => p.category === 'water')
  const lpgProducts = products.filter(p => p.category === 'lpg')

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(product: ProviderProduct) {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      unit: product.unit,
      category: product.category,
      is_available: product.is_available,
      image_url: product.image_url ?? null,
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `products/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    }
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      unit: form.unit.trim() || 'gallon',
      category: form.category,
      image_url: form.image_url,
      is_available: form.is_available,
    }
    if (editingId) {
      updateProduct(editingId, payload)
    } else {
      addProduct(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleDelete(id: string) {
    await new Promise(r => setTimeout(r, 300))
    deleteProduct(id)
    setDeleteConfirm(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-water-500 hover:bg-water-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-water-200"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Water Section */}
      {waterProducts.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-water-500" />
            <h2 className="font-semibold text-gray-700 text-sm">Water Products</h2>
            <span className="text-xs text-gray-400">({waterProducts.length})</span>
          </div>
          <div className="space-y-2">
            {waterProducts.map(p => <ProductRow key={p.id} product={p} onEdit={() => openEdit(p)} onDelete={() => setDeleteConfirm(p.id)} onToggle={() => updateProduct(p.id, { is_available: !p.is_available })} />)}
          </div>
        </section>
      )}

      {/* LPG Section */}
      {lpgProducts.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-lpg-500" />
            <h2 className="font-semibold text-gray-700 text-sm">LPG Products</h2>
            <span className="text-xs text-gray-400">({lpgProducts.length})</span>
          </div>
          <div className="space-y-2">
            {lpgProducts.map(p => <ProductRow key={p.id} product={p} onEdit={() => openEdit(p)} onDelete={() => setDeleteConfirm(p.id)} onToggle={() => updateProduct(p.id, { is_available: !p.is_available })} />)}
          </div>
        </section>
      )}

      {products.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 text-sm mb-4">No products yet. Add your first one!</p>
          <button onClick={openAdd} className="bg-water-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-water-600 transition-colors">
            Add Product
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Product Image */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Product Photo</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-water-300 hover:bg-water-50 transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden relative"
                >
                  {form.image_url ? (
                    <>
                      <img src={form.image_url} alt="Product" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-semibold">Change Photo</p>
                      </div>
                    </>
                  ) : uploading ? (
                    <div className="w-5 h-5 border-2 border-water-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-gray-300" />
                      <p className="text-xs text-gray-400">Tap to upload photo</p>
                      <p className="text-xs text-gray-300">Default: 💧 or 🔥 icon</p>
                    </>
                  )}
                </button>
                {form.image_url && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, image_url: null }))} className="mt-1 text-xs text-red-400 hover:underline">
                    Remove photo
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 5-Gallon Round Container" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description…" rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Price (₱) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                  <input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="gallon / cylinder / set" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                <div className="flex gap-2">
                  {(['water', 'lpg'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: cat }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.category === cat
                          ? cat === 'water' ? 'border-water-500 bg-water-50 text-water-700' : 'border-lpg-500 bg-lpg-50 text-lpg-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {cat === 'water' ? <Droplets className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                      {cat === 'water' ? 'Water' : 'LPG Gas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Available for Order</p>
                  <p className="text-xs text-gray-400">Customers can add this to cart</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}>
                  {form.is_available
                    ? <ToggleRight className="w-8 h-8 text-water-500" />
                    : <ToggleLeft className="w-8 h-8 text-gray-300" />
                  }
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.price || saving}
                className="flex-1 py-3 rounded-xl bg-water-500 hover:bg-water-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-2">Delete product?</h3>
            <p className="text-gray-500 text-sm mb-6">This cannot be undone. Active orders won't be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductRow({ product, onEdit, onDelete, onToggle }: {
  product: ProviderProduct
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 ${!product.is_available ? 'opacity-60' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${product.category === 'water' ? 'bg-water-50' : 'bg-lpg-50'}`}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : product.category === 'water' ? (
          <Droplets className="w-5 h-5 text-water-500" />
        ) : (
          <Flame className="w-5 h-5 text-lpg-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
        <p className="text-xs text-gray-400 truncate">{product.description || 'No description'}</p>
        <p className={`text-sm font-bold mt-0.5 ${product.category === 'water' ? 'text-water-600' : 'text-lpg-600'}`}>
          ₱{product.price} <span className="text-gray-400 font-normal text-xs">/ {product.unit}</span>
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title={product.is_available ? 'Mark unavailable' : 'Mark available'}>
          {product.is_available
            ? <ToggleRight className="w-5 h-5 text-water-500" />
            : <ToggleLeft className="w-5 h-5 text-gray-300" />
          }
        </button>
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Pencil className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  )
}
