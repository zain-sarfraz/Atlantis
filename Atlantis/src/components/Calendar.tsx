import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  convertAmount,
  formatMoney,
  isBeforeDay,
  isSameDay,
  startOfDay,
} from '../utils/pricing'
import { getDatePrice } from '../data/mock-calendar-prices'
import type { Currency } from '../types'

interface CalendarProps {
  checkIn: Date | null
  checkOut: Date | null
  today: Date
  currency: Currency
  onSelect: (date: Date) => void
  compact?: boolean
  blockedDates?: string[]
  bookedDates?: string[]
  closedDates?: string[]
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function MonthGrid({
  monthDate,
  checkIn,
  checkOut,
  today,
  currency,
  onSelect,
  compact,
  blockedDates = [],
  bookedDates = [],
  closedDates = [],
}: {
  monthDate: Date
  checkIn: Date | null
  checkOut: Date | null
  today: Date
  currency: Currency
  onSelect: (date: Date) => void
  compact?: boolean
  blockedDates?: string[]
  bookedDates?: string[]
  closedDates?: string[]
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStart = startOfDay(today)
  const cellH = compact ? 'h-13 sm:h-14' : 'h-14'
  const textSize = compact ? 'text-sm sm:text-base' : 'text-base'

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates])
  const closedSet = useMemo(() => new Set(closedDates), [closedDates])
  const blockedSet = useMemo(() => {
    const set = new Set(blockedDates)
    for (const d of bookedDates) set.add(d)
    for (const d of closedDates) set.add(d)
    return set
  }, [blockedDates, bookedDates, closedDates])

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }

  const isInRange = (date: Date) => {
    if (!checkIn || !checkOut) return false
    const t = startOfDay(date).getTime()
    return (
      t > startOfDay(checkIn).getTime() && t < startOfDay(checkOut).getTime()
    )
  }

  return (
    <div className="min-w-0 flex-1">
      {!compact && (
        <h3 className="mb-3 text-center text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-navy font-serif">
          {monthDate.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
      )}
      <div className={`mb-1 grid grid-cols-7 gap-0 text-center ${compact ? 'gap-0' : 'gap-0.5'}`}>
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className={`py-1 font-bold tracking-wide text-taupe uppercase ${
              compact ? 'text-xs' : 'type-label py-1'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className={cellH} />

          const yyyy = date.getFullYear()
          const mm = String(date.getMonth() + 1).padStart(2, '0')
          const dd = String(date.getDate()).padStart(2, '0')
          const dateStr = `${yyyy}-${mm}-${dd}`

          const past = isBeforeDay(date, todayStart)
          const isBooked = bookedSet.has(dateStr)
          const isClosed = !isBooked && closedSet.has(dateStr)
          const isBlocked = blockedSet.has(dateStr)
          const selectedStart = checkIn && isSameDay(date, checkIn)
          const selectedEnd = checkOut && isSameDay(date, checkOut)
          const inRange = isInRange(date)
          const disabled = past || isBlocked
          const key = `${year}-${month}-${date.getDate()}`

          const aedRate = getDatePrice(date) ?? 1396
          const displayPrice = convertAmount(aedRate, currency)
          const compactPriceStr =
            currency === 'USD'
              ? `$${Math.round(displayPrice)}`
              : currency === 'EUR'
              ? `€${Math.round(displayPrice)}`
              : currency === 'GBP'
              ? `£${Math.round(displayPrice)}`
              : `${Math.round(displayPrice)}`

          let cellClass = `relative flex w-full items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sand ${cellH} ${textSize} `

          if (past) {
            cellClass += 'cursor-not-allowed text-slate-300 font-normal opacity-35 bg-slate-50/50 rounded-lg'
          } else if (isClosed) {
            cellClass += 'cursor-not-allowed bg-amber-50 border border-amber-200 text-amber-800 font-normal rounded-lg shadow-2xs'
          } else if (isBooked || isBlocked) {
            cellClass += 'cursor-not-allowed bg-rose-50/90 border border-rose-200 text-rose-700 font-normal rounded-lg shadow-2xs'
          } else if (selectedStart && selectedEnd) {
            cellClass += 'rounded-lg bg-[#bca37f] font-semibold text-white shadow-sm ring-2 ring-[#bca37f]'
          } else if (selectedStart) {
            cellClass += 'rounded-l-lg bg-[#bca37f] font-semibold text-white shadow-sm'
          } else if (selectedEnd) {
            cellClass += 'rounded-r-lg bg-[#bca37f] font-semibold text-white shadow-sm'
          } else if (inRange) {
            cellClass += 'bg-[#bca37f]/25 font-medium text-navy border-y border-[#bca37f]/30'
          } else {
            cellClass += 'rounded-lg text-slate-800 border border-amber-200/50 bg-amber-50/20 hover:bg-[#bca37f]/15 hover:border-[#bca37f] transition-all'
          }

          const statusTitle = isClosed
            ? 'Closed / Unavailable'
            : isBooked || isBlocked
              ? 'Unavailable / Booked'
              : past
                ? 'Past Date'
                : `Available — ${formatMoney(aedRate, currency)} / night`

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              title={statusTitle}
              onClick={() => onSelect(date)}
              className={cellClass}
            >
              <div className="flex flex-col items-center justify-center py-0.5 leading-none">
                <div className="flex items-center gap-0.5">
                  <span
                    className={`text-sm sm:text-base ${
                      isClosed
                        ? 'text-amber-800 font-bold'
                        : isBooked || isBlocked
                          ? 'text-rose-700 font-bold'
                          : past
                            ? 'text-slate-300 font-normal'
                            : 'font-bold text-slate-900'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {!past && !selectedStart && !selectedEnd && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isClosed
                          ? 'bg-amber-500'
                          : isBooked || isBlocked
                            ? 'bg-rose-500'
                            : 'bg-[#bca37f]'
                      }`}
                    />
                  )}
                </div>
                {isClosed && !past ? (
                  <span className="mt-0.5 text-[11px] font-bold tracking-tight text-amber-700">
                    Closed
                  </span>
                ) : (isBooked || isBlocked) && !past ? (
                  <span className="mt-0.5 text-[11px] font-bold tracking-tight text-rose-600">
                    Booked
                  </span>
                ) : !past && (
                  <span
                    className={`mt-0.5 text-[11px] font-semibold tracking-tighter ${
                      selectedStart || selectedEnd ? 'text-white/95' : inRange ? 'text-navy font-bold' : 'text-slate-600'
                    }`}
                  >
                    {compactPriceStr}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Calendar({
  checkIn,
  checkOut,
  today,
  currency,
  onSelect,
  compact = false,
  blockedDates = [],
  bookedDates = [],
  closedDates = [],
}: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const secondMonth = useMemo(() => addMonths(viewMonth, 1), [viewMonth])

  const monthLabel = viewMonth.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className={compact ? 'w-full' : 'w-full'}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2 gap-2' : 'mb-3'}`}>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="rounded p-1 text-navy transition hover:bg-cream-dark"
          aria-label="Previous month"
        >
          <ChevronLeft size={compact ? 16 : 18} />
        </button>
        {compact ? (
          <h3 className="text-xl font-serif font-bold text-navy">{monthLabel}</h3>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="rounded p-1 text-navy transition hover:bg-cream-dark"
          aria-label="Next month"
        >
          <ChevronRight size={compact ? 16 : 18} />
        </button>
      </div>
      <div className={`flex gap-6 ${compact ? 'flex-col' : 'flex-col lg:flex-row'}`}>
        <MonthGrid
          monthDate={viewMonth}
          checkIn={checkIn}
          checkOut={checkOut}
          today={today}
          currency={currency}
          onSelect={onSelect}
          compact={compact}
          blockedDates={blockedDates}
          bookedDates={bookedDates}
          closedDates={closedDates}
        />
        {!compact && (
          <MonthGrid
            monthDate={secondMonth}
            checkIn={checkIn}
            checkOut={checkOut}
            today={today}
            currency={currency}
            onSelect={onSelect}
            compact={compact}
            blockedDates={blockedDates}
            bookedDates={bookedDates}
            closedDates={closedDates}
          />
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-4 border-t border-border/60 pt-2.5 text-xs text-slate-500 sm:gap-6">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#bca37f]" />
          <span className="font-medium text-slate-700">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e]" />
          <span className="font-medium text-slate-500">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="font-medium text-slate-500">Closed</span>
        </div>
      </div>
    </div>
  )
}
