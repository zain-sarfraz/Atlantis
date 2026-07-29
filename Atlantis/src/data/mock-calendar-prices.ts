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
    '2026-07-25',
    '2026-07-26',
    '2026-08-10',
    '2026-08-11',
    '2026-09-05',
  ])

  const cursor = new Date(start)
  while (cursor <= end) {
    const key = formatKey(cursor)
    const day = cursor.getDay()
    const weekend = day === 5 || day === 6 // Fri/Sat peak
    const base = 980
    const seasonal =
      cursor.getMonth() === 7 ? 180 : cursor.getMonth() === 8 ? 80 : 120
    const wave = Math.round(Math.sin(cursor.getDate() / 3) * 60)
    const price = base + seasonal + (weekend ? 220 : 0) + wave

    prices[key] = {
      price: Math.max(850, price),
      available: !unavailable.has(key),
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return prices
}

export const calendarPrices = buildCalendarPrices()

export function getDatePrice(date: Date): number | null {
  const entry = calendarPrices[formatKey(date)]
  return entry?.available ? entry.price : null
}

export function isDateAvailable(date: Date): boolean {
  const entry = calendarPrices[formatKey(date)]
  if (!entry) return false
  return entry.available
}

export { formatKey as formatDateKey }
