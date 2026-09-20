'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

export type LegalDocument = 'terms' | 'privacy'

type LegalSection = { title: string; body: string; items?: string[] }

const DOCUMENTS: Record<LegalDocument, { title: string; updated: string; sections: LegalSection[] }> = {
  terms: {
    title: 'Terms & Conditions',
    updated: 'Last updated: August 2025',
    sections: [
      { title: '1. Acceptance of Terms', body: 'By downloading, registering, or using the AquaGas application, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the service.' },
      { title: '2. Description of Service', body: 'AquaGas is an on-demand delivery platform connecting customers with local water and LPG gas providers. We facilitate orders and payments but are not directly responsible for the delivery of goods.' },
      { title: '3. User Accounts', body: 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.' },
      { title: '4. Orders and Payments', body: 'All orders are subject to acceptance by the provider. Prices are set by individual providers and may vary. Available payment methods are shown during checkout. AquaGas reserves the right to cancel orders that cannot be fulfilled.' },
      { title: '5. Delivery', body: 'Delivery times are estimates only. Actual delivery times may vary depending on provider availability, weather, traffic, and other factors. AquaGas is not liable for delays outside our control.' },
      { title: '6. Prohibited Conduct', body: 'You agree not to misuse the platform, submit fraudulent orders, harass providers or staff, or use the service for any unlawful purpose. Violations may result in immediate account termination.' },
      { title: '7. Limitation of Liability', body: 'AquaGas shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use our service. Our total liability shall not exceed the amount paid for the order in question.' },
      { title: '8. Changes to Terms', body: 'We may update these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms.' },
      { title: '9. Contact', body: 'For questions about these Terms, contact us at aquagas.business@gmail.com.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: August 2025',
    sections: [
      { title: '1. Information We Collect', body: 'We collect information you provide directly: full name, phone number, email address, and delivery address. We also collect usage data such as order history, app activity, and device information to improve our service.' },
      { title: '2. How We Use Your Information', body: 'We use your information for the following purposes:', items: ['To process and fulfill your orders', 'To send order status notifications', 'To improve our platform and services', 'To communicate important updates about your account', 'To comply with legal obligations'] },
      { title: '3. Sharing of Information', body: 'We share your delivery address and contact number with the provider fulfilling your order. We do not sell your personal information to third parties. We may share data with service providers, such as Supabase and Google, under confidentiality agreements.' },
      { title: '4. Location Data', body: 'With your permission, we collect your location to show nearby providers and pre-fill delivery addresses. Location data is only used within the app and is not stored beyond your session unless saved as an address.' },
      { title: '5. Data Security', body: 'We use industry-standard security measures including encrypted connections (HTTPS) and secure authentication. However, no method of transmission over the internet is 100% secure.' },
      { title: '6. Your Rights', body: 'You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also delete your account through the app settings.' },
      { title: '7. Cookies', body: 'Our web platform uses cookies to maintain your session and remember preferences. You can disable cookies in your browser settings, though this may affect functionality.' },
      { title: "8. Children's Privacy", body: 'AquaGas is not intended for users under 13 years of age. We do not knowingly collect personal information from children.' },
      { title: '9. Changes to This Policy', body: 'We may update this Privacy Policy periodically. We will notify you of significant changes via the app or email.' },
      { title: '10. Contact', body: 'For privacy concerns or data requests, contact us at aquagas.business@gmail.com.' },
    ],
  },
}

type Props = {
  documentType: LegalDocument | null
  onClose: () => void
  onAccept: (documentType: LegalDocument) => void
}

export function LegalAgreementDialog({ documentType, onClose, onAccept }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  useEffect(() => {
    if (!documentType) return

    setReachedEnd(false)
    const previousOverflow = window.document.body.style.overflow
    window.document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const frame = window.requestAnimationFrame(() => {
      const area = scrollRef.current
      if (area && area.scrollHeight <= area.clientHeight + 8) setReachedEnd(true)
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      window.document.body.style.overflow = previousOverflow
    }
  }, [documentType, onClose])

  if (!documentType) return null
  const content = DOCUMENTS[documentType]

  function checkScroll() {
    const area = scrollRef.current
    if (area && area.scrollTop + area.clientHeight >= area.scrollHeight - 16) setReachedEnd(true)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-950/55 sm:items-center sm:p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="legal-dialog-title" className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="legal-dialog-title" className="text-lg font-bold text-gray-900">{content.title}</h2>
            <p className="mt-1 text-xs text-gray-400">{content.updated}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${content.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-400">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div ref={scrollRef} onScroll={checkScroll} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-sm leading-7 text-gray-600 focus-visible:outline-none sm:px-6">
          <div className="space-y-6">
            {content.sections.map(section => (
              <section key={section.title}>
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                <p className="mt-1">{section.body}</p>
                {section.items && <ul className="mt-2 list-disc space-y-1 pl-5">{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
              </section>
            ))}
            <div className="h-px" aria-hidden="true" />
          </div>
        </div>

        <footer className="border-t border-gray-100 bg-white px-5 py-4 sm:rounded-b-2xl sm:px-6">
          {!reachedEnd && <p className="mb-3 text-center text-xs font-medium text-gray-500">Scroll to the end to enable acceptance.</p>}
          <button type="button" disabled={!reachedEnd} onClick={() => onAccept(documentType)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-water-500 px-5 text-sm font-bold text-white transition-colors hover:bg-water-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-400 focus-visible:ring-offset-2">
            {reachedEnd && <Check className="h-4 w-4" aria-hidden="true" />}
            Accept {content.title}
          </button>
        </footer>
      </section>
    </div>
  )
}
