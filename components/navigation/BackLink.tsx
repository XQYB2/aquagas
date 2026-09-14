import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type BackLinkProps = {
  href: string
  label?: string
  variant?: 'surface' | 'inverse' | 'inline'
  iconOnly?: boolean
  className?: string
}

const VARIANT_STYLES = {
  surface: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
  inverse: 'border border-white/30 bg-black/10 text-white hover:bg-black/20',
  inline: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
}

export function BackLink({
  href,
  label = 'Back',
  variant = 'surface',
  iconOnly = false,
  className,
}: BackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2',
        iconOnly ? 'px-0' : 'gap-2 px-3',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </Link>
  )
}
