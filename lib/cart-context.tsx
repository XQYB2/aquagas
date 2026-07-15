'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'

export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  unit: string
  category: 'water' | 'lpg'
}

interface CartState {
  items: CartItem[]
  provider_id: string | null
  provider_name: string | null
  delivery_fee: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem & { provider_id: string; provider_name: string; delivery_fee: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QTY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState }

const initialState: CartState = {
  items: [],
  provider_id: null,
  provider_name: null,
  delivery_fee: 0,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { provider_id, provider_name, delivery_fee, ...item } = action.payload
      if (state.provider_id && state.provider_id !== provider_id) {
        // Different provider — replace cart
        return { items: [{ ...item, quantity: item.quantity || 1 }], provider_id, provider_name, delivery_fee }
      }
      const existing = state.items.find(i => i.product_id === item.product_id)
      if (existing) {
        return {
          ...state,
          provider_id,
          provider_name,
          delivery_fee,
          items: state.items.map(i =>
            i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return {
        ...state,
        provider_id,
        provider_name,
        delivery_fee,
        items: [...state.items, { ...item, quantity: 1 }],
      }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items
          .map(i => i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i)
          .filter(i => i.quantity > 0),
      }
    case 'CLEAR_CART':
      return initialState
    case 'LOAD_CART':
      return action.payload
    default:
      return state
  }
}

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  totalItems: number
  subtotal: number
  total: number
} | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  useEffect(() => {
    const saved = localStorage.getItem('aquagas_cart')
    if (saved) {
      try {
        dispatch({ type: 'LOAD_CART', payload: JSON.parse(saved) })
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('aquagas_cart', JSON.stringify(state))
  }, [state])

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = state.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const total = subtotal + (state.items.length > 0 ? state.delivery_fee : 0)

  return (
    <CartContext.Provider value={{ state, dispatch, totalItems, subtotal, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
