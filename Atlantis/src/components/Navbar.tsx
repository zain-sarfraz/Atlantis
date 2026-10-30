import { useState, useRef, useEffect } from 'react'
import { User, LogOut, ChevronDown, CalendarCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { useAuth } from '../context/AuthContext'
import type { Currency } from '../types'
import Logo from './Logo'
import AlertsDropdown from './AlertsDropdown'

const currencies: Currency[] = ['USD', 'AED', 'EUR', 'GBP']

export default function Navbar() {
  const { state, setCurrency } = useBooking()
  const { user, admin, role, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = role === 'guest' || role === 'admin'
  const displayName =
    role === 'admin' && admin
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
    <header className="sticky top-0 z-[100] border-b border-border/70 bg-cream/95 text-ink backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
        <Logo />

        <div className="flex items-center gap-2.5 sm:gap-3">
          {isLoggedIn && (
            <Link
              to="/bookings"
              className="flex items-center gap-1.5 rounded border border-border bg-white px-3 py-2 text-[0.8125rem] font-semibold tracking-tight text-navy transition hover:border-sand hover:bg-cream focus:ring-2 focus:ring-sand/30"
            >
              <CalendarCheck size={15} className="text-sand-dark" />
              <span>My Bookings</span>
            </Link>
          )}

          <select
            value={state.currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="rounded border border-border bg-white px-2.5 py-2 text-[0.8125rem] font-medium tracking-wide text-navy outline-none focus:border-sand focus:ring-2 focus:ring-sand/30"
            aria-label="Currency"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <AlertsDropdown />

          {isLoggedIn && displayName ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-[0.8125rem] font-medium text-ink transition hover:bg-cream focus:ring-2 focus:ring-sand/30"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand text-[0.6875rem] font-semibold text-white">
                  {displayName.first[0]}
                  {displayName.last[0]}
                </span>
                <span className="hidden max-w-[100px] truncate font-semibold tracking-tight sm:block">
                  {displayName.first}
                </span>
                <ChevronDown size={14} className="text-taupe" />
              </button>

              {menuOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-md border border-border bg-white shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-[0.875rem] font-semibold tracking-tight text-ink">
                      {displayName.first} {displayName.last}
                    </p>
                    <p className="type-meta mt-0.5 truncate text-taupe">{displayName.email}</p>
                    {role === 'admin' && (
                      <p className="mt-1 text-[0.625rem] font-bold tracking-[0.12em] text-amber-700 uppercase">
                        Admin
                      </p>
                    )}
                  </div>
                  {role === 'admin' ? (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-medium text-ink transition hover:bg-cream"
                    >
                      <User size={15} className="text-taupe" />
                      Admin Dashboard
                    </Link>
                  ) : (
                    <Link
                      to="/bookings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-medium text-ink transition hover:bg-cream"
                    >
                      <User size={15} className="text-taupe" />
                      My Bookings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-medium text-red-600 transition hover:bg-red-50"
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
              className="flex items-center gap-1.5 rounded border border-border bg-white px-3 py-2 text-[0.8125rem] font-semibold tracking-tight text-ink transition hover:bg-cream focus:ring-2 focus:ring-sand/30"
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
