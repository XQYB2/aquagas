'use client'

import { useCart } from '@/lib/cart-context'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function CartBar() {
  const { state, dispatch, totalItems, subtotal, total } = useCart()

  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:w-96">
      <div className="bg-gray-900 rounded-2xl shadow-2xl text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-water-400" />
            <span className="font-semibold text-sm">{state.provider_name}</span>
          </div>
          <button
            onClick={() => dispatch({ type: 'CLEAR_CART' })}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {state.items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-300 flex-1 truncate pr-2">{item.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, quantity: item.quantity - 1 } })}
                  className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, quantity: item.quantity + 1 } })}
                  className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-gray-300 w-16 text-right">₱{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Subtotal ₱{subtotal} + delivery ₱{state.delivery_fee}</div>
            <div className="font-bold text-lg">₱{total}</div>
          </div>
          <Link
            href="/checkout"
            className="flex items-center gap-2 bg-water-500 hover:bg-water-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Checkout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
