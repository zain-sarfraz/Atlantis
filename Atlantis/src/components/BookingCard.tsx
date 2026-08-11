import { Home } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'
import type { RatePlan, SubRoom } from '../types'
import { VILLA_DISPLAY_NAME, buildVillaGallery } from '../utils/villa'
import { useVillaRate } from './VillaCard'

interface BookingCardProps {
  room: SubRoom
  rates: RatePlan[]
}

export default function BookingCard({ room, rates }: BookingCardProps) {
  const { state, openBooking } = useBooking()
  const villaRate = useVillaRate(rates)
  const gallery = buildVillaGallery(room)

  if (!villaRate) return null

  return (
    <aside className="rounded-2xl bg-white p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand/10">
          <Home size={18} className="text-sand" strokeWidth={1.5} />
        </span>
        <div>
          <h2 className="font-serif text-[1.625rem] font-semibold tracking-[-0.02em] text-navy">
            Full Villa
          </h2>
          <p className="type-meta mt-1 text-slate-500">
            Entire villa for your stay — exclusive private use.
          </p>
        </div>
      </div>

      <p className="type-price mt-5 text-[1.75rem] md:text-[2rem]">
        {formatMoney(villaRate.nightlyRate, state.currency)}
        <span className="ml-1.5 text-[0.8125rem] font-medium text-slate-500">/ night</span>
      </p>
      <p className="type-meta mt-1 text-slate-500">Excluding taxes and fees</p>

      {room.available === false && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[0.8125rem] font-medium text-amber-900">
          These dates are not available. Change check-in / check-out to book.
        </p>
      )}

      <button
        type="button"
        disabled={room.available === false}
        onClick={() =>
          openBooking(
            { ...room, name: VILLA_DISPLAY_NAME, image: gallery[0], gallery },
            'Villa',
            {
              ...villaRate,
              name: 'Full Villa',
              description: 'Entire villa — exclusive private use',
            },
          )
        }
        className="type-cta mt-6 w-full rounded-lg bg-sand px-6 py-3.5 text-white transition hover:bg-sand-dark focus:ring-2 focus:ring-sand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sand"
      >
        {room.available === false ? 'Unavailable' : 'Book Villa'}
      </button>
    </aside>
  )
}
