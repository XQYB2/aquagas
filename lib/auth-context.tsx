'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  profile: {
    id: string
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    role: 'customer' | 'provider' | 'admin'
    suspended: boolean
  } | null
}

const AuthContext = createContext<AuthState & {
  signOut: () => Promise<void>
}>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    profile: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, session, user: session?.user ?? null, loading: false }))
      if (session?.user) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/auth/reset'
        return
      }
      setState(s => ({ ...s, session, user: session?.user ?? null }))
      if (session?.user) fetchProfile(session.user.id)
      else setState(s => ({ ...s, profile: null }))
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setState(s => ({ ...s, profile: data }))
  }

  async function signOut() {
    await supabase.auth.signOut()
    setState(s => ({ ...s, user: null, session: null, profile: null }))
  }

  return <AuthContext.Provider value={{ ...state, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
