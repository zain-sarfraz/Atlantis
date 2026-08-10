import { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Minus, Plus, Tag, Users } from 'lucide-react'
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
    setGuests,
    setDates,
    setPromo,
    applySearch,
    resetSearch,
    fromTotal,
  } = useBooking()

  const [guestsOpen, setGuestsOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [selecting, setSelecting] = useState<'in' | 'out'>('in')
  const guestsRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const popoverOpen = guestsOpen || calendarOpen

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (guestsRef.current && !guestsRef.current.contains(target)) {
        setGuestsOpen(false)
      }
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setCalendarOpen(false)
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

  return (
    <section className="relative z-0">
      <div className="relative z-20 w-full" ref={calendarRef}>
        <div className="grid grid-cols-1 gap-0 rounded-lg border border-border bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-border">
          {/* Guests */}
          <div className="relative" ref={guestsRef}>
            <button
              type="button"
              onClick={() => {
                setGuestsOpen((o) => !o)
                setCalendarOpen(false)
              }}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                guestsOpen ? 'bg-cream ring-1 ring-inset ring-navy' : 'hover:bg-cream/80'
              }`}
            >
              <Users size={18} className="shrink-0 text-taupe" />
              <div className="min-w-0 flex-1">
                <div className="type-label">Guests</div>
                <div className="truncate text-base leading-snug text-navy">
                  {state.guests.adults + state.guests.children} guest
                  {state.guests.adults + state.guests.children !== 1 ? 's' : ''}
                  , 1 villa
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-500 transition ${
                  guestsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {guestsOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-lg border border-border bg-white p-4 shadow-xl">
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
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
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
                  className="mt-3 w-full rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Check-in */}
          <button
            type="button"
            onClick={() => {
              setCalendarOpen(true)
              setGuestsOpen(false)
              setSelecting('in')
            }}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
              calendarOpen && selecting === 'in'
                ? 'bg-cream ring-1 ring-inset ring-sand'
                : 'hover:bg-cream/80'
            }`}
          >
            <CalendarIcon size={18} className="shrink-0 text-taupe" />
            <div className="min-w-0">
              <div className="type-label">Check-in</div>
              <div className="text-base leading-snug text-navy">
                {formatDisplayDate(state.checkIn)}
              </div>
            </div>
          </button>

          {/* Check-out */}
          <button
            type="button"
            onClick={() => {
              setCalendarOpen(true)
              setGuestsOpen(false)
              setSelecting(state.checkIn ? 'out' : 'in')
            }}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
              calendarOpen && selecting === 'out'
                ? 'bg-cream ring-1 ring-inset ring-sand'
                : 'hover:bg-cream/80'
            }`}
          >
            <CalendarIcon size={18} className="shrink-0 text-taupe" />
            <div className="min-w-0">
              <div className="type-label">Check-out</div>
              <div className="text-base leading-snug text-navy">
                {formatDisplayDate(state.checkOut)}
              </div>
            </div>
          </button>
        </div>

        {calendarOpen && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full max-w-[640px] rounded-lg border border-border bg-white p-4 shadow-xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base font-medium text-navy">
                Select check-in & check-out
              </p>
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                className="rounded-lg bg-sand px-4 py-2 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
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

      {calendarOpen && (
        <div className="h-[380px] sm:h-[340px]" aria-hidden />
      )}
      {guestsOpen && !calendarOpen && (
        <div
          className="w-full"
          style={{
            height: `${220 + state.guests.children * 72}px`,
          }}
          aria-hidden
        />
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setPromoOpen((o) => !o)}
          className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium text-sand transition focus:ring-2 focus:ring-sand ${
            promoOpen
              ? 'border-sand bg-cream-dark'
              : 'border-transparent hover:border-sand/40'
          }`}
        >
          <Tag size={14} className="text-sand" />
          Special Codes or Rates
          <ChevronDown
            size={14}
            className={`transition ${promoOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {promoOpen && (
        <div className="mt-2 ml-auto flex max-w-sm flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={state.promoCode}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Enter promo code"
            className="w-full rounded-lg border border-border px-4 py-2.5 text-base text-ink outline-none focus:border-sand focus:ring-2 focus:ring-sand"
          />
          <button
            type="button"
            onClick={() => setPromoOpen(false)}
            className="shrink-0 rounded-lg bg-sand px-6 py-2.5 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
          >
            Done
          </button>
        </div>
      )}

      {fromPrice !== null && nights > 0 && (
        <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
          From{' '}
          <span className="type-price text-2xl md:text-3xl">
            {formatMoney(fromPrice, state.currency)}
          </span>{' '}
          <span className="text-base font-normal text-taupe md:text-lg">
            total for {nights} night{nights !== 1 ? 's' : ''}
          </span>
        </p>
      )}

      <div
        className={`mt-4 flex gap-3 border-t border-border py-4 ${
          popoverOpen ? 'relative z-0' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => {
            applySearch()
            setCalendarOpen(false)
            setGuestsOpen(false)
          }}
          className="rounded-lg bg-sand px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:bg-sand-dark focus:ring-2 focus:ring-navy"
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
          className="rounded-lg border border-border bg-white px-6 py-3 text-sm font-medium uppercase tracking-wide text-navy transition hover:border-sand focus:ring-2 focus:ring-sand"
        >
          Cancel
        </button>
      </div>
    </section>
  )
}
