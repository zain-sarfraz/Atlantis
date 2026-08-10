import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { parseDate } from '../../utils/pricing'

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

    const records = await prisma.availability.findMany({
      where: { roomTypeId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    })

    const byDate = new Map(
      records.map((r) => [r.date.toISOString().slice(0, 10), r.available] as const),
    )

    // Dense month: missing rows default to available (1) — matches guest search semantics
    const days: { date: string; available: number }[] = []
    const cur = new Date(start)
    while (cur < end) {
      const date = cur.toISOString().slice(0, 10)
      days.push({ date, available: byDate.get(date) ?? 1 })
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

    const record = await prisma.availability.upsert({
      where: { roomTypeId_date: { roomTypeId, date: d } },
      update: { available },
      create: { roomTypeId, date: d, available },
    })
    res.json({ date: record.date.toISOString().slice(0, 10), available: record.available })
  } catch (err) {
    next(err)
  }
}

/** POST /admin/availability/:roomTypeId/bulk — set availability for a range */
export async function bulkSetAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const roomTypeId = String(req.params.roomTypeId)
    const { from, to, available } = z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        available: z.number().int().min(0).max(1),
      })
      .parse(req.body)

    const dates = eachDayInclusive(from, to)

    await Promise.all(
      dates.map((dateStr) => {
        const d = parseDate(dateStr)
        return prisma.availability.upsert({
          where: { roomTypeId_date: { roomTypeId, date: d } },
          update: { available },
          create: { roomTypeId, date: d, available },
        })
      }),
    )

    res.json({ updated: dates.length, dates })
  } catch (err) {
    next(err)
  }
}
