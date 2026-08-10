import { useMemo, useState } from 'react'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'
import type { BoardType, RatePlan, RoomCategory, SubRoom } from '../types'
import ZoomableImage from './ZoomableImage'

interface RateListViewProps {
  categories: RoomCategory[]
}

interface RateEntry {
  category: RoomCategory
  room: SubRoom
  rate: RatePlan
}

const BOARD_ORDER: BoardType[] = [
  'Room Only',
  'Bed & Breakfast',
  'Half Board',
  'Full Board',
]

export default function RateListView({ categories }: RateListViewProps) {
  const { state, openBooking, openDetail } = useBooking()
  const [activeByCategory, setActiveByCategory] = useState<
    Record<string, string>
  >({})

  const groups = useMemo(() => {
    const map = new Map<string, RateEntry[]>()

    for (const category of categories) {
      for (const room of category.rooms) {
        for (const rate of room.ratePlans) {
          const list = map.get(rate.name) ?? []
          list.push({ category, room, rate })
          map.set(rate.name, list)
        }
      }
    }

    return BOARD_ORDER.filter((name) => map.has(name)).map((name) => {
      let entries = map.get(name)!
      entries = [...entries].sort((a, b) =>
        state.sort === 'lowest'
          ? a.rate.nightlyRate - b.rate.nightlyRate
          : b.rate.nightlyRate - a.rate.nightlyRate,
      )
      return { name, entries }
    })
  }, [categories, state.sort])

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white py-16 text-center">
        <p className="text-2xl font-semibold text-navy">
          No rates match
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const byCat = new Map<string, RateEntry[]>()
        for (const e of group.entries) {
          const list = byCat.get(e.category.id) ?? []
          list.push(e)
          byCat.set(e.category.id, list)
        }

        return (
          <section
            key={group.name}
            className="overflow-hidden rounded-lg border border-border bg-white shadow-sm"
          >
            <div className="border-b border-border px-5 py-5 sm:px-8">
              <p className="type-label mb-2">Rate plan</p>
              <h2 className="text-2xl font-semibold tracking-tight text-navy md:text-3xl">
                {group.name === 'Room Only'
                  ? 'Best Available Rate'
                  : group.name}
              </h2>
              <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-600">
                • {group.name}
              </p>
              <button
                type="button"
                className="mt-2 text-base font-medium text-navy underline decoration-sand underline-offset-4 hover:text-sand-dark focus:ring-2 focus:ring-sand"
              >
                Rate Details
              </button>
            </div>

            <ul className="divide-y divide-border">
              {[...byCat.entries()].map(([catId, entries]) => {
                const category = entries[0].category
                const activeId =
                  activeByCategory[`${group.name}-${catId}`] ??
                  entries[0].room.id
                const entry =
                  entries.find((e) => e.room.id === activeId) ?? entries[0]
                const { room, rate } = entry

                return (
                  <li
                    key={`${group.name}-${catId}`}
                    className="grid gap-4 p-4 sm:grid-cols-[200px_minmax(0,1fr)_150px] sm:items-start sm:gap-5 sm:p-5"
                  >
                    <ZoomableImage
                      src={room.image}
                      alt={room.name}
                      className="h-24 w-full rounded-lg sm:h-28"
                    />

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openDetail(room, category.name)}
                        className="text-left text-xl font-medium leading-snug tracking-tight text-navy underline decoration-sand underline-offset-4 transition hover:text-sand-dark md:text-2xl"
                      >
                        {category.name}
                      </button>

                      {category.rooms.length > 1 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {entries.map((e) => (
                            <button
                              key={e.room.id}
                              type="button"
                              onClick={() =>
                                setActiveByCategory((prev) => ({
                                  ...prev,
                                  [`${group.name}-${catId}`]: e.room.id,
                                }))
                              }
                              className={`rounded-lg px-3 py-2 text-sm font-medium transition focus:ring-2 focus:ring-sand ${
                                e.room.id === room.id
                                  ? 'bg-sand text-navy'
                                  : 'border border-border bg-white text-slate-600 hover:border-sand'
                              }`}
                            >
                              {e.room.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="mt-4 text-base text-slate-600">
                        {room.bedType} bed · Sleeps {room.maxOccupancy} ·{' '}
                        {room.sizeSqm} sq m
                      </p>
                      <p className="mt-2 max-w-prose text-base leading-relaxed text-ink">
                        {room.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-start sm:items-end sm:text-right">
                      <p className="type-price text-2xl md:text-3xl">
                        {formatMoney(rate.nightlyRate, state.currency)}
                      </p>
                      <p className="text-sm font-medium text-slate-600">
                        Per Night
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Excluding taxes and fees
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openBooking(room, category.name, rate)
                        }
                        className="mt-5 w-full rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy sm:w-auto"
                      >
                        Book Now
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
