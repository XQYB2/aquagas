export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.svg" alt="AquaGas" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="font-black text-lg"><span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span></p>
            <p className="text-xs text-gray-400">Privacy Policy</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: August 2025</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly: full name, phone number, email address, and delivery address. We also collect usage data such as order history, app activity, and device information to improve our service.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process and fulfill your orders</li>
              <li>To send order status notifications</li>
              <li>To improve our platform and services</li>
              <li>To communicate important updates about your account</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. Sharing of Information</h2>
            <p>We share your delivery address and contact number with the provider fulfilling your order. We do not sell your personal information to third parties. We may share data with service providers (e.g., Supabase for database, Google for authentication) under strict confidentiality agreements.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Location Data</h2>
            <p>With your permission, we collect your location to show nearby providers and pre-fill delivery addresses. Location data is only used within the app and is not stored beyond your session unless saved as an address.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Data Security</h2>
            <p>We use industry-standard security measures including encrypted connections (HTTPS) and secure authentication. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also delete your account through the app settings.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">7. Cookies</h2>
            <p>Our web platform uses cookies to maintain your session and remember preferences. You can disable cookies in your browser settings, though this may affect functionality.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">8. Children's Privacy</h2>
            <p>AquaGas is not intended for users under 13 years of age. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. We will notify you of significant changes via the app or email.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">10. Contact</h2>
            <p>For privacy concerns or data requests, contact us at <a href="mailto:support@aquagas.shop" className="text-water-600 font-medium">support@aquagas.shop</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
