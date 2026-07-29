import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import ZoomableImage from './ZoomableImage'

export default function RoomModal() {
  const { state, closeDetail } = useBooking()
  const detail = state.detailRoom

  useEffect(() => {
    if (!detail) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [detail, closeDetail])

  if (!detail) return null

  const { room, categoryName } = detail
  const highlightAmenities = room.amenities.slice(0, 4)
  const detailList = [...room.amenities.slice(4), ...room.perks]

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/55 backdrop-blur-[2px]"
        aria-label="Close modal backdrop"
        onClick={closeDetail}
      />

      <div className="relative z-10 w-full max-w-[780px]">
        <button
          type="button"
          onClick={closeDetail}
          className="absolute -right-2 -top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-navy text-cream shadow-lg transition hover:bg-charcoal focus:ring-2 focus:ring-sand sm:-right-3 sm:-top-3"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.25} />
        </button>

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-modal-title"
          className="drawer-scroll max-h-[min(88vh,820px)] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl sm:p-8 md:p-10"
        >
          <div className="grid gap-6 sm:grid-cols-[1.15fr_0.95fr] sm:items-start sm:gap-8">
            <div className="min-w-0">
              <h2
                id="room-modal-title"
                className="text-xl font-medium leading-snug tracking-tight text-navy md:text-2xl"
              >
                {categoryName}: {room.name}
              </h2>

              <p className="mt-2 text-base text-slate-600">
                {room.bedType} bed · Sleeps {room.maxOccupancy} · {room.sizeSqm}{' '}
                sq m · {room.view} view
              </p>

              <h3 className="mt-6 mb-2 text-xl font-medium text-navy">
                Room Amenities
              </h3>
              <ul className="space-y-2.5">
                {highlightAmenities.map((a) => (
                  <li
                    key={a}
                    className="flex gap-2.5 text-base leading-relaxed text-ink"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand"
                      aria-hidden
                    />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="order-first overflow-hidden rounded-lg sm:order-none">
              <ZoomableImage
                src={room.image}
                alt={room.name}
                className="aspect-[4/3] w-full sm:aspect-[5/4]"
                loading="eager"
              />
            </div>
          </div>

          <hr className="my-8 border-0 border-t border-border" />

          <p className="max-w-prose text-base leading-relaxed text-ink">
            {room.description}
          </p>

          <ul className="mt-6 space-y-2.5">
            {detailList.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-base font-medium leading-relaxed text-ink"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
