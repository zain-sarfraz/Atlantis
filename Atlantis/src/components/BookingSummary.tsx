import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { X } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import {
  computeBreakdown,
  formatDisplayDate,
  formatMoney,
} from '../utils/pricing'
import ZoomableImage from './ZoomableImage'

export default function BookingSummary() {
  const { state, nights, closeBooking, addToCart } = useBooking()
  const navigate = useNavigate()
  const pending = state.pendingBooking

  useEffect(() => {
    if (!pending) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [pending])

  if (!pending) return null

  const { room, ratePlan } = pending
  const n = nights || 1
  const breakdown = computeBreakdown(ratePlan.nightlyRate, n)
  const currency = state.currency

  const handleSelect = () => {
    let ok = false
    flushSync(() => {
      ok = addToCart()
    })
    if (!ok) return
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
        aria-label="Close booking summary"
        onClick={closeBooking}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-summary-title"
        className="drawer-scroll relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="booking-summary-title"
            className="text-xl font-medium tracking-tight text-navy"
          >
            Book Villa
          </h2>
          <button
            type="button"
            onClick={closeBooking}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-cream-dark hover:text-navy focus:ring-2 focus:ring-sand"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          <ZoomableImage
            src={room.image}
            alt={room.name}
            className="h-40 w-full rounded-lg"
          />
          <p className="type-label mt-3">Villa</p>
          <h3 className="mt-1 text-xl font-medium text-navy md:text-2xl">
            {room.name}
          </h3>
          <p className="mt-1 text-base text-slate-600">{ratePlan.name}</p>
          <p className="mt-2 text-sm text-slate-500">
            {formatDisplayDate(state.checkIn)} →{' '}
            {formatDisplayDate(state.checkOut)} · {n} night
            {n !== 1 ? 's' : ''}
          </p>

          <div className="mt-5 space-y-3 border-t border-border pt-4 text-base">
            <Row
              label={`Nightly rate × ${n}`}
              value={formatMoney(breakdown.subtotal, currency)}
            />
            <Row
              label="Service charge (10%)"
              value={formatMoney(breakdown.serviceCharge, currency)}
            />
            <Row
              label="Municipality / City fee (7%)"
              value={formatMoney(breakdown.municipalityFee, currency)}
            />
            <Row
              label="VAT (5%)"
              value={formatMoney(breakdown.vat, currency)}
            />
            <div className="flex justify-between border-t border-border pt-4">
              <span className="text-base font-semibold text-navy">Total</span>
              <span className="type-price text-2xl md:text-3xl">
                {formatMoney(breakdown.total, currency)}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {state.cartError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.cartError}</p>
            )}
            <div className="rounded-lg bg-cream p-4">
              <h4 className="type-label text-navy">Cancellation Policy</h4>
              <p className="mt-2 text-base leading-relaxed text-ink">
                Free cancellation up to 48 hours before arrival. Cancellations
                within 48 hours or no-shows will be charged the first night
                including taxes and fees.
              </p>
            </div>
            <div className="rounded-lg bg-cream p-4">
              <h4 className="type-label text-navy">Guarantee Policy</h4>
              <p className="mt-2 text-base leading-relaxed text-ink">
                A valid credit card is required to guarantee your reservation.
                Your card will not be charged until check-in unless otherwise
                stated by the selected rate plan.
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-border bg-white px-5 py-4">
          <button
            type="button"
            onClick={handleSelect}
            className="flex-1 rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
          >
            Select
          </button>
          <button
            type="button"
            onClick={closeBooking}
            className="flex-1 rounded-lg border border-border px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:border-sand focus:ring-2 focus:ring-sand"
          >
            Cancel
          </button>
        </div>
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums font-medium text-ink">{value}</span>
    </div>
  )
}
