import { useState } from 'react'
import { BedDouble, Maximize2, Users } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'
import type { RoomCategory, SubRoom } from '../types'
import ZoomableImage from './ZoomableImage'

interface RoomCardProps {
  category: RoomCategory
}

export default function RoomCard({ category }: RoomCardProps) {
  const { state, openBooking, openDetail } = useBooking()
  const [activeIdx, setActiveIdx] = useState(0)
  const [showMoreRates, setShowMoreRates] = useState(false)

  const room: SubRoom = category.rooms[activeIdx] ?? category.rooms[0]
  const visibleRates = showMoreRates
    ? room.ratePlans
    : room.ratePlans.slice(0, 2)
  const hasMore = room.ratePlans.length > 2

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white shadow-sm transition hover:shadow-md">
      <div className="grid md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] md:items-start">
        <div className="relative h-36 w-full overflow-hidden sm:h-40 md:h-[148px]">
          <ZoomableImage
            src={room.image}
            alt={room.name}
            className="absolute inset-0 h-full w-full"
          />
          <div className="pointer-events-none absolute bottom-2 left-2 z-[1] rounded bg-navy/85 px-2 py-0.5 type-label text-sand">
            {category.name}
          </div>
        </div>

        <div className="flex flex-col p-4 sm:p-5">
          {category.rooms.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {category.rooms.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveIdx(i)
                    setShowMoreRates(false)
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition focus:ring-2 focus:ring-sand ${
                    i === activeIdx
                      ? 'bg-sand text-navy'
                      : 'bg-cream-dark text-slate-600 hover:text-navy'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
            {room.name}
          </h2>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <BedDouble size={16} className="text-sand-dark" />
              {room.bedType} Bed
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={16} className="text-sand-dark" />
              Max {room.maxOccupancy}
            </span>
            <span className="flex items-center gap-1.5">
              <Maximize2 size={16} className="text-sand-dark" />
              {room.sizeSqm} sq m
            </span>
            <span className="font-medium text-sand-dark">{room.view} View</span>
          </div>

          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink">
            {room.description}
          </p>

          <button
            type="button"
            onClick={() => openDetail(room, category.name)}
            className="mt-3 self-start text-sm font-medium uppercase tracking-wide text-navy underline decoration-sand underline-offset-4 transition hover:text-sand-dark focus:ring-2 focus:ring-sand"
          >
            Room Details
          </button>

          <div className="mt-6 space-y-3 border-t border-border pt-5">
            {visibleRates.map((rate) => (
              <div
                key={rate.id}
                className="flex flex-col gap-3 rounded-lg bg-cream p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xl font-medium text-navy">
                    {rate.name}
                  </p>
                  <p className="mt-1 max-w-md text-base leading-relaxed text-slate-600">
                    {rate.description}
                  </p>
                  <p className="type-price mt-2 text-2xl md:text-3xl">
                    {formatMoney(rate.nightlyRate, state.currency)}
                    <span className="ml-1.5 text-sm font-normal text-slate-500">
                      / night
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Excluding taxes and fees
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openBooking(room, category.name, rate)}
                  className="shrink-0 rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
                >
                  Book Now
                </button>
              </div>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={() => setShowMoreRates((o) => !o)}
                className="text-sm font-medium text-navy underline-offset-2 hover:underline"
              >
                {showMoreRates ? 'View Fewer Rates' : 'View More Rates'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
