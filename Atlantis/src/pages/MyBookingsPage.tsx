import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, RefreshCw, Lock, UserCheck, Ban, AlertTriangle, X } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/pricing'
import type { Currency } from '../types'
import { hotelApi } from '../api/client'

function fmtDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface ApiBookingItem {
  id: string
  roomType: { name: string; mainImage?: string; category?: { name: string } }
  ratePlan: { name: string }
  nightlyRate: number
  nights: number
  subtotal: number
  serviceCharge: number
  municipalityFee: number
  vat: number
  total: number
}

interface ApiBooking {
  id: string
  bookingRef: string
  email: string
  firstName?: string
  lastName?: string
  checkIn: string
  checkOut: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  items: ApiBookingItem[]
}

export default function MyBookingsPage() {
  const { state, bookingsTotal, removeBooking } = useBooking()
  const { user, role, loading: authLoading } = useAuth()

  const [apiBookings, setApiBookings] = useState<ApiBooking[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Cancel booking modal state
  const [cancellingRef, setCancellingRef] = useState<string | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')

  // Fetch bookings ONLY for the currently logged-in guest user
  useEffect(() => {
    if (!user?.email || role !== 'guest') {
      setApiBookings([])
      return
    }

    setApiLoading(true)
    setApiError('')
    hotelApi
      .getGuestBookings(user.email)
      .then((data) => {
        setApiBookings((data as ApiBooking[]) ?? [])
      })
      .catch((err: unknown) => {
        setApiError((err as Error).message || 'Could not load your bookings.')
        setApiBookings([])
      })
      .finally(() => setApiLoading(false))
  }, [user?.email, role])

  function refresh() {
    if (!user?.email || role !== 'guest') return
    setApiLoading(true)
    setApiError('')
    hotelApi
      .getGuestBookings(user.email)
      .then((data) => setApiBookings((data as ApiBooking[]) ?? []))
      .catch((err: unknown) => setApiError((err as Error).message || 'Could not load your bookings.'))
      .finally(() => setApiLoading(false))
  }

  async function handleCancelBooking(ref: string) {
    setCancellingLoading(true)
    setApiError('')
    try {
      await hotelApi.cancelBooking(ref)
      setApiBookings((prev) =>
        prev.map((b) => (b.bookingRef === ref ? { ...b, status: 'CANCELLED' } : b))
      )
      setCancelSuccessMsg(`Reservation ${ref} has been cancelled successfully.`)
      setCancellingRef(null)
    } catch (err: unknown) {
      setApiError((err as Error).message || 'Failed to cancel booking.')
    } finally {
      setCancellingLoading(false)
    }
  }

  // 1. If auth is still loading
  if (authLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">
        Loading account details…
      </main>
    )
  }

  // 2. If guest is NOT logged in — enforce Login prompt
  if (role !== 'guest' || !user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-white p-8 sm:p-10 text-center shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand/20 text-sand-dark mb-4">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Sign In Required</h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Your bookings are strictly private and protected. Please sign in to your guest account to view your confirmed stays.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto rounded-lg bg-sand px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy shadow-sm"
            >
              Sign In / Register
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto rounded-lg border border-border px-6 py-3.5 text-sm font-medium uppercase tracking-wide text-slate-600 transition hover:bg-cream"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // 3. Logged in guest view
  const localBookings = state.bookings
  const apiRefs = new Set(apiBookings.map((b) => b.bookingRef))
  const localOnly = localBookings.filter((b) => !apiRefs.has(b.id))
  const hasBookings = apiBookings.length > 0 || localOnly.length > 0

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand-dark mb-1">
            <UserCheck size={16} /> Logged in as {user.firstName} {user.lastName} ({user.email})
          </div>
          <h1 className="text-4xl font-semibold leading-snug tracking-tight text-navy md:text-5xl">
            My Bookings
          </h1>
          <p className="mt-1 max-w-prose text-base leading-relaxed text-slate-600">
            View all your confirmed villa reservations and stay details.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={apiLoading}
          className="self-start flex items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2 text-sm text-slate-600 transition hover:border-sand hover:text-navy shadow-sm"
        >
          <RefreshCw size={14} className={apiLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {cancelSuccessMsg && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{cancelSuccessMsg}</span>
          <button onClick={() => setCancelSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {apiError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {apiError}
        </p>
      )}

      {apiLoading && (
        <div className="mt-12 text-center text-slate-500 py-8 font-medium">Loading your bookings…</div>
      )}

      {!apiLoading && !hasBookings && (
        <div className="mt-8 rounded-2xl border border-border bg-white py-16 text-center shadow-sm">
          <p className="text-xl font-medium text-navy">No bookings yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Book the villa and complete checkout to see your reservations here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
          >
            Explore Stay
          </Link>
        </div>
      )}

      {!apiLoading && hasBookings && (
        <>
          <ul className="mt-8 space-y-4">
            {/* ── API / persisted bookings ── */}
            {apiBookings.map((booking) => {
              const item = booking.items?.[0]
              const image =
                item?.roomType?.mainImage ||
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'
              const roomName = item?.roomType?.name ?? 'Limiria Villa Zanzibar'
              const categoryName = item?.roomType?.category?.name ?? 'Private Villa'
              const ratePlanName = item?.ratePlan?.name ?? ''
              const nights = item?.nights ?? 1
              const canCancel = booking.status === 'CONFIRMED' || booking.status === 'PENDING'

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-start"
                >
                  <img
                    src={image}
                    alt={roomName}
                    className="h-36 w-full rounded-lg object-cover sm:h-28 sm:w-36"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="type-label text-brand">{categoryName}</p>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                          booking.status === 'CONFIRMED' ||
                          booking.status === 'CHECKED_IN' ||
                          booking.status === 'CHECKED_OUT'
                            ? 'bg-sand/40 text-navy'
                            : booking.status === 'CANCELLED' || booking.status === 'NO_SHOW'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {booking.status === 'CONFIRMED'
                          ? 'Confirmed'
                          : booking.status === 'PENDING'
                          ? 'Pending'
                          : booking.status === 'CANCELLED'
                          ? 'Cancelled'
                          : booking.status}
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-medium text-navy">{roomName}</h2>
                    <p className="text-sm text-slate-600">{ratePlanName}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)} · {nights} night
                      {nights !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400">Ref: {booking.bookingRef}</p>
                    <p className="type-price mt-2 text-2xl md:text-3xl">
                      {formatMoney(booking.totalAmount, (booking.currency || state.currency) as Currency, false)}
                    </p>
                  </div>

                  {canCancel && (
                    <div className="border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:self-start">
                      <button
                        type="button"
                        onClick={() => setCancellingRef(booking.bookingRef)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 shadow-sm"
                      >
                        <Ban size={13} />
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </li>
              )
            })}

            {/* ── Local-only bookings (session only) ── */}
            {localOnly.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm sm:flex-row"
              >
                <img
                  src={item.image}
                  alt={item.roomName}
                  className="h-36 w-full rounded-lg object-cover sm:h-28 sm:w-36"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="type-label text-brand">{item.categoryName}</p>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Session Only
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-medium text-navy">{item.roomName}</h2>
                  <p className="text-sm text-slate-600">{item.ratePlanName}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.checkIn} → {item.checkOut} · {item.nights} night{item.nights !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-500">
                    <p>
                      Nightly subtotal:{' '}
                      <span className="tabular-nums text-ink">
                        {formatMoney(item.breakdown.subtotal, state.currency)}
                      </span>
                    </p>
                    <p className="type-price mt-2 text-2xl md:text-3xl">
                      {formatMoney(item.breakdown.total, state.currency)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeBooking(item.id)}
                  className="flex items-center justify-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-sm font-medium uppercase tracking-wide text-slate-500 transition hover:border-red-300 hover:text-red-700 focus:ring-2 focus:ring-sand"
                >
                  <Trash2 size={14} />
                  Cancel
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-end gap-3 border-t border-border pt-6">
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-slate-500">Bookings total</span>
              <span className="type-price text-2xl md:text-3xl">
                {apiBookings.length > 0
                  ? formatMoney(
                      apiBookings
                        .filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
                        .reduce((s, b) => s + b.totalAmount, 0),
                      (apiBookings[0].currency || state.currency) as Currency,
                      false,
                    )
                  : formatMoney(bookingsTotal, state.currency)}
              </span>
            </div>
            <Link
              to="/"
              className="rounded-lg bg-sand px-8 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
            >
              Book Another Stay
            </Link>
          </div>
        </>
      )}

      {/* ── Cancel Booking Confirmation Modal ── */}
      {cancellingRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-navy">Cancel Reservation?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to cancel booking{' '}
              <span className="font-mono font-bold text-navy">{cancellingRef}</span>? This action will release your reserved dates.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={cancellingLoading}
                onClick={() => setCancellingRef(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancellingLoading}
                onClick={() => handleCancelBooking(cancellingRef)}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow-sm"
              >
                {cancellingLoading ? 'Cancelling…' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
