import Link from 'next/link'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="AquaGas home" className={`flex shrink-0 items-center gap-2 rounded-xl font-bold ${focusRing}`}>
          <img src="/logo.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="text-lg">
            <span className="text-water-600">Aqua</span>
            <span className="text-red-600">Gas</span>
          </span>
        </Link>

        <nav aria-label="Public navigation" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className={`hidden h-11 items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 min-[360px]:inline-flex ${focusRing}`}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-water-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800 ${focusRing}`}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  )
}
