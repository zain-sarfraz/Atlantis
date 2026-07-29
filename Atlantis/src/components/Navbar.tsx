import { useState, useRef, useEffect } from 'react'
import { Bell, ShoppingBag, User, LogOut, ChevronDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { useAuth } from '../context/AuthContext'
import type { Currency } from '../types'
import Logo from './Logo'

const currencies: Currency[] = ['AED', 'USD', 'EUR', 'GBP']

export default function Navbar() {
  const { state, cartCount, setCurrency, toggleCart, toggleAlerts } = useBooking()
  const { user, admin, role, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeAlerts = state.hotelAlerts.filter((a) => !state.alertsDismissed.includes(a.id))
  const isLoggedIn = role === 'guest' || role === 'admin'
  const displayName = role === 'admin' && admin
    ? { first: admin.firstName, last: admin.lastName, email: admin.email }
    : user
      ? { first: user.firstName, last: user.lastName, email: user.email }
      : null

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-[100] border-b border-border bg-cream text-ink">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Logo />

        <div className="flex items-center gap-1 sm:gap-2">
          <select
            value={state.currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="rounded border border-border bg-cream px-2 py-1.5 text-sm text-taupe outline-none focus:border-sand focus:ring-2 focus:ring-sand"
            aria-label="Currency"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => toggleAlerts()}
            className="relative rounded-lg p-2 text-taupe transition hover:bg-cream-dark hover:text-ink focus:ring-2 focus:ring-sand"
            aria-label="Alerts"
          >
            <Bell size={20} />
            {activeAlerts.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sand px-1 text-xs font-semibold text-navy">
                {activeAlerts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleCart(true)}
            className="relative rounded-lg p-2 text-taupe transition hover:bg-cream-dark hover:text-ink focus:ring-2 focus:ring-sand"
            aria-label="Cart"
          >
            <ShoppingBag size={20} />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sand px-1 text-xs font-semibold text-navy">
              {cartCount}
            </span>
          </button>

          {/* User / Auth */}
          {isLoggedIn && displayName ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-cream px-3 py-1.5 text-sm text-ink transition hover:bg-cream-dark focus:ring-2 focus:ring-sand"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand text-navy text-xs font-semibold">
                  {displayName.first[0]}{displayName.last[0]}
                </span>
                <span className="hidden sm:block max-w-[100px] truncate font-medium">{displayName.first}</span>
                <ChevronDown size={14} className="text-taupe" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-white shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-ink truncate">{displayName.first} {displayName.last}</p>
                    <p className="text-xs text-taupe truncate">{displayName.email}</p>
                    {role === 'admin' && (
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Admin</p>
                    )}
                  </div>
                  {role === 'admin' ? (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-cream transition"
                    >
                      <User size={15} className="text-taupe" />
                      Admin Dashboard
                    </Link>
                  ) : (
                    <Link
                      to="/bookings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-cream transition"
                    >
                      <User size={15} className="text-taupe" />
                      My Bookings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-cream px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-cream-dark focus:ring-2 focus:ring-sand"
            >
              <User size={16} className="text-taupe" />
              <span className="hidden sm:block">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
