import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  isBeforeDay,
  isSameDay,
  startOfDay,
} from '../utils/pricing'
import type { Currency } from '../types'

interface CalendarProps {
  checkIn: Date | null
  checkOut: Date | null
  today: Date
  currency: Currency
  onSelect: (date: Date) => void
  compact?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function MonthGrid({
  monthDate,
  checkIn,
  checkOut,
  today,
  onSelect,
  compact,
}: {
  monthDate: Date
  checkIn: Date | null
  checkOut: Date | null
  today: Date
  currency: Currency
  onSelect: (date: Date) => void
  compact?: boolean
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStart = startOfDay(today)

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
      <h3
        className={`mb-2 text-center font-semibold leading-snug tracking-tight text-navy ${
          compact ? 'text-xl' : 'mb-3 text-2xl'
        }`}
      >
        {monthDate.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        })}
      </h3>
      <div className="type-label mb-1 grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />

          const past = isBeforeDay(date, todayStart)
          const selectedStart = checkIn && isSameDay(date, checkIn)
          const selectedEnd = checkOut && isSameDay(date, checkOut)
          const inRange = isInRange(date)
          const disabled = past
          const key = `${year}-${month}-${date.getDate()}`

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={`flex flex-col items-center justify-center rounded-md px-0.5 py-1 text-sm transition focus:ring-2 focus:ring-sand ${
                compact ? 'min-h-[42px]' : 'min-h-[52px]'
              } ${
                disabled
                  ? 'cursor-not-allowed text-gray-300'
                  : selectedStart || selectedEnd
                    ? 'bg-sand font-semibold text-navy'
                    : inRange
                      ? 'bg-sand-light text-navy'
                      : 'text-ink hover:bg-cream-dark'
              }`}
            >
              <span>{date.getDate()}</span>
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
}: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const secondMonth = useMemo(() => addMonths(viewMonth, 1), [viewMonth])

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="rounded-lg p-2 text-navy transition hover:bg-cream-dark"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="rounded-lg p-2 text-navy transition hover:bg-cream-dark"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
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
          />
        )}
      </div>
    </div>
  )
}
