import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'

export default function MyBookingsPage() {
  const { state, bookingsTotal, removeBooking } = useBooking()
  const bookings = state.bookings

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold leading-snug tracking-tight text-navy md:text-5xl">
        My Bookings
      </h1>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-600">
        Confirmed reservations from checkout. New bookings also appear in the admin Bookings panel.
      </p>

      {bookings.length === 0 ? (
        <div className="mt-12 rounded-lg border border-border bg-white py-16 text-center">
          <p className="text-xl font-medium text-navy">No bookings yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Book the villa and complete checkout to see it here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
          >
            Explore Stay
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-4">
            {bookings.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:flex-row"
              >
                <img
                  src={item.image}
                  alt={item.roomName}
                  className="h-36 w-full rounded-lg object-cover sm:h-28 sm:w-36"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="type-label text-brand">{item.categoryName}</p>
                    <span className="rounded bg-sand/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-navy">
                      Confirmed
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-medium text-navy">
                    {item.roomName}
                  </h2>
                  <p className="text-base text-slate-600">{item.ratePlanName}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.checkIn} → {item.checkOut} · {item.nights} night
                    {item.nights !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-500">
                    <p>
                      Nightly subtotal:{' '}
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
                {formatMoney(bookingsTotal, state.currency)}
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
    </main>
  )
}
