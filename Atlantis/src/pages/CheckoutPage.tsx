import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  CreditCard,
  Info,
  Lock,
  ArrowLeft,
} from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { useAuth } from '../context/AuthContext'
import CartSidebar from '../components/CartSidebar'
import { formatMoney } from '../utils/pricing'
import { hotelApi } from '../api/client'

const inputClass =
  'w-full rounded border border-border bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-sand focus:ring-2 focus:ring-sand'

const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

function RequiredMark() {
  return <span className="text-sand-dark"> *</span>
}

export default function CheckoutPage() {
  const { state, cartCount, cartTotal, confirmCheckout } = useBooking()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [specialOpen, setSpecialOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
      const first = state.cart[0]
      const res = await hotelApi.createBooking({
        checkIn: first.checkIn,
        checkOut: first.checkOut,
        adults: state.guests.adults,
        children: state.guests.children,
        roomsCount: state.guests.rooms,
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
      })
      setBookingRef(res.bookingRef)
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
                Select a room rate before checking out.
              </p>
              <Link
                to="/"
                className="mt-6 inline-block rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy focus:ring-2 focus:ring-navy"
              >
                Select a Room
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Booked rooms summary */}
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <h2 className="text-xl font-medium text-navy md:text-2xl">
                  Your Stay
                </h2>
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
                        <p className="type-label text-brand">{item.categoryName}</p>
                        <p className="text-lg font-semibold text-navy">
                          {item.roomName}
                        </p>
                        <p className="text-base text-slate-600">
                          {item.ratePlanName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.checkIn} → {item.checkOut} · {item.nights} night
                          {item.nights !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                          <p>
                            Subtotal:{' '}
                            <span className="tabular-nums text-ink">
                              {formatMoney(item.breakdown.subtotal, state.currency)}
                            </span>
                          </p>
                          <p>
                            Taxes & fees:{' '}
                            <span className="tabular-nums text-ink">
                              {formatMoney(
                                item.breakdown.serviceCharge +
                                  item.breakdown.municipalityFee +
                                  item.breakdown.vat,
                                state.currency,
                              )}
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
              <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-xl font-medium text-navy md:text-2xl">
                  <Lock size={18} className="text-sand-dark" />
                  Payment
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  We use secure transmission and encrypted storage to protect
                  your personal information.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {['VISA', 'Mastercard', 'AMEX', 'JCB', 'UnionPay'].map((brand) => (
                    <span
                      key={brand}
                      className="rounded border border-border bg-cream px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-navy"
                    >
                      {brand}
                    </span>
                  ))}
                </div>

                <div className="mt-5">
                  <label className={labelClass} htmlFor="cardNumber">
                    Card Number
                    <RequiredMark />
                  </label>
                  <div className="relative">
                    <CreditCard
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="cardNumber"
                      required
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="•••• •••• •••• ••••"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div>
                    <label className={labelClass} htmlFor="exp">
                      Expiration Date (MM/YY)
                      <RequiredMark />
                    </label>
                    <input
                      id="exp"
                      required
                      placeholder="MM/YY"
                      autoComplete="cc-exp"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="cvv">
                      CVV
                      <RequiredMark />
                      <Info
                        size={14}
                        className="ml-1 inline text-slate-400"
                        aria-label="3 or 4 digit security code"
                      />
                    </label>
                    <input
                      id="cvv"
                      required
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className={labelClass} htmlFor="cardName">
                    Name on Card
                    <RequiredMark />
                  </label>
                  <input
                    id="cardName"
                    required
                    autoComplete="cc-name"
                    className={inputClass}
                  />
                </div>
              </section>

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
                  {state.cart.map((item, i) => (
                    <div key={item.id} className="mt-4">
                      <p className="type-label text-navy">
                        Room {i + 1} {item.categoryName}, {item.roomName}
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
