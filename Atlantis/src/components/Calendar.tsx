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
  const cellH = compact ? 'h-8' : 'h-10'
  const textSize = compact ? 'text-xs' : 'text-sm'

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
        <h3 className="mb-3 text-center text-2xl font-semibold leading-snug tracking-tight text-navy">
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
            className={`py-0.5 font-medium tracking-wide text-taupe uppercase ${
              compact ? 'text-[10px]' : 'type-label py-1'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${compact ? 'gap-0' : 'gap-0.5'}`}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className={cellH} />

          const past = isBeforeDay(date, todayStart)
          const selectedStart = checkIn && isSameDay(date, checkIn)
          const selectedEnd = checkOut && isSameDay(date, checkOut)
          const inRange = isInRange(date)
          const disabled = past
          const key = `${year}-${month}-${date.getDate()}`

          let cellClass = `flex w-full items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sand ${cellH} ${textSize} `

          if (disabled) {
            cellClass += 'cursor-not-allowed text-gray-300'
          } else if (selectedStart && selectedEnd) {
            cellClass += 'rounded-md bg-sand font-semibold text-white'
          } else if (selectedStart) {
            cellClass += 'rounded-l-md bg-sand font-semibold text-white'
          } else if (selectedEnd) {
            cellClass += 'rounded-r-md bg-sand font-semibold text-white'
          } else if (inRange) {
            cellClass += 'bg-sand-light/80 font-medium text-navy'
          } else {
            cellClass += 'rounded-md text-ink hover:bg-cream-dark'
          }

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={cellClass}
            >
              {date.getDate()}
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
          <h3 className="text-base font-semibold text-navy">{monthLabel}</h3>
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
