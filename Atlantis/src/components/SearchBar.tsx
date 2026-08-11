import { useEffect, useRef, useState } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Users,
} from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import {
  formatDisplayDate,
  formatMoney,
  isBeforeDay,
  isSameDay,
  startOfDay,
} from '../utils/pricing'
import Calendar from './Calendar'

export default function SearchBar() {
  const {
    state,
    nights,
    today,
    cartCount,
    setGuests,
    setDates,
    setPromo,
    applySearch,
    resetSearch,
    fromTotal,
    toggleCart,
  } = useBooking()

  const [guestsOpen, setGuestsOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [selecting, setSelecting] = useState<'in' | 'out'>('in')
  const guestsRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const promoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (guestsRef.current && !guestsRef.current.contains(target)) {
        setGuestsOpen(false)
      }
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setCalendarOpen(false)
      }
      if (promoRef.current && !promoRef.current.contains(target)) {
        setPromoOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fromPrice = fromTotal

  const handleDateSelect = (date: Date) => {
    const day = startOfDay(date)
    if (selecting === 'in' || !state.checkIn) {
      setDates(day, null)
      setSelecting('out')
      return
    }
    if (
      state.checkIn &&
      !isBeforeDay(day, state.checkIn) &&
      !isSameDay(day, state.checkIn)
    ) {
      setDates(state.checkIn, day)
      setSelecting('in')
      return
    }
    setDates(day, null)
    setSelecting('out')
  }

  const Stepper = ({
    label,
    value,
    min,
    onChange,
  }: {
    label: string
    value: number
    min: number
    onChange: (n: number) => void
  }) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-base text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-navy transition hover:border-sand focus:ring-2 focus:ring-sand disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-base font-medium tabular-nums text-navy">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-navy transition hover:border-sand"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )

  const cellActive = 'bg-cream ring-2 ring-inset ring-sand'
  const cellIdle = 'hover:bg-cream/80'

  return (
    <section id="booking-search" className="relative z-50">
      <div className="relative" ref={calendarRef}>
        <div className="rounded-xl border border-border bg-white p-3 shadow-lg sm:p-4">
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
            <div className="relative" ref={guestsRef}>
              <button
                type="button"
                onClick={() => {
                  setGuestsOpen((o) => !o)
                  setCalendarOpen(false)
                  setPromoOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                  guestsOpen ? cellActive : cellIdle
                }`}
              >
                <Users size={18} className="shrink-0 text-taupe" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="type-label">Guests</div>
                  <div className="truncate text-sm font-medium leading-snug tracking-tight text-navy">
                    {state.guests.adults + state.guests.children} guest
                    {state.guests.adults + state.guests.children !== 1 ? 's' : ''}
                    , 1 villa
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-500 transition ${guestsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {guestsOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-[60] w-[300px] rounded-md border border-border bg-white p-4 shadow-xl">
                  <Stepper
                    label="Adults"
                    value={state.guests.adults}
                    min={1}
                    onChange={(n) => setGuests({ adults: n })}
                  />
                  <Stepper
                    label="Children (Ages 0-13)"
                    value={state.guests.children}
                    min={0}
                    onChange={(n) => setGuests({ children: n })}
                  />
                  {state.guests.children > 0 && (
                    <div className="mt-2 space-y-2 border-t border-border pt-3">
                      {Array.from({ length: state.guests.children }, (_, i) => (
                        <label key={i} className="block">
                          <span className="mb-1 block text-sm font-medium text-ink">
                            Child {i + 1} Age
                            <span className="text-brand"> *</span>
                          </span>
                          <select
                            value={state.guests.childAges[i] ?? ''}
                            onChange={(e) => {
                              const ages = [...state.guests.childAges]
                              ages[i] =
                                e.target.value === '' ? null : Number(e.target.value)
                              setGuests({ childAges: ages })
                            }}
                            required
                            className="w-full rounded border border-border bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand"
                          >
                            <option value="">Select age</option>
                            {Array.from({ length: 14 }, (_, age) => (
                              <option key={age} value={age}>
                                {age}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setGuestsOpen(false)}
                    className="type-cta mt-3 w-full rounded bg-sand px-6 py-3 text-white transition hover:bg-sand-dark"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            <div className="relative sm:col-span-2 lg:col-span-2">
              <div className="grid grid-cols-2 divide-x divide-border">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarOpen(true)
                    setGuestsOpen(false)
                    setPromoOpen(false)
                    setSelecting('in')
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                    calendarOpen && selecting === 'in' ? cellActive : cellIdle
                  }`}
                >
                  <CalendarIcon size={18} className="shrink-0 text-taupe" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="type-label">Check-in</div>
                    <div className="text-sm font-medium leading-snug tracking-tight text-navy">
                      {formatDisplayDate(state.checkIn)}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalendarOpen(true)
                    setGuestsOpen(false)
                    setPromoOpen(false)
                    setSelecting(state.checkIn ? 'out' : 'in')
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                    calendarOpen && selecting === 'out' ? cellActive : cellIdle
                  }`}
                >
                  <CalendarIcon size={18} className="shrink-0 text-taupe" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="type-label">Check-out</div>
                    <div className="text-sm font-medium leading-snug tracking-tight text-navy">
                      {formatDisplayDate(state.checkOut)}
                    </div>
                  </div>
                </button>
              </div>

              {calendarOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] rounded-lg border border-border bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-navy">
                      Select check-in & check-out
                    </p>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(false)}
                      className="type-cta shrink-0 rounded bg-sand px-4 py-1.5 text-white transition hover:bg-sand-dark"
                    >
                      Done
                    </button>
                  </div>
                  <Calendar
                    checkIn={state.checkIn}
                    checkOut={state.checkOut}
                    today={today}
                    currency={state.currency}
                    onSelect={handleDateSelect}
                    compact
                  />
                </div>
              )}
            </div>

            <div className="relative" ref={promoRef}>
              <button
                type="button"
                onClick={() => {
                  setPromoOpen((o) => !o)
                  setGuestsOpen(false)
                  setCalendarOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                  promoOpen ? cellActive : cellIdle
                }`}
              >
                <Tag size={18} className="shrink-0 text-taupe" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="type-label">Special Codes or Rates</div>
                  <div className="truncate text-sm leading-snug text-navy">
                    {state.promoCode.trim() || 'Add a code'}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-500 transition ${promoOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {promoOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-[60] w-[min(100vw-2rem,320px)] rounded-md border border-border bg-white p-4 shadow-xl">
                  <input
                    type="text"
                    value={state.promoCode}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Enter promo code"
                    className="w-full rounded border border-border px-4 py-2.5 text-base text-ink outline-none focus:border-sand focus:ring-2 focus:ring-sand"
                  />
                  <button
                    type="button"
                    onClick={() => setPromoOpen(false)}
                    className="type-cta mt-3 w-full rounded bg-sand px-6 py-2.5 text-white transition hover:bg-sand-dark"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {fromPrice !== null && nights > 0 ? (
                <p className="text-sm text-navy sm:text-base">
                  From{' '}
                  <span className="type-price text-lg sm:text-xl">
                    {formatMoney(fromPrice, state.currency)}
                  </span>{' '}
                  <span className="text-taupe">
                    total for {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-taupe">Select dates to see pricing</p>
              )}
              <button
                type="button"
                onClick={() => toggleCart(true)}
                className="inline-flex items-center gap-1.5 text-sm text-taupe transition hover:text-sand"
              >
                <ShoppingBag size={15} strokeWidth={1.5} />
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  applySearch()
                  setCalendarOpen(false)
                  setGuestsOpen(false)
                  setPromoOpen(false)
                }}
                className="type-cta rounded bg-sand px-5 py-2.5 text-white transition hover:bg-sand-dark"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSearch()
                  setCalendarOpen(false)
                  setSelecting('in')
                }}
                className="type-cta rounded border border-border bg-white px-5 py-2.5 text-navy transition hover:border-sand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {calendarOpen && <div className="h-[320px]" aria-hidden />}
      {guestsOpen && !calendarOpen && (
        <div style={{ height: `${220 + state.guests.children * 72}px` }} aria-hidden />
      )}
      {promoOpen && !calendarOpen && !guestsOpen && <div className="h-[140px]" aria-hidden />}
    </section>
  )
}
