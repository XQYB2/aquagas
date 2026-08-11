import Link from 'next/link'

const RELEASES = [
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
          'GCash payments via Konfirma payment gateway',
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <Link href="/">
            <img src="/logo.svg" alt="AquaGas" className="w-10 h-10 rounded-xl" />
          </Link>
          <div>
            <p className="font-black text-lg leading-tight">
              <span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span>
            </p>
            <p className="text-xs text-gray-400">Changelog</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-1">What's new</h1>
        <p className="text-gray-400 text-sm mb-10">All notable changes to AquaGas are documented here.</p>

        {/* Releases */}
        <div className="space-y-6">
          {RELEASES.map(release => (
            <div key={release.version} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Release header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">v{release.version}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${release.labelColor}`}>
                    {release.label}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">{release.date}</span>
              </div>

              {/* Changes */}
              <div className="px-6 py-5 space-y-5">
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
                          <li key={ii} className="flex items-start gap-2.5 text-sm text-gray-600">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          AquaGas v1.5.1 · <a href="mailto:aquagas.business@gmail.com" className="hover:text-gray-600">aquagas.business@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
