import type { Metadata } from 'next'

import { BackLink } from '@/components/navigation/BackLink'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Privacy Policy | AquaGas',
  description: 'Learn how AquaGas collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PublicHeader />

      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <BackLink href="/" label="Back to home" variant="inline" className="mb-5" />

          <article className="rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-10 lg:p-12">
            <div className="max-w-4xl">
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Privacy Policy</h1>
            <p className="mb-10 text-base text-gray-400">Last updated: August 2025</p>

            <div className="space-y-8 text-base leading-8 text-gray-700 [&_h2]:text-lg [&_h2]:font-bold">
              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">1. Information We Collect</h2>
                <p>We collect information you provide directly: full name, phone number, email address, and delivery address. We also collect usage data such as order history, app activity, and device information to improve our service.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">2. How We Use Your Information</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>To process and fulfill your orders</li>
                  <li>To send order status notifications</li>
                  <li>To improve our platform and services</li>
                  <li>To communicate important updates about your account</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">3. Sharing of Information</h2>
                <p>We share your delivery address and contact number with the provider fulfilling your order. We do not sell your personal information to third parties. We may share data with service providers (for example, Supabase for database services and Google for authentication) under strict confidentiality agreements.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">4. Location Data</h2>
                <p>With your permission, we collect your location to show nearby providers and pre-fill delivery addresses. Location data is only used within the app and is not stored beyond your session unless saved as an address.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">5. Data Security</h2>
                <p>We use industry-standard security measures including encrypted connections (HTTPS) and secure authentication. However, no method of transmission over the internet is 100% secure.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">6. Your Rights</h2>
                <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also delete your account through the app settings.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">7. Cookies</h2>
                <p>Our web platform uses cookies to maintain your session and remember preferences. You can disable cookies in your browser settings, though this may affect functionality.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">8. Children&apos;s Privacy</h2>
                <p>AquaGas is not intended for users under 13 years of age. We do not knowingly collect personal information from children.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">9. Changes to This Policy</h2>
                <p>We may update this Privacy Policy periodically. We will notify you of significant changes via the app or email.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">10. Contact</h2>
                <p>For privacy concerns or data requests, contact us at <a href="mailto:aquagas.business@gmail.com" className="font-medium text-water-600 hover:text-water-700">aquagas.business@gmail.com</a>.</p>
              </section>
            </div>
            </div>
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
