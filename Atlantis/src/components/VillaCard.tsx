import { useMemo, useState } from 'react'
import { Bath, BedDouble, Maximize2, Waves, Users } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../utils/pricing'
import type { RatePlan, SubRoom } from '../types'
import ZoomableImage from './ZoomableImage'
import { VILLA_DESCRIPTION, VILLA_DISPLAY_NAME, buildVillaGallery } from '../utils/villa'

interface VillaCardProps {
  room: SubRoom
  rates: RatePlan[]
}

export default function VillaCard({ room, rates }: VillaCardProps) {
  const { state, openBooking } = useBooking()
  const gallery = useMemo(() => buildVillaGallery(room), [room])
  const [activeIdx, setActiveIdx] = useState(0)

  const activeImage = gallery[activeIdx] ?? gallery[0]
  const sideImages = gallery

  // One price for the whole villa — hide Room Only / B&B / Half Board list
  const villaRate = useMemo(() => {
    if (!rates.length) return null
    return (
      rates.find((r) => /room only/i.test(String(r.name))) ??
      [...rates].sort((a, b) => a.nightlyRate - b.nightlyRate)[0]
    )
  }, [rates])

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="grid gap-2 p-2 sm:p-3 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:gap-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg sm:aspect-[16/9] md:aspect-auto md:min-h-[320px] lg:min-h-[380px]">
          <ZoomableImage
            src={activeImage}
            alt={`${VILLA_DISPLAY_NAME} — photo ${activeIdx + 1}`}
            className="absolute inset-0 h-full w-full"
            loading="eager"
          />
        </div>

        <div className="hidden md:grid md:grid-cols-2 md:grid-rows-2 md:gap-3">
          {sideImages.slice(1, 5).map((src, i) => {
            const idx = i + 1
            return (
              <button
                key={`${src}-${idx}`}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-label={`View photo ${idx + 1}`}
                aria-pressed={idx === activeIdx}
                className={`relative min-h-[150px] overflow-hidden rounded-lg focus:ring-2 focus:ring-sand lg:min-h-[180px] ${
                  idx === activeIdx ? 'ring-2 ring-sand ring-offset-1' : 'opacity-95 hover:opacity-100'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-5 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5">
        <p className="type-label text-sand-dark">Private Villa · Zanzibar</p>
        <h2 className="mt-1 text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
          {VILLA_DISPLAY_NAME}
        </h2>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <BedDouble size={16} className="text-sand-dark" />
            {room.bedType} Bed
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={16} className="text-sand-dark" />
            Sleeps {room.maxOccupancy}
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 size={16} className="text-sand-dark" />
            {room.sizeSqm} sq m
          </span>
          <span className="flex items-center gap-1.5">
            <Waves size={16} className="text-sand-dark" />
            {room.view} View
          </span>
        </div>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink">
          {room.description?.trim() || VILLA_DESCRIPTION}
        </p>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-navy">Villa Details</h3>
          <p className="mt-1 text-sm text-slate-500">
            Everything included with your stay at Limiria Villa Zanzibar.
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-navy">
                <Bath size={14} className="text-sand-dark" />
                Amenities
              </h4>
              {room.amenities.length > 0 ? (
                <ul className="space-y-2">
                  {room.amenities.map((a) => (
                    <li key={a} className="flex gap-2.5 text-base leading-relaxed text-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand" aria-hidden />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Private pool, lounge terrace, and full villa facilities.</p>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy">
                Highlights
              </h4>
              {room.perks.length > 0 ? (
                <ul className="space-y-2">
                  {room.perks.map((p) => (
                    <li key={p} className="flex gap-2.5 text-base leading-relaxed text-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {[
                    'Entire villa exclusively yours',
                    'Private swimming pool',
                    'Open-air lounge & outdoor dining',
                    'Ideal for couples and small groups',
                  ].map((p) => (
                    <li key={p} className="flex gap-2.5 text-base leading-relaxed text-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {villaRate && (
          <div className="mt-8 border-t border-border pt-6">
            {room.available === false && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                These dates are not available. Change your check-in / check-out to book the villa.
              </p>
            )}
            <div className="flex flex-col gap-4 rounded-lg bg-cream p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-medium text-navy">Full Villa</p>
                <p className="mt-1 text-base leading-relaxed text-slate-600">
                  Entire villa for your stay — exclusive private use.
                </p>
                <p className="type-price mt-2 text-2xl md:text-3xl">
                  {formatMoney(villaRate.nightlyRate, state.currency)}
                  <span className="ml-1.5 text-sm font-normal text-slate-500">/ night</span>
                </p>
                <p className="text-sm text-slate-500">Excluding taxes and fees</p>
              </div>
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
                className="shrink-0 rounded-lg bg-sand px-8 py-3.5 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sand"
              >
                {room.available === false ? 'Unavailable' : 'Book Villa'}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
