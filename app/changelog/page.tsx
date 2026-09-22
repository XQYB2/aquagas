import type { Metadata } from 'next'

import { BackLink } from '@/components/navigation/BackLink'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Changelog | AquaGas',
  description: 'See the latest AquaGas features, improvements, and fixes.',
}

const RELEASES = [
  {
    version: 'Next',
    date: 'September 20, 2026',
    label: 'In development',
    labelColor: 'bg-amber-100 text-amber-800',
    changes: [
      {
        type: 'new',
        items: [
          'Secure PayMongo QR Ph checkout with signed webhook confirmation',
          'Inventory-aware ordering with atomic stock reservation and automatic restoration',
          'Provider stock quantity management with customer-facing availability',
          '30-minute customer inactivity timeout',
        ],
      },
      {
        type: 'improved',
        items: [
          'Customer, provider, and admin dashboards now adapt cleanly across phones, tablets, and desktop screens',
          'Mobile navigation and dashboard controls now provide larger touch targets',
          'Payment sessions are protected against duplicate requests, excessive retries, stale webhooks, and replay attempts',
          'PayMongo configuration is centralized in secure server environment variables',
        ],
      },
    ],
  },
  {
    version: '1.5.1',
    date: 'August 11, 2025',
    label: 'Latest',
    labelColor: 'bg-water-100 text-water-700',
    changes: [
      {
        type: 'fix',
        items: [
          'Support email updated to aquagas.business@gmail.com across all pages',
          'Terms & Conditions and Privacy Policy contact details corrected',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    date: 'August 11, 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'new',
        items: [
          'Provider dashboard — auto open/close store by scheduled hours',
          'Provider dashboard — dark mode applied globally across all pages',
          'Provider dashboard — AI assistant always renders above map (z-index fix)',
          'Provider dashboard — bulk product availability toggle (Show All / Hide All)',
          'Provider dashboard — cancel order with reason modal',
          'Provider dashboard — export orders as CSV',
          'Provider dashboard — 7-day and 30-day revenue chart toggle',
          'Customer web — reorder button on past orders',
          'Customer web — offline banner when no internet connection',
          'Customer web — session timeout with 30-minute inactivity warning',
          'Customer web — ratings & reviews after delivery',
          'Mobile app — pull-to-refresh on browse and orders screens',
          'Mobile app — GPS location auto-detect button',
          'Mobile app — product search bar on store page',
          'Mobile app — reorder from order history',
          'Mobile app — offline detection and banner',
          'Mobile app — session timeout when app is backgrounded',
          'Web — Terms & Conditions and Privacy Policy pages',
          'Web — Terms & Privacy checkboxes required on registration',
          'Web — Changelog page',
          'Custom domain: aquagas.shop',
        ],
      },
      {
        type: 'fix',
        items: [
          'Revenue chart bars now render correctly for both 7-day and 30-day views',
          'Revenue bar tooltip now visible on hover',
          'Dark/light mode toggle removed from AI chat header — use sidebar toggle instead',
          'Google OAuth redirect now correctly returns to the mobile app',
        ],
      },
    ],
  },
  {
    version: '1.4.1',
    date: 'August 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'fix',
        items: [
          'PIN required for checkout and address changes',
          'Phone OTP flow improvements',
          'Store cart bar always visible at bottom',
          'Loading screen added on app launch',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    date: 'August 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'new',
        items: [
          'Logo refresh and branding update',
          'AI chatbot (AquaBot) fixes and improvements',
          '15km radius filter for nearby store browsing',
          'Phone gate — phone number required before ordering',
          'Profile editing for customers',
          'Provider onboarding tutorial',
        ],
      },
    ],
  },
  {
    version: '1.3.2',
    date: 'July 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'fix',
        items: [
          'Fixed batch slot management on provider side',
        ],
      },
    ],
  },
  {
    version: '1.3.1',
    date: 'July 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'new',
        items: [
          'Batch delivery scheduling for providers',
          'Nearby stores map view for customers',
          'Dark / Light theme toggle for provider dashboard',
        ],
      },
      {
        type: 'fix',
        items: [
          'AquaBot stability fixes',
          'GCash payment not going through — resolved',
          'Pending GCash order status handling fixed',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: 'July 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'new',
        items: [
          'QR Ph payments via PayMongo',
          'Saved delivery locations for customers',
          'Product photos for provider listings',
          'Provider AI assistant (separate Gemini API key)',
          'AquaBot auto-fallback through Gemini models on rate limit',
          'CORS support for mobile AquaBot and payment routes',
        ],
      },
    ],
  },
  {
    version: '1.2.2',
    date: 'July 2025',
    label: 'Release',
    labelColor: 'bg-gray-100 text-gray-600',
    changes: [
      {
        type: 'fix',
        items: [
          'Google Sign-In and Sign-Out flow fixed',
          'OAuth callback using cookie-based PKCE client for reliability',
          'Error logging added to OAuth callback for easier debugging',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: 'July 2025',
    label: 'Initial Release',
    labelColor: 'bg-green-100 text-green-700',
    changes: [
      {
        type: 'new',
        items: [
          'Customer app — browse nearby water & LPG providers',
          'Customer app — place orders with Cash on Delivery',
          'Customer app — real-time order tracking and status updates',
          'Customer app — delivery address management',
          'Provider dashboard — order management and status updates',
          'Provider dashboard — product management with categories',
          'Provider dashboard — delivery map with order pins',
          'Provider dashboard — wallet and earnings tracking',
          'Provider dashboard — batch delivery slots',
          'Mobile app — onboarding flow for new users',
          'Mobile app — phone OTP verification',
          'Mobile app — Google sign-in',
          'Mobile app — push notifications for order updates',
        ],
      },
    ],
  },
]

const TYPE_STYLE: Record<string, { label: string; color: string; dot: string }> = {
  new:      { label: 'New',      color: 'text-blue-700 bg-blue-50 border-blue-100',       dot: 'bg-blue-400' },
  fix:      { label: 'Fix',      color: 'text-red-700 bg-red-50 border-red-100',          dot: 'bg-red-400' },
  improved: { label: 'Improved', color: 'text-purple-700 bg-purple-50 border-purple-100', dot: 'bg-purple-400' },
}

export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PublicHeader />

      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <BackLink href="/" label="Back to home" variant="inline" className="mb-5" />

          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">What&apos;s new</h1>
          <p className="mb-8 text-base text-gray-500 sm:mb-10">All notable changes to AquaGas are documented here.</p>

        {/* Releases */}
        <div className="space-y-6">
          {RELEASES.map(release => (
            <article key={release.version} className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">
              {/* Release header */}
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-900">{release.version === 'Next' ? 'Next' : `v${release.version}`}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${release.labelColor}`}>
                    {release.label}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">{release.date}</span>
              </div>

              {/* Changes */}
              <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
                {release.changes.map((group, gi) => {
                  const style = TYPE_STYLE[group.type] ?? TYPE_STYLE.new
                  return (
                    <div key={gi}>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${style.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                      <ul className="space-y-2">
                        {group.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2.5 text-base leading-7 text-gray-600">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>

          <p className="mt-10 text-center text-xs text-gray-400">
            AquaGas · <a href="mailto:aquagas.business@gmail.com" className="hover:text-gray-600">aquagas.business@gmail.com</a>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
