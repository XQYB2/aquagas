import type { Metadata } from 'next'
import { BackLink } from '@/components/navigation/BackLink'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Terms & Conditions | AquaGas',
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PublicHeader />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <BackLink href="/" label="Back to home" variant="inline" className="mb-5" />

          <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: August 2025</p>

            <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">1. Acceptance of Terms</h2>
                <p>By downloading, registering, or using the AquaGas application, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the service.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">2. Description of Service</h2>
                <p>AquaGas is an on-demand delivery platform connecting customers with local water and LPG gas providers. We facilitate orders and payments but are not directly responsible for the delivery of goods.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">3. User Accounts</h2>
                <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">4. Orders and Payments</h2>
                <p>All orders are subject to acceptance by the provider. Prices are set by individual providers and may vary. Payment is currently processed as Cash on Delivery unless otherwise stated. AquaGas reserves the right to cancel orders that cannot be fulfilled.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">5. Delivery</h2>
                <p>Delivery times are estimates only. Actual delivery times may vary depending on provider availability, weather, traffic, and other factors. AquaGas is not liable for delays outside our control.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">6. Prohibited Conduct</h2>
                <p>You agree not to misuse the platform, submit fraudulent orders, harass providers or staff, or use the service for any unlawful purpose. Violations may result in immediate account termination.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">7. Limitation of Liability</h2>
                <p>AquaGas shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use our service. Our total liability shall not exceed the amount paid for the order in question.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">8. Changes to Terms</h2>
                <p>We may update these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms.</p>
              </section>

              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">9. Contact</h2>
                <p>For questions about these Terms, contact us at <a href="mailto:aquagas.business@gmail.com" className="font-medium text-water-700 hover:underline">aquagas.business@gmail.com</a>.</p>
              </section>
            </div>
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
