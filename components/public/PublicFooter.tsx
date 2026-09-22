'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const footerLink = 'rounded text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2'

export function PublicFooter() {
  const { user, profile } = useAuth()
  const homeHref = !user
    ? '/'
    : profile?.role === 'provider'
      ? '/provider'
      : profile?.role === 'admin'
        ? '/admin'
        : '/home'

  return (
    <footer className="w-full min-w-0 border-t border-gray-100 bg-white px-[max(1rem,env(safe-area-inset-left))] py-7 sm:px-4 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-2">
        <Link href={homeHref} aria-label="AquaGas home" className="flex w-fit items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2">
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-black">
            <span className="text-water-600">Aqua</span>
            <span className="text-red-600">Gas</span>
          </span>
        </Link>

        <nav aria-label="Footer navigation" className="flex min-w-0 flex-wrap gap-x-4 gap-y-3 sm:justify-center sm:gap-x-5">
          <Link href="/about" className={footerLink}>About</Link>
          <Link href="/terms" className={footerLink}>Terms</Link>
          <Link href="/privacy" className={footerLink}>Privacy</Link>
          <Link href="/changelog" className={footerLink}>Changelog</Link>
          <a href="mailto:aquagas.business@gmail.com" className={footerLink}>Contact</a>
        </nav>

        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} AquaGas</p>
      </div>
    </footer>
  )
}
