/** Per-date starting prices (AED) for a ~2-month window from today. */

function formatKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildCalendarPrices(): Record<
  string,
  { price: number; available: boolean }
> {
  const prices: Record<string, { price: number; available: boolean }> = {}
  // Anchor to July 22, 2026 (project "today") and cover Jul–Sep
  const start = new Date(2026, 6, 1) // Jul 1
  const end = new Date(2026, 8, 30) // Sep 30

  const unavailable = new Set([
    // Aug 3 - Aug 8 (Wei Wei)
    '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
    // Aug 21 - Aug 28 (Gianmarco Bruno)
    '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
    // Aug 28 - Aug 31 (Simeon Monga)
    '2026-08-28', '2026-08-29', '2026-08-30',
    // Sept 3 (tiesting .)
    '2026-09-03',
  ])

  const cursor = new Date(start)
  while (cursor <= end) {
    const key = formatKey(cursor)
    prices[key] = {
      price: 1396, // Consistent base nightly rate ($380 USD)
      available: !unavailable.has(key),
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return prices
}

export const calendarPrices = buildCalendarPrices()

const DEFAULT_NIGHTLY_AED = 1396 // Consistent base nightly rate ($380 USD)

export function getDatePrice(date: Date): number {
  const entry = calendarPrices[formatKey(date)]
  if (entry && entry.price) {
    return entry.price
  }
  return DEFAULT_NIGHTLY_AED
}

export function isDateAvailable(date: Date): boolean {
  const entry = calendarPrices[formatKey(date)]
  if (!entry) return true
  return entry.available
}

export { formatKey as formatDateKey }
