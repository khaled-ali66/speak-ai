import { useState, useEffect } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { Brain, X, Mail, ArrowRight, Loader2, CheckCircle, MailCheck } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 'email' | 'otp' | 'success'
type Mode = 'signup' | 'signin'

type ClerkError = { errors?: { code?: string; longMessage?: string; message?: string }[] }

export function LoginModal({ open, onClose, onSuccess }: Props) {
  const { signIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn()
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp()

  const [step, setStep]       = useState<Step>('email')
  const [mode, setMode]       = useState<Mode>('signup')
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('email')
        setEmail('')
        setOtp('')
        setError('')
        setMode('signup')
      }, 300)
    }
  }, [open])

  function getErrMsg(err: unknown, fallback: string): string {
    const e = err as ClerkError
    return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || fallback
  }

  function getErrCode(err: unknown): string | undefined {
    return (err as ClerkError)?.errors?.[0]?.code
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        await signUp!.create({ emailAddress: email })
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' })
        setStep('otp')
      } else {
        await doSignIn(email)
      }
    } catch (err: unknown) {
      const code = getErrCode(err)

      if (code === 'form_identifier_exists' && mode === 'signup') {
        setMode('signin')
        setError('This email already has an account. Switching to sign in...')
        setTimeout(async () => {
          setError('')
          try {
            await doSignIn(email)
          } catch (e: unknown) {
            setError(getErrMsg(e, 'Failed to send code.'))
          }
        }, 1000)
        return
      }

      if (code === 'form_identifier_not_found' && mode === 'signin') {
        setError('No account found with this email. Create one instead?')
        return
      }

      setError(getErrMsg(err, 'Failed to send code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function doSignIn(emailAddress: string) {
    const result = await signIn!.create({ identifier: emailAddress })
    const emailFactor = result.supportedFirstFactors?.find(
      (f) => f.strategy === 'email_code'
    )

    if (!emailFactor) throw new Error('Email code factor not available')

    await signIn!.prepareFirstFactor({
      strategy: 'email_code',
      emailAddressId: (emailFactor as { emailAddressId: string }).emailAddressId,
    })
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const result = await signUp!.attemptEmailAddressVerification({ code: otp })
        if (result.status === 'complete') {
          await setSignUpActive!({ session: result.createdSessionId })
          setStep('success')
          setTimeout(() => onSuccess(), 1200)
        } else {
          setError('Verification incomplete. Please try again.')
        }
      } else {
        const result = await signIn!.attemptFirstFactor({
          strategy: 'email_code',
          code: otp,
        })
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId })
          setStep('success')
          setTimeout(() => onSuccess(), 1200)
        } else {
          setError('Sign in incomplete. Please try again.')
        }
      }
    } catch (err: unknown) {
      setError(getErrMsg(err, 'Invalid code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' })
      } else {
        await doSignIn(email)
      }
    } catch (err: unknown) {
      setError(getErrMsg(err, 'Failed to resend.'))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  if (!signInLoaded || !signUpLoaded) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease' }}
      />

      <div
        className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        style={{ animation: 'slideUp 0.25s ease' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-brand-purple to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-brand-purple to-purple-500 rounded-xl flex items-center justify-center">
              <Brain className="text-white w-4 h-4" />
            </div>
            <div>
              <div className="font-display text-[15px] font-bold text-white leading-none">SpeakSmart AI</div>
              <div className="text-[11px] text-slate-400 mt-0.5">English Learning Platform</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-brand-card2 border border-brand-border flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">

          {/* ─── STEP: EMAIL ─── */}
          {step === 'email' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <h2 className="text-xl font-bold font-display mb-1.5 text-brand-text">
                {mode === 'signin' ? 'Welcome back!' : 'Sign in to continue'}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                We'll send a 6-digit code to your email. No password needed.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-brand-muted mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      placeholder="you@example.com"
                      autoFocus
                      required
                      className="w-full bg-brand-secondary border border-brand-border rounded-xl pl-10 pr-4 py-3 text-[15px] text-brand-text outline-none focus:border-brand-purple placeholder-slate-600 transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl py-3 text-[15px] font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><span>Send code</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-brand-border text-center">
                {mode === 'signup' ? (
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => { setMode('signin'); setError('') }}
                      className="text-brand-purple-light hover:text-white font-semibold transition-colors underline underline-offset-2"
                    >
                      Sign in here
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      onClick={() => { setMode('signup'); setError('') }}
                      className="text-brand-purple-light hover:text-white font-semibold transition-colors underline underline-offset-2"
                    >
                      Create one
                    </button>
                  </p>
                )}
              </div>

              <p className="text-center text-xs text-slate-500 mt-4">
                By continuing you agree to our Terms of Service
              </p>
            </div>
          )}

          {/* ─── STEP: OTP ─── */}
          {step === 'otp' && (
            <div className="text-center py-2" style={{ animation: 'fadeUp 0.3s ease' }}>
              <div className="w-16 h-16 bg-brand-purple/15 border border-brand-purple/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-8 h-8 text-brand-purple-light" />
              </div>
              <h2 className="text-xl font-bold font-display text-brand-text mb-2">Check your email</h2>
              <p className="text-sm text-slate-400 mb-1">We sent a 6-digit code to</p>
              <p className="text-[15px] font-semibold text-brand-purple-light mb-6">{email}</p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="000000"
                  autoFocus
                  className="w-full bg-brand-secondary border border-brand-border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-brand-text outline-none focus:border-brand-purple placeholder-slate-600 transition-colors font-mono"
                />

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl py-3 text-[15px] font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Sign in'}
                </button>
              </form>

              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full bg-brand-card2 border border-brand-border hover:border-brand-purple text-slate-300 hover:text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resend code'}
                </button>
                <button
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP: SUCCESS ─── */}
          {step === 'success' && (
            <div className="text-center py-6" style={{ animation: 'fadeUp 0.3s ease' }}>
              <div className="w-16 h-16 bg-brand-green/15 border border-brand-green/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-brand-green" />
              </div>
              <h2 className="text-xl font-bold font-display text-brand-text mb-2">Welcome!</h2>
              <p className="text-sm text-slate-400">You're signed in. Redirecting...</p>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}