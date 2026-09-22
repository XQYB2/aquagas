'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { LegalAgreementDialog, type LegalDocument } from '@/components/auth/LegalAgreementDialog'
import { withTimeout } from '@/lib/async-timeout'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [openDocument, setOpenDocument] = useState<LegalDocument | null>(null)

  const legalAccepted = agreedTerms && agreedPrivacy

  async function handleGoogleSignUp() {
    setError('')
    if (!legalAccepted) {
      setError('Read and accept the Terms & Conditions and Privacy Policy before continuing with Google.')
      return
    }
    setGoogleLoading(true)
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?flow=signup`,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      }), 15000, 'Google sign-up took too long. Please try again.')
      if (error) throw error
      if (!data.url) throw new Error('Google sign-up could not be started. Please try again.')
      window.location.assign(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to Google. Please try again.')
      setGoogleLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^09\d{9}$/.test(phone)) {
      setError('Enter an 11-digit mobile number starting with 09, for example 09690415138.')
      return
    }
    if (!agreedTerms || !agreedPrivacy) {
      setError('You must agree to the Terms & Conditions and Privacy Policy.')
      return
    }
    setLoading(true)

    try {
      const { error } = await withTimeout(supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim() },
        }
      }), 15000, 'Registration took too long. Please try again.')

      if (error) throw error

      // The database trigger creates the customer profile from user metadata.
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <Link href="/login" className="text-water-600 font-semibold hover:underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  if (loading || googleLoading) {
    return <AuthLoadingScreen message={googleLoading ? 'Connecting to Google…' : 'Creating your AquaGas account…'} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          aria-label="Back to landing page"
          title="Back to home"
          className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white hover:text-water-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="AquaGas" className="w-14 h-14 rounded-2xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join <span className="text-water-600 font-semibold">Aqua</span><span className="text-red-600 font-semibold">Gas</span> and order water & gas</p>
        </div>

        {/* Google sign-up */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading || !legalAccepted}
          title={!legalAccepted ? 'Accept the Terms & Conditions and Privacy Policy first' : undefined}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-70 shadow-sm"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>
        {!legalAccepted && (
          <p className="mb-4 mt-2 text-center text-xs text-gray-500">Accept both agreements below to enable Google signup.</p>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan dela Cruz" required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="09690415138"
              inputMode="numeric"
              autoComplete="tel-national"
              minLength={11}
              maxLength={11}
              pattern="09[0-9]{9}"
              required
              aria-describedby="phone-format"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400"
            />
            <p id="phone-format" className="mt-1.5 text-xs text-gray-500">Use exactly 11 digits starting with 09.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-water-300 placeholder:text-gray-400 pr-12" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms & Privacy checkboxes */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreedTerms}
                readOnly
                tabIndex={-1}
                aria-label="Terms and Conditions accepted"
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-water-500 focus:ring-water-300"
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <button type="button" onClick={() => setOpenDocument('terms')} className="font-semibold text-water-600 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-300">Terms & Conditions</button>
              </span>
            </div>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreedPrivacy}
                readOnly
                tabIndex={-1}
                aria-label="Privacy Policy accepted"
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-water-500 focus:ring-water-300"
              />
              <span className="text-sm text-gray-600">
                I accept the{' '}
                <button type="button" onClick={() => setOpenDocument('privacy')} className="font-semibold text-water-600 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-300">Privacy Policy</button>
              </span>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">{error}</div>}

          <button type="submit" disabled={loading || !agreedTerms || !agreedPrivacy} className="w-full py-3.5 rounded-xl bg-water-500 hover:bg-water-600 text-white font-bold transition-colors disabled:opacity-60 shadow-lg shadow-water-200">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-water-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      <LegalAgreementDialog
        documentType={openDocument}
        onClose={() => setOpenDocument(null)}
        onAccept={documentType => {
          if (documentType === 'terms') setAgreedTerms(true)
          if (documentType === 'privacy') setAgreedPrivacy(true)
          setOpenDocument(null)
          setError('')
        }}
      />
    </div>
  )
}
