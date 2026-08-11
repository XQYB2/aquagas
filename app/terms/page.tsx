export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.svg" alt="AquaGas" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="font-black text-lg"><span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span></p>
            <p className="text-xs text-gray-400">Terms & Conditions</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: August 2025</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Acceptance of Terms</h2>
            <p>By downloading, registering, or using the AquaGas application, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. Description of Service</h2>
            <p>AquaGas is an on-demand delivery platform connecting customers with local water and LPG gas providers. We facilitate orders and payments but are not directly responsible for the delivery of goods.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. User Accounts</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Orders and Payments</h2>
            <p>All orders are subject to acceptance by the provider. Prices are set by individual providers and may vary. Payment is currently processed as Cash on Delivery unless otherwise stated. AquaGas reserves the right to cancel orders that cannot be fulfilled.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Delivery</h2>
            <p>Delivery times are estimates only. Actual delivery times may vary depending on provider availability, weather, traffic, and other factors. AquaGas is not liable for delays outside our control.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Prohibited Conduct</h2>
            <p>You agree not to misuse the platform, submit fraudulent orders, harass providers or staff, or use the service for any unlawful purpose. Violations may result in immediate account termination.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">7. Limitation of Liability</h2>
            <p>AquaGas shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use our service. Our total liability shall not exceed the amount paid for the order in question.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">8. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">9. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:aquagas.business@gmail.com" className="text-water-600 font-medium">aquagas.business@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
