import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Lock, Mail, User, Users } from 'lucide-react'

export default function LoginPage() {
  const { admin, loading, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && admin) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [admin, loading, navigate])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  const demoCredentials = [
    {
      icon: User,
      title: 'Admin',
      subtitle: 'Full access to admin settings',
      email: 'admin@serrano.hotel',
      password: 'Admin@1234',
    },
    {
      icon: Users,
      title: 'Guest',
      subtitle: 'Demo guest booking experience',
      email: 'guest@serrano.hotel',
      password: 'Guest@1234',
    },
  ]

  function fillDemoCredentials(emailValue: string, passwordValue: string) {
    setEmail(emailValue)
    setPassword(passwordValue)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitLoading(true)
    try {
      await login(email, password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf7f2] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/logo-limiria.png"
            alt="Limiria Villa"
            className="mx-auto h-16 w-auto object-contain"
          />
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-[#8c8279]">Admin Portal</p>
        </div>

        <div className="rounded-2xl border border-[#d6d0c7] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-[#5e544b]">Sign in</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5e544b]">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8279]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@serrano.hotel"
                  className="w-full rounded-lg border border-[#d6d0c7] bg-[#faf7f2] py-2.5 pl-9 pr-3 text-sm text-[#5e544b] outline-none transition focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#5e544b]">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8279]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#d6d0c7] bg-[#faf7f2] py-2.5 pl-9 pr-3 text-sm text-[#5e544b] outline-none transition focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="mt-2 w-full rounded-lg bg-[#bca37f] py-2.5 text-sm font-semibold uppercase tracking-wide text-[#5e544b] transition hover:bg-[#a89068] disabled:opacity-50"
            >
              {submitLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-[#f8f3ec] p-4">
            <p className="mb-4 text-sm font-semibold text-[#5e544b]">Demo Credentials — Click to Fill</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {demoCredentials.map((demo) => {
                const Icon = demo.icon
                return (
                  <button
                    key={demo.title}
                    type="button"
                    onClick={() => fillDemoCredentials(demo.email, demo.password)}
                    className="group flex flex-col gap-2 rounded-2xl border border-[#d6d0c7] bg-white p-4 text-left transition hover:border-[#bca37f] hover:bg-[#fbf7ee]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fcf3e6] text-[#bca37f]">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-[#5e544b]">{demo.title}</p>
                        <p className="text-xs text-[#8c8279]">{demo.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl bg-[#faf7f2] px-3 py-2 text-sm text-[#5e544b]">
                      <p className="font-medium">{demo.email}</p>
                      <p className="text-xs text-[#8c8279]">{demo.password}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#8c8279]">
            Limiria Villa Management
          </p>
        </div>
      </div>
    </div>
  )
}
