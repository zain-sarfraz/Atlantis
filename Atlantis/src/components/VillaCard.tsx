import { useMemo, useState } from 'react'
import { Bath, BedDouble, Maximize2, Waves, Users } from 'lucide-react'
import type { RatePlan, SubRoom } from '../types'
import ZoomableImage from './ZoomableImage'
import { VILLA_DESCRIPTION, VILLA_DISPLAY_NAME, buildVillaGallery } from '../utils/villa'

interface VillaCardProps {
  room: SubRoom
  rates: RatePlan[]
  /** When true, only render the image gallery (hero). */
  galleryOnly?: boolean
  /** When true, only render the details column (no gallery / book CTA). */
  detailsOnly?: boolean
}

export function useVillaRate(rates: RatePlan[]) {
  return useMemo(() => {
    if (!rates.length) return null
    return (
      rates.find((r) => /room only/i.test(String(r.name))) ??
      [...rates].sort((a, b) => a.nightlyRate - b.nightlyRate)[0]
    )
  }, [rates])
}

export function VillaGallery({ room }: { room: SubRoom }) {
  const gallery = useMemo(() => buildVillaGallery(room), [room])
  const [activeIdx, setActiveIdx] = useState(0)
  const activeImage = gallery[activeIdx] ?? gallery[0]
  const sideImages = gallery

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:gap-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-md sm:aspect-[16/9] md:aspect-auto md:min-h-[320px] lg:min-h-[380px]">
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
              className={`relative min-h-[150px] overflow-hidden rounded-md focus:ring-2 focus:ring-sand lg:min-h-[180px] ${
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

      {/* Mobile thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {sideImages.slice(0, 5).map((src, idx) => (
          <button
            key={`m-${src}-${idx}`}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-label={`View photo ${idx + 1}`}
            className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md ${
              idx === activeIdx ? 'ring-2 ring-sand' : ''
            }`}
          >
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function VillaCard({ room, rates: _rates, galleryOnly, detailsOnly }: VillaCardProps) {
  if (galleryOnly) {
    return <VillaGallery room={room} />
  }

  return (
    <article className={detailsOnly ? '' : 'overflow-hidden rounded-md border border-border bg-white'}>
      {!detailsOnly && (
        <div className="p-2 sm:p-3">
          <VillaGallery room={room} />
        </div>
      )}

      <div className={detailsOnly ? '' : 'px-5 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5'}>
        <p className="type-label text-sand">Private Villa · Zanzibar</p>
        <h2 className="mt-1 font-serif text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
          {VILLA_DISPLAY_NAME}
        </h2>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <BedDouble size={16} className="text-sand" strokeWidth={1.5} />
            {room.bedType} Bed
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={16} className="text-sand" strokeWidth={1.5} />
            Sleeps {room.maxOccupancy}
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 size={16} className="text-sand" strokeWidth={1.5} />
            {room.sizeSqm} sq m
          </span>
          <span className="flex items-center gap-1.5">
            <Waves size={16} className="text-sand" strokeWidth={1.5} />
            {room.view} View
          </span>
        </div>

        <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink">
          {room.description?.trim() || VILLA_DESCRIPTION}
        </p>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-serif text-xl font-semibold text-navy">Villa Details</h3>
          <p className="mt-1 text-sm text-slate-500">
            Everything included with your stay at Limiria Villa Zanzibar.
          </p>

          <div className="mt-5 grid gap-8 sm:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-navy uppercase">
                <Bath size={14} className="text-sand" strokeWidth={1.5} />
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
              <h4 className="mb-3 text-xs font-semibold tracking-widest text-navy uppercase">
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
      </div>
    </article>
  )
}
