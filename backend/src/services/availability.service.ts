import { prisma } from '../config/database'
import { parseDate } from '../utils/pricing'

/**
 * Check if a room type is available for every date in [checkIn, checkOut).
 * Returns true when no Availability record exists (default = available = 1).
 */
export async function isRoomAvailable(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  const dates = eachDay(checkIn, checkOut)

  const records = await prisma.availability.findMany({
    where: {
      roomTypeId,
      date: { gte: checkIn, lt: checkOut },
    },
  })

  const blocked = new Set(records.filter((r) => r.available <= 0).map((r) => r.date.toISOString().slice(0, 10)))
  return !dates.some((d) => blocked.has(d))
}

/**
 * Return rooms that are available for the full stay.
 * If a roomTypeId has no Availability rows → assumed available.
 */
export async function getAvailableRoomTypes(checkIn: Date, checkOut: Date): Promise<string[]> {
  const allRooms = await prisma.roomType.findMany({ where: { isActive: true }, select: { id: true } })
  const results: string[] = []
  for (const room of allRooms) {
    if (await isRoomAvailable(room.id, checkIn, checkOut)) {
      results.push(room.id)
    }
  }
  return results
}

/**
 * Get the effective nightly rate for a rate plan on a given date.
 * Priority: villa specific date > monthly > yearly > PriceOverride > RatePlan.basePrice.
 */
export async function getEffectiveRate(
  ratePlanId: string,
  date: Date,
): Promise<number | null> {
  const plan = await prisma.ratePlan.findUnique({
    where: { id: ratePlanId },
    select: { basePrice: true, roomTypeId: true },
  })
  if (!plan) return null

  const { resolveNightlyRateAed } = await import('./villaRates.service')
  const resolved = await resolveNightlyRateAed(plan.roomTypeId, ratePlanId, date)
  return resolved.price
}

/**
 * Compute the average nightly rate for a rate plan over a date range.
 * Uses VillaRate priority chain (date > month > year > override > base).
 */
export async function getAverageNightlyRate(
  ratePlanId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<number> {
  const plan = await prisma.ratePlan.findUniqueOrThrow({
    where: { id: ratePlanId },
    select: { roomTypeId: true },
  })
  const { averageNightlyRateAed } = await import('./villaRates.service')
  return averageNightlyRateAed(plan.roomTypeId, ratePlanId, checkIn, checkOut)
}

/**
 * Update availability count for a range of dates.
 * delta = -1 to book, +1 to release.
 */
export async function adjustAvailability(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
  delta: number,
): Promise<void> {
  const dates = eachDay(checkIn, checkOut)

  await Promise.all(
    dates.map((dateStr) => {
      const date = parseDate(dateStr)
      return prisma.availability.upsert({
        where: { roomTypeId_date: { roomTypeId, date } },
        update: { available: { increment: delta } },
        create: { roomTypeId, date, available: Math.max(0, 1 + delta) },
      })
    }),
  )
}

/** Returns YYYY-MM-DD strings for each day in [start, end). */
function eachDay(start: Date, end: Date): string[] {
  const days: string[] = []
  const cur = new Date(start)
  while (cur < end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}
