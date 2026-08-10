import { useEffect } from 'react'
import { Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'

export default function CartDrawer() {
  const { state, cartCount, cartTotal, toggleCart, removeFromCart } =
    useBooking()

  useEffect(() => {
    if (!state.cartOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [state.cartOpen])

  if (!state.cartOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
        aria-label="Close cart"
        onClick={() => toggleCart(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="drawer-scroll relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="cart-title"
            className="text-xl font-medium tracking-tight text-navy"
          >
            Your Cart
            <span className="ml-2 align-middle text-base font-semibold text-sand-dark">
              ({cartCount})
            </span>
          </h2>
          <button
            type="button"
            onClick={() => toggleCart(false)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-cream-dark hover:text-navy focus:ring-2 focus:ring-sand"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-5 py-6">
          {state.cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-xl font-medium text-navy">
                Your cart is empty
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Select a villa rate to begin your reservation.
              </p>
              <p className="type-price mt-4 text-3xl">0</p>
              <button
                type="button"
                onClick={() => toggleCart(false)}
                className="mt-6 rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy focus:ring-2 focus:ring-navy"
              >
                Browse Villa
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {state.cart.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-lg border border-border p-3"
                >
                  <img
                    src={item.image}
                    alt={item.roomName}
                    className="h-20 w-24 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-navy">
                      {item.roomName}
                    </p>
                    <p className="text-sm text-slate-500">{item.ratePlanName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.checkIn} → {item.checkOut} · {item.nights} night
                      {item.nights !== 1 ? 's' : ''}
                    </p>
                    <p className="type-price mt-1 text-lg">
                      {formatMoney(item.breakdown.total, state.currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="shrink-0 self-start rounded p-1.5 text-slate-500 transition hover:bg-cream-dark hover:text-red-700 focus:ring-2 focus:ring-sand"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {state.cart.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Grand total</span>
              <span className="type-price text-2xl md:text-3xl">
                {formatMoney(cartTotal, state.currency)}
              </span>
            </div>
        <Link
          to="/checkout"
          onClick={() => toggleCart(false)}
          className="block rounded-lg bg-sand px-6 py-3 text-center text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
        >
          Checkout
        </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
