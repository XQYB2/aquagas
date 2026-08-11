'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const INACTIVE_MS = 30 * 60 * 1000  // 30 min
const WARN_BEFORE_MS = 60 * 1000    // warn 1 min before

const EVENTS = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart']

export function SessionTimeout() {
  const { user, signOut } = useAuth()
  const [warning, setWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function reset() {
    if (!user) return
    setWarning(false)
    if (countRef.current) clearInterval(countRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warnRef.current) clearTimeout(warnRef.current)

    warnRef.current = setTimeout(() => {
      setWarning(true)
      setCountdown(60)
      countRef.current = setInterval(() => setCountdown(c => c - 1), 1000)
    }, INACTIVE_MS - WARN_BEFORE_MS)

    timeoutRef.current = setTimeout(() => {
      signOut()
    }, INACTIVE_MS)
  }

  useEffect(() => {
    if (!user) return
    reset()
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, reset))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warnRef.current) clearTimeout(warnRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [user])

  // Auto sign-out when countdown hits 0
  useEffect(() => {
    if (countdown <= 0 && warning) signOut()
  }, [countdown, warning])

  if (!warning) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
        <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">⏰</span>
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Still there?</h2>
          <p className="text-sm text-gray-500 mt-1">
            You'll be signed out in <span className="font-bold text-gray-900">{countdown}s</span> due to inactivity.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 py-2.5 rounded-xl bg-water-500 hover:bg-water-600 text-white text-sm font-semibold transition-colors"
          >
            Stay signed in
          </button>
          <button
            onClick={signOut}
            className="py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
