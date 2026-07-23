'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const saved = localStorage.getItem('aq-theme') as Theme | null
    if (saved) apply(saved)
  }, [])

  function apply(t: Theme) {
    setThemeState(t)
    localStorage.setItem('aq-theme', t)
    const root = document.documentElement
    root.setAttribute('data-theme', t)
    // also toggle .dark class so Tailwind dark: variants work
    root.classList.toggle('dark', t === 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
