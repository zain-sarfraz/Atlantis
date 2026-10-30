import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'
import { env } from '../../config/env'

/** GET /api/rooms — list all active room categories with their rooms */
export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.roomCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            amenities: { orderBy: { sortOrder: 'asc' } },
            ratePlans: { where: { isActive: true }, orderBy: { basePrice: 'asc' } },
          },
        },
      },
    })
    res.json(categories)
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms/:slug — single room type detail */
export async function getRoomBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await prisma.roomType.findUnique({
      where: { slug: String(req.params.slug) },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
        ratePlans: { where: { isActive: true }, orderBy: { basePrice: 'asc' } },
      },
    })

    if (!room || !room.isActive) throw createError('Room not found', 404)
    res.json(room)
  } catch (err) {
    next(err)
  }
}

/** GET /api/alerts — hotel announcements */
export async function getAlerts(req: Request, res: Response) {
  try {
    const alerts = await prisma.hotelAlert.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(alerts)
  } catch {
    res.json([
      { id: '1', title: 'Pool Notice', message: 'Lagoon pool open daily 8 AM - 8 PM.' },
    ])
  }
}

import { MOCK_BOOKINGS } from '../admin/bookings.controller'

function toDateKey(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** GET /api/availability/blocked-dates — unavailable nights for the public booking calendar */
export async function getBlockedDates(req: Request, res: Response) {
  const bookedSet = new Set<string>()
  const closedSet = new Set<string>()

  try {
    const villaFilter =
      env.lodgifyPropertyId != null
        ? { lodgifyPropertyId: env.lodgifyPropertyId, isActive: true }
        : { isActive: true, lodgifyPropertyId: { not: null } }

    const villas = await prisma.roomType.findMany({
      where: villaFilter,
      select: { id: true },
    })
    const villaIds = villas.map((v) => v.id)

    const dbBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        ...(villaIds.length
          ? {
              OR: [
                { items: { some: { roomTypeId: { in: villaIds } } } },
                { items: { none: {} } },
              ],
            }
          : {}),
      },
      select: { checkIn: true, checkOut: true },
    })

    for (const b of dbBookings) {
      const cur = new Date(b.checkIn)
      const end = new Date(b.checkOut)
      while (cur < end) {
        bookedSet.add(toDateKey(cur))
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
    }

    const availabilityRecords = await prisma.availability.findMany({
      where: {
        available: { lte: 0 },
        ...(villaIds.length ? { roomTypeId: { in: villaIds } } : {}),
      },
      select: { date: true, blockReason: true },
    })

    for (const r of availabilityRecords) {
      const key = toDateKey(new Date(r.date))
      if (r.blockReason === 'booking' || bookedSet.has(key)) {
        bookedSet.add(key)
      } else {
        // Manual / Lodgify closed periods — must block public booking calendar too
        closedSet.add(key)
      }
    }
  } catch {
    // DB offline fallback
    for (const mb of MOCK_BOOKINGS) {
      if (mb.status === 'CONFIRMED' || mb.status === 'PENDING' || mb.status === 'CHECKED_IN') {
        const cur = new Date(mb.checkIn)
        const end = new Date(mb.checkOut)
        while (cur < end) {
          bookedSet.add(toDateKey(cur))
          cur.setUTCDate(cur.getUTCDate() + 1)
        }
      }
    }
  }

  // Booked wins if a date appears in both
  for (const key of bookedSet) closedSet.delete(key)

  const blockedDates = Array.from(new Set([...bookedSet, ...closedSet])).sort()

  res.json({
    blockedDates,
    bookedDates: Array.from(bookedSet).sort(),
    closedDates: Array.from(closedSet).sort(),
  })
}

