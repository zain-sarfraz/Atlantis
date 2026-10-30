import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [reg, setReg] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' })
  const [showRegPw, setShowRegPw] = useState(false)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const role = await login(loginEmail, loginPassword)
      navigate(role === 'admin' ? '/admin/dashboard' : '/', { replace: true })
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (reg.password.length < 6) { setRegError('Password must be at least 6 characters.'); return }
    setRegLoading(true)
    try {
      await register(reg)
      navigate('/')
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-border bg-cream px-6 py-3.5">
        <div className="mx-auto max-w-7xl flex items-center">
          <Logo />
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md space-y-5">
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === 'login'
                  ? 'border-b-2 border-sand text-navy bg-white'
                  : 'text-taupe hover:text-ink hover:bg-cream'
                  }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <LogIn size={15} />
                  Sign In
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === 'register'
                  ? 'border-b-2 border-sand text-navy bg-white'
                  : 'text-taupe hover:text-ink hover:bg-cream'
                  }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <UserPlus size={15} />
                  Create Account
                </span>
              </button>
            </div>

            <div className="px-6 py-7">
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">Welcome back</h2>
                    <p className="text-sm text-taupe mt-0.5">Sign in as guest or admin — same page.</p>
                  </div>

                  {loginError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-taupe mb-1.5">Email address</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-taupe mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showLoginPw ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPw(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-ink"
                        >
                          {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full rounded-lg bg-sand py-2.5 text-sm font-semibold uppercase tracking-wide text-navy shadow-sm hover:bg-sand-dark active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {loginLoading ? 'Signing in…' : 'Sign In'}
                  </button>

                  <p className="text-center text-xs text-taupe">
                    No account?{' '}
                    <button type="button" onClick={() => setTab('register')} className="text-sand font-medium hover:underline">
                      Create one free
                    </button>
                  </p>
                </form>
              )}

              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">Create your account</h2>
                    <p className="text-sm text-taupe mt-0.5">Save your bookings and get exclusive member benefits.</p>
                  </div>

                  {regError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                      {regError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-taupe mb-1.5">First name</label>
                      <input
                        type="text"
                        required
                        value={reg.firstName}
                        onChange={e => setReg(r => ({ ...r, firstName: e.target.value }))}
                        placeholder="John"
                        className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-taupe mb-1.5">Last name</label>
                      <input
                        type="text"
                        required
                        value={reg.lastName}
                        onChange={e => setReg(r => ({ ...r, lastName: e.target.value }))}
                        placeholder="Smith"
                        className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-taupe mb-1.5">Email address</label>
                    <input
                      type="email"
                      required
                      value={reg.email}
                      onChange={e => setReg(r => ({ ...r, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-taupe mb-1.5">Phone number <span className="opacity-50">(optional)</span></label>
                    <input
                      type="tel"
                      value={reg.phone}
                      onChange={e => setReg(r => ({ ...r, phone: e.target.value }))}
                      placeholder="+971 50 000 0000"
                      className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-taupe mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showRegPw ? 'text' : 'password'}
                        required
                        value={reg.password}
                        onChange={e => setReg(r => ({ ...r, password: e.target.value }))}
                        placeholder="Min. 6 characters"
                        className="w-full rounded-lg border border-border bg-cream px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-taupe/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-ink"
                      >
                        {showRegPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full rounded-lg bg-sand py-2.5 text-sm font-semibold uppercase tracking-wide text-navy shadow-sm hover:bg-sand-dark active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {regLoading ? 'Creating account…' : 'Create Account'}
                  </button>

                  <p className="text-center text-xs text-taupe">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setTab('login')} className="text-sand font-medium hover:underline">
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-taupe">
            <Link to="/" className="hover:text-ink underline">← Back to room search</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
