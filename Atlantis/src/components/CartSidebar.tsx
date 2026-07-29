import { Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'

export default function CartSidebar() {
  const { state, cartCount, cartTotal, removeFromCart } = useBooking()
  const location = useLocation()
  const onCheckout = location.pathname === '/checkout'

  return (
    <aside className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-sand-dark" />
          <h2 className="text-xl font-medium text-navy">
            {onCheckout ? 'Your Booking' : 'Your Cart'}
            {cartCount === 0 && (
              <span className="text-base font-medium text-navy">
                : {cartCount} Items
              </span>
            )}
          </h2>
        </div>
        {cartCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sand px-1.5 text-sm font-semibold text-navy">
            {cartCount}
          </span>
        )}
      </div>

      {cartCount === 0 ? (
        onCheckout ? (
          <p className="p-4 text-sm text-slate-500">
            No rooms selected yet. Go back and book a room to see it here.
          </p>
        ) : null
      ) : (
        <>
          <div className="drawer-scroll max-h-[min(60vh,520px)] overflow-y-auto p-4">
            <ul className="space-y-3">
              {state.cart.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.roomName}
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="type-label text-brand">{item.categoryName}</p>
                      <p className="truncate text-base font-semibold text-navy">
                        {item.roomName}
                      </p>
                      <p className="text-sm text-slate-500">{item.ratePlanName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.checkIn} → {item.checkOut}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.nights} night{item.nights !== 1 ? 's' : ''}
                      </p>
                      <p className="type-price mt-1 text-lg">
                        {formatMoney(item.breakdown.total, state.currency)}
                      </p>
                    </div>
                    {!onCheckout && (
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="shrink-0 self-start rounded p-1.5 text-slate-500 transition hover:bg-cream-dark hover:text-red-700 focus:ring-2 focus:ring-sand"
                        aria-label={`Remove ${item.roomName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border px-4 py-4">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-slate-500">
                {onCheckout ? 'Amount due' : 'Total'}
              </span>
              <span className="type-price text-2xl md:text-3xl">
                {formatMoney(cartTotal, state.currency)}
              </span>
            </div>
            {!onCheckout && (
              <Link
                to="/checkout"
                className="block rounded-lg bg-sand px-6 py-3 text-center text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
              >
                Checkout
              </Link>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
