import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Lock,
  ArrowLeft,
} from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { useAuth } from '../context/AuthContext'
import CartSidebar from '../components/CartSidebar'
import StripeCheckoutSection from '../components/StripeCheckoutSection'
import { formatMoney, formatDisplayDate } from '../utils/pricing'
import { hotelApi } from '../api/client'

const inputClass =
  'w-full rounded border border-border bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-sand focus:ring-2 focus:ring-sand'

const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

function RequiredMark() {
  return <span className="text-sand-dark"> *</span>
}

import Calendar from '../components/Calendar'
import { startOfDay, isBeforeDay, isSameDay } from '../utils/pricing'

import { DEFAULT_BLOCKED_DATES } from '../data/mock-data'

export default function CheckoutPage() {
  const { state, today, cartCount, cartTotal, confirmCheckout, setDates } = useBooking()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [specialOpen, setSpecialOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selecting, setSelecting] = useState<'in' | 'out'>('in')
  const [editCheckIn, setEditCheckIn] = useState<Date | null>(state.checkIn)
  const [editCheckOut, setEditCheckOut] = useState<Date | null>(state.checkOut)
  const [blockedDates, setBlockedDates] = useState<string[]>(DEFAULT_BLOCKED_DATES)
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isCardComplete, setIsCardComplete] = useState(false)
  const [acks, setAcks] = useState({
    newsletter: false,
    privacy: false,
    cardStorage: false,
    booking: false,
  })
  const [form, setForm] = useState({
    prefix: 'Mr',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: '',
    email: user?.email ?? '',
    country: 'AE',
    city: 'Dubai',
    zip: '',
    specialRequests: '',
  })

  useEffect(() => {
    hotelApi
      .getBlockedDates()
      .then((res) => {
        const blocked = res.blockedDates ?? []
        const booked = res.bookedDates ?? []
        const closed = res.closedDates ?? []
        if (blocked.length > 0 || booked.length > 0 || closed.length > 0) {
          setBlockedDates(Array.from(new Set([...DEFAULT_BLOCKED_DATES, ...blocked, ...booked, ...closed])))
          setBookedDates(booked)
          setClosedDates(closed)
        }
      })
      .catch(() => {})
  }, [])

  const handleDateSelectForEdit = (date: Date) => {
    const day = startOfDay(date)
    if (selecting === 'in' || !editCheckIn) {
      setEditCheckIn(day)
      setEditCheckOut(null)
      setSelecting('out')
      return
    }
    if (editCheckIn && !isBeforeDay(day, editCheckIn) && !isSameDay(day, editCheckIn)) {
      setEditCheckOut(day)
      setSelecting('in')
      setDates(editCheckIn, day)
      setEditModalOpen(false)
      return
    }
    setEditCheckIn(day)
    setEditCheckOut(null)
    setSelecting('out')
  }

  const canConfirm = acks.privacy && acks.cardStorage && acks.booking

  useEffect(() => {
    if (!submitted) return
    const timer = window.setTimeout(() => {
      navigate('/bookings', { replace: true })
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [submitted, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canConfirm || cartCount === 0 || submitting) return
    setSubmitError('')
    setSubmitting(true)
    try {
      // Step 1: Create Stripe PaymentIntent on backend
      const paymentRes = await hotelApi.createPaymentIntent({
        amount: cartTotal,
        currency: state.currency,
        email: form.email,
      }).catch((err) => {
        console.warn('[Stripe PaymentIntent Warning]:', err)
        return { paymentIntentId: 'pi_local_' + Date.now(), isMock: true }
      })

      // Step 2: Submit Booking with Stripe paymentIntentId
      const first = state.cart[0]
      const res = await hotelApi.createBooking({
        checkIn: first.checkIn,
        checkOut: first.checkOut,
        adults: state.guests.adults,
        children: state.guests.children,
        roomsCount: 1,
        currency: state.currency,
        promoCode: state.promoCode || undefined,
        items: state.cart.map((item) => ({
          roomTypeId: item.roomId,
          ratePlanId: item.ratePlanId,
        })),
        guestPrefix: form.prefix,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        city: form.city,
        zipCode: form.zip || undefined,
        specialRequests: form.specialRequests || undefined,
        newsletter: acks.newsletter,
        paymentIntentId: paymentRes.paymentIntentId,
        paymentStatus: 'PAID',
      })
      setBookingRef(res.bookingRef)
      try {
        localStorage.setItem('serrano_last_booking_email', form.email)
        const prevRefs = JSON.parse(localStorage.getItem('serrano_booking_refs') || '[]')
        localStorage.setItem('serrano_booking_refs', JSON.stringify(Array.from(new Set([res.bookingRef, ...prevRefs]))))
      } catch {}
      confirmCheckout()
      setSubmitted(true)
    } catch (err) {
      setSubmitError((err as Error).message || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-white p-10 text-center shadow-sm">
          <p className="text-2xl font-semibold text-navy md:text-3xl">
            Booking confirmed
          </p>
          {bookingRef && (
            <p className="mt-2 font-mono text-sm text-brand">Ref: {bookingRef}</p>
          )}
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Your reservation is saved. It also appears in the admin Bookings panel.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Taking you to My Bookings…
          </p>
          <Link
            to="/bookings"
            className="mt-6 inline-block rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
          >
            View My Bookings
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
        {/* Left — checkout form only */}
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-navy transition hover:text-sand-dark focus:ring-2 focus:ring-sand md:text-3xl"
          >
            <ArrowLeft size={22} className="text-navy" />
            Checkout
          </button>

          {cartCount === 0 ? (
            <div className="rounded-lg border border-border bg-white py-16 text-center">
              <p className="text-xl font-medium text-navy">
                Your cart is empty
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Select a villa rate before checking out.
              </p>
              <Link
                to="/"
                className="mt-6 inline-block rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy focus:ring-2 focus:ring-navy"
              >
                Select Your Villa
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Booked rooms summary */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium text-navy md:text-2xl">
                    Your Stay
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditCheckIn(state.checkIn)
                      setEditCheckOut(state.checkOut)
                      setSelecting('in')
                      setEditModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-sand bg-sand/10 px-3.5 py-1.5 text-xs font-bold text-sand-dark transition hover:bg-sand/20"
                  >
                    <span>Edit Dates</span>
                  </button>
                </div>
                <ul className="mt-4 space-y-4">
                  {state.cart.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:gap-4"
                    >
                      <img
                        src={item.image}
                        alt={item.roomName}
                        className="h-28 w-full rounded-lg object-cover sm:h-24 sm:w-32 sm:shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="type-label text-brand">Villa</p>
                        <p className="text-lg font-semibold text-navy">
                          {item.roomName}
                        </p>
                        <p className="text-base text-slate-600">
                          {item.ratePlanName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <span>
                            {formatDisplayDate(new Date(item.checkIn))} → {formatDisplayDate(new Date(item.checkOut))} · {item.nights} night
                            {item.nights !== 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditCheckIn(state.checkIn)
                              setEditCheckOut(state.checkOut)
                              setSelecting('in')
                              setEditModalOpen(true)
                            }}
                            className="inline-flex items-center text-xs font-bold text-sand hover:underline"
                          >
                            (Edit Dates)
                          </button>
                        </div>
                        <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                          <p>
                            Subtotal:{' '}
                            <span className="tabular-nums text-ink">
                              {formatMoney(item.breakdown.subtotal, state.currency)}
                            </span>
                          </p>
                          <p className="type-price mt-1 text-xl">
                            {formatMoney(item.breakdown.total, state.currency)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                  <span className="text-base font-semibold text-navy">
                    Grand total
                  </span>
                  <span className="type-price text-2xl md:text-3xl">
                    {formatMoney(cartTotal, state.currency)}
                  </span>
                </div>
              </section>

              {/* Contact Info */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <h2 className="text-xl font-medium text-navy md:text-2xl">
                    Contact Info
                  </h2>
                  <p className="text-sm text-slate-500">
                    <span className="text-sand-dark">*</span> Required
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[100px_1fr_1fr]">
                  <div>
                    <label className={labelClass} htmlFor="prefix">
                      Prefix
                      <RequiredMark />
                    </label>
                    <select id="prefix" required className={inputClass} value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}>
                      <option>Mr</option>
                      <option>Mrs</option>
                      <option>Ms</option>
                      <option>Dr</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="firstName">
                      First Name
                      <RequiredMark />
                    </label>
                    <input id="firstName" required className={inputClass} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="lastName">
                      Last Name
                      <RequiredMark />
                    </label>
                    <input id="lastName" required className={inputClass} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="phone">
                      Mobile phone
                      <RequiredMark />
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      className={inputClass}
                      placeholder="+971 …"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="email">
                      Email Address
                      <RequiredMark />
                    </label>
                    <input id="email" type="email" required className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    <p className="mt-1.5 text-sm text-slate-500">
                      This is the email we will send your confirmation to.
                    </p>
                  </div>
                </div>
              </section>

              {/* Address */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <h2 className="type-label mb-5 text-navy">Address</h2>

                <div>
                  <label className={labelClass} htmlFor="country">
                    Country
                    <RequiredMark />
                  </label>
                  <select id="country" required className={inputClass} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                    <option value="AE">United Arab Emirates</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="IN">India</option>
                    <option value="PK">Pakistan</option>
                  </select>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                  <div>
                    <label className={labelClass} htmlFor="city">
                      City
                      <RequiredMark />
                    </label>
                    <input id="city" required className={inputClass} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="zip">
                      Zip / Postal Code
                    </label>
                    <input id="zip" className={inputClass} value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
                  </div>
                </div>
              </section>

              {/* Reservation Details */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <h2 className="text-xl font-medium text-navy md:text-2xl">
                  Reservation Details
                </h2>
                <button
                  type="button"
                  onClick={() => setSpecialOpen((o) => !o)}
                  className="mt-4 flex w-full items-center justify-between rounded border border-border px-4 py-3 text-left text-base text-ink transition hover:border-sand focus:ring-2 focus:ring-sand"
                >
                  Special Requests
                  <ChevronDown
                    size={18}
                    className={`text-slate-500 transition ${specialOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {specialOpen && (
                  <textarea
                    rows={4}
                    className={`${inputClass} mt-3 resize-y`}
                    placeholder="Let us know about arrival time, bed preferences, celebrations…"
                    value={form.specialRequests}
                    onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                  />
                )}
              </section>

              {/* Payment */}
              <StripeCheckoutSection
                isCardComplete={isCardComplete}
                onCardChange={setIsCardComplete}
                submitting={submitting}
              />

              {/* Policies */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <h2 className="text-xl font-medium text-navy">
                  Policies:
                </h2>
                <div className="mt-4 rounded-lg bg-cream-dark/80 p-4 text-base leading-relaxed text-ink">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>Check-in after 3:00 pm</p>
                    <p>Check-out before 12:00 pm</p>
                  </div>
                  {state.cart.map((item) => (
                    <div key={item.id} className="mt-4">
                      <p className="type-label text-navy">
                        {item.roomName}
                        {item.ratePlanName ? ` · ${item.ratePlanName}` : ''}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        A deposit is not required as long as a valid credit card
                        is provided at the time of booking. Bookings cancelled
                        within 3 days prior to arrival at 15.00hrs (DXB time)
                        will be charged 100% of total booking.
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {item.checkIn} → {item.checkOut} ·{' '}
                        {formatMoney(item.breakdown.total, state.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Acknowledgement */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <h2 className="text-xl font-medium text-navy">
                  Acknowledgement
                </h2>
                <ul className="mt-5 space-y-4">
                  <AckRow
                    checked={acks.newsletter}
                    onChange={(v) => setAcks((a) => ({ ...a, newsletter: v }))}
                    label="Yes, I would like to receive newsletters and special offers by email."
                  />
                  <AckRow
                    checked={acks.privacy}
                    onChange={(v) => setAcks((a) => ({ ...a, privacy: v }))}
                    required
                    label="I agree with the Privacy Terms."
                  />
                  <AckRow
                    checked={acks.cardStorage}
                    onChange={(v) => setAcks((a) => ({ ...a, cardStorage: v }))}
                    required
                    label="I agree to the card data storage terms described below."
                    hint="You authorize Limiria Villa and its payment processor to store card data for this reservation and related charges as described in the booking conditions."
                  />
                  <AckRow
                    checked={acks.booking}
                    onChange={(v) => setAcks((a) => ({ ...a, booking: v }))}
                    required
                    label="I agree with the Booking Conditions."
                  />
                </ul>
              </section>

              <div className="flex flex-col items-end gap-3 border-t border-border pt-6">
                {submitError && (
                  <p className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {submitError}
                  </p>
                )}
                <p className="text-sm text-slate-500">
                  Total due{' '}
                  <span className="type-price ml-2 text-2xl md:text-3xl">
                    {formatMoney(cartTotal, state.currency)}
                  </span>
                </p>
                <button
                  type="submit"
                  disabled={!canConfirm || submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-sand px-8 py-3.5 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? 'Confirming…' : 'Confirm Booking'}
                  <Lock size={16} />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right — cart only, nothing below */}
        <div className="lg:sticky lg:top-24">
          <CartSidebar />
        </div>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-navy">Edit Stay Dates</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500 font-medium">
              Select check-in date first, then select check-out date.
            </p>
            <Calendar
              checkIn={editCheckIn}
              checkOut={editCheckOut}
              today={today}
              currency={state.currency}
              onSelect={handleDateSelectForEdit}
              compact
              blockedDates={blockedDates}
              bookedDates={bookedDates}
              closedDates={closedDates}
            />
          </div>
        </div>
      )}
    </main>
  )
}

function AckRow({
  checked,
  onChange,
  label,
  required,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  required?: boolean
  hint?: string
}) {
  return (
    <li className="flex gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-border text-navy accent-sand focus:ring-2 focus:ring-sand"
      />
      <div>
        <p className="text-base leading-relaxed text-ink">
          {required && <span className="text-sand-dark">* </span>}
          {label}
        </p>
        {hint && (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500">
            {hint}
          </p>
        )}
      </div>
    </li>
  )
}
