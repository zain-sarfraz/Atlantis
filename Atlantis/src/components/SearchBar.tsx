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
import { hotelApi } from '../api/client'

import { useNavigate } from 'react-router-dom'

import { DEFAULT_BLOCKED_DATES } from '../data/mock-data'

export default function SearchBar() {
  const navigate = useNavigate()
  const {
    state,
    nights,
    today,
    cartCount,
    setGuests,
    setDates,
    setPromo,
    fromTotal,
  } = useBooking()

  const [guestsOpen, setGuestsOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [selecting, setSelecting] = useState<'in' | 'out'>('in')
  const [blockedDates, setBlockedDates] = useState<string[]>(DEFAULT_BLOCKED_DATES)
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [closedDates, setClosedDates] = useState<string[]>([])
  const guestsRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const promoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    hotelApi
      .getBlockedDates()
      .then((res) => {
        const blocked = res.blockedDates ?? []
        const booked = res.bookedDates ?? []
        const closed = res.closedDates ?? []
        if (blocked.length > 0 || booked.length > 0 || closed.length > 0) {
          setBlockedDates(Array.from(new Set([...DEFAULT_BLOCKED_DATES, ...blocked, ...booked, ...closed])))
          setBookedDates(booked)
          setClosedDates(closed)
        }
      })
      .catch((err) => {
        console.warn('Failed to load blocked dates:', err)
        setBlockedDates(DEFAULT_BLOCKED_DATES)
        setBookedDates([])
        setClosedDates([])
      })
  }, [])

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
    const blockedSet = new Set(blockedDates)

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
      // Ensure selected stay range does not overlap any blocked dates
      let cur = new Date(state.checkIn)
      cur.setDate(cur.getDate() + 1)
      let spansBlocked = false
      while (cur <= day) {
        const yyyy = cur.getFullYear()
        const mm = String(cur.getMonth() + 1).padStart(2, '0')
        const dd = String(cur.getDate()).padStart(2, '0')
        if (blockedSet.has(`${yyyy}-${mm}-${dd}`)) {
          spansBlocked = true
          break
        }
        cur.setDate(cur.getDate() + 1)
      }
      if (spansBlocked) {
        setDates(day, null)
        setSelecting('out')
        return
      }

      setDates(state.checkIn, day)
      setSelecting('in')
      setCalendarOpen(false)
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${guestsOpen ? cellActive : cellIdle
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
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${calendarOpen && selecting === 'in' ? cellActive : cellIdle
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
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${calendarOpen && selecting === 'out' ? cellActive : cellIdle
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
                    <p className="text-base font-semibold text-navy">
                      Select check-in & check-out
                    </p>
                  </div>
                  <Calendar
                    checkIn={state.checkIn}
                    checkOut={state.checkOut}
                    today={today}
                    currency={state.currency}
                    onSelect={handleDateSelect}
                    compact
                    blockedDates={blockedDates}
                    bookedDates={bookedDates}
                    closedDates={closedDates}
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${promoOpen ? cellActive : cellIdle
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
                    {formatMoney(fromPrice, state.currency, false)}
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
                onClick={() => navigate('/checkout')}
                className="inline-flex items-center gap-1.5 text-sm text-taupe transition hover:text-sand"
              >
                <ShoppingBag size={15} strokeWidth={1.5} />
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </button>
            </div>

            <div className="flex gap-2">
              {state.checkIn && state.checkOut && (
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="type-cta rounded bg-sand px-6 py-2.5 text-white transition hover:bg-sand-dark focus:ring-2 focus:ring-sand font-bold text-sm shadow-sm uppercase tracking-wide"
                >
                  Check-Out
                </button>
              )}
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
