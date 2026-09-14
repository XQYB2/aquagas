import { ShoppingCart, Store, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    icon: Store,
    title: 'Choose a store',
    description: 'Browse water stations and LPG suppliers near you.',
  },
  {
    icon: ShoppingCart,
    title: 'Add to cart',
    description: 'Select your gallons or gas cylinders and quantities.',
  },
  {
    icon: Truck,
    title: 'Get it delivered',
    description: 'Cash on delivery - pay when your order arrives.',
  },
]

export function HowAquaGasWorks({ className }: { className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-8', className)}>
      <h2 className="mb-8 text-center text-xl font-bold text-gray-900 dark:text-gray-100">How AquaGas works</h2>
      <ol className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
        {STEPS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-4 border-t border-gray-100 py-5 first:border-t-0 first:pt-0 last:pb-0 dark:border-gray-800 md:block md:border-0 md:py-0 md:text-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-water-100 bg-water-50 text-water-600 dark:border-water-700/30 dark:bg-water-700/30 dark:text-water-400 md:mx-auto md:mb-4">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
