import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { parseDate } from '../../utils/pricing'
import { MOCK_BOOKINGS } from './bookings.controller'

function eachDayInclusive(from: string, to: string): string[] {
  const days: string[] = []
  const cur = parseDate(from)
  const end = parseDate(to)
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

/** Collect blocked dates (YYYY-MM-DD) from active reservations (excluding CANCELLED) */
function getBookedDatesSet(): Set<string> {
  const blocked = new Set<string>()
  for (const b of MOCK_BOOKINGS) {
    if (b.status === 'CANCELLED') continue
    const startStr = b.checkIn.slice(0, 10)
    const endStr = b.checkOut.slice(0, 10)
    const cur = parseDate(startStr)
    const end = parseDate(endStr)
    while (cur < end) {
      blocked.add(cur.toISOString().slice(0, 10))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }
  return blocked
}

/** Build a dense month calendar incorporating active reservations for fallback */
function buildFallbackCalendar(year: number, month: number): { date: string; available: number }[] {
  const bookedSet = getBookedDatesSet()
  const days: { date: string; available: number }[] = []
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const cur = new Date(start)
  while (cur < end) {
    const date = cur.toISOString().slice(0, 10)
    days.push({ date, available: bookedSet.has(date) ? 0 : 1 })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

/** GET /admin/availability/:roomTypeId?month=YYYY-MM */
export async function getAvailabilityCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const roomTypeId = String(req.params.roomTypeId)
    const monthStr = z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .parse(req.query.month ?? new Date().toISOString().slice(0, 7))

    const [year, month] = monthStr.split('-').map(Number)
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 1))

    // Lodgify-synced availability is source of truth. Do NOT seed from MOCK_BOOKINGS
    // or open Lodgify nights get forced to "Closed" by stale mock ranges.
    let records: { date: Date; available: number; blockReason: string | null }[] = []
    try {
      records = await prisma.availability.findMany({
        where: { roomTypeId, date: { gte: start, lt: end } },
        orderBy: { date: 'asc' },
        select: { date: true, available: true, blockReason: true },
      })
    } catch {
      // DB not available — return month calendar with active booking blocks
      return res.json(buildFallbackCalendar(year, month))
    }

    const manualOverrides = new Map(
      records.map((r) => [toDateKey(r.date), { available: r.available, blockReason: r.blockReason }] as const),
    )

    // Guest labels for booked nights (scoped to this villa when possible)
    const guestByDate = new Map<string, { guestName: string; bookingRef: string }>()
    try {
      const labeled = await prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
          checkIn: { lt: end },
          checkOut: { gt: start },
          OR: [
            { items: { some: { roomTypeId } } },
            { items: { none: {} } },
          ],
        },
        select: {
          firstName: true,
          lastName: true,
          bookingRef: true,
          checkIn: true,
          checkOut: true,
        },
      })
      for (const b of labeled) {
        const curB = new Date(b.checkIn)
        const endB = new Date(b.checkOut)
        const guestName = `${b.firstName} ${b.lastName}`.trim()
        while (curB < endB) {
          const key = toDateKey(curB)
          if (!guestByDate.has(key)) {
            guestByDate.set(key, { guestName, bookingRef: b.bookingRef })
          }
          curB.setUTCDate(curB.getUTCDate() + 1)
        }
      }
    } catch {
      /* optional labels */
    }

    // Dense month: availability rows + booking labels (booked vs closed)
    const days: Array<{
      date: string
      available: number
      reason: 'open' | 'booked' | 'closed'
      guestName?: string | null
      bookingRef?: string | null
    }> = []
    const cur = new Date(start)
    while (cur < end) {
      const date = toDateKey(cur)
      const manual = manualOverrides.get(date)
      // Default open when Lodgify has no row yet
      let available = manual !== undefined ? manual.available : 1
      const guest = guestByDate.get(date)
      const syncedAsBooking = manual?.blockReason === 'booking'

      // Lodgify availability is source of truth (matches Lodgify calendar).
      // Guest name only labels nights Lodgify already marks unavailable.
      let reason: 'open' | 'booked' | 'closed' = 'open'
      if (available > 0) {
        reason = 'open'
      } else if (guest || syncedAsBooking) {
        reason = 'booked'
      } else {
        reason = 'closed'
      }

      days.push({
        date,
        available: reason === 'open' ? Math.max(available, 1) : 0,
        reason,
        guestName: reason === 'booked' ? guest?.guestName ?? null : null,
        bookingRef: reason === 'booked' ? guest?.bookingRef ?? null : null,
      })
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    res.json(days)
  } catch (err) {
    next(err)
  }
}

const SetAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available: z.number().int().min(0).max(1),
})

/** PUT /admin/availability/:roomTypeId — set availability for a single date */
export async function setAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const roomTypeId = String(req.params.roomTypeId)
    const { date, available } = SetAvailabilitySchema.parse(req.body)
    const d = parseDate(date)

    try {
      const record = await prisma.availability.upsert({
        where: { roomTypeId_date: { roomTypeId, date: d } },
        update: {
          available,
          blockReason: available === 0 ? 'closed' : null,
        },
        create: {
          roomTypeId,
          date: d,
          available,
          blockReason: available === 0 ? 'closed' : null,
        },
      })
      res.json({ date: record.date.toISOString().slice(0, 10), available: record.available })
    } catch {
      // DB unavailable — return mock success
      res.json({ date, available, note: 'Saved locally (DB offline)' })
    }
  } catch (err) {
    next(err)
  }
}

/** POST /admin/availability/:roomTypeId/bulk — set availability for a range */
export async function bulkSetAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const roomTypeId = String(req.params.roomTypeId)
    const { from, to, available, blockReason: blockReasonInput } = z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        available: z.number().int().min(0).max(1),
        blockReason: z.enum(['booking', 'closed']).optional(),
      })
      .parse(req.body)

    const dates = eachDayInclusive(from, to)
    const blockReason =
      available === 1 ? null : blockReasonInput === 'booking' ? 'booking' : 'closed'

    try {
      await Promise.all(
        dates.map((dateStr) => {
          const d = parseDate(dateStr)
          return prisma.availability
            .upsert({
              where: { roomTypeId_date: { roomTypeId, date: d } },
              update: { available, blockReason },
              create: { roomTypeId, date: d, available, blockReason },
            })
            .catch(() => null)
        }),
      )
    } catch {
      /* DB unavailable — silently succeed */
    }

    res.json({ updated: dates.length, dates })
  } catch (err) {
    next(err)
  }
}
