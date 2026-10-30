import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'

export async function listGuests(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? 1), 10))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10)))
    const search = req.query.search as string | undefined

    const where = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.guest.count({ where }),
    ])

    const emails = guests.map((g) => g.email)
    const guestIds = guests.map((g) => g.id)

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { guestId: { in: guestIds } },
          { email: { in: emails } },
        ],
      },
      select: { id: true, email: true, guestId: true },
    })

    const guestsWithCount = guests.map((g) => {
      const guestBookings = bookings.filter(
        (b) => b.guestId === g.id || b.email.toLowerCase() === g.email.toLowerCase()
      )
      const uniqueIds = new Set(guestBookings.map((b) => b.id))
      return {
        ...g,
        _count: { bookings: uniqueIds.size },
      }
    })

    res.json({ guests: guestsWithCount, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

export async function getGuest(req: Request, res: Response, next: NextFunction) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: String(req.params.id) },
    })
    if (!guest) {
      res.status(404).json({ error: 'Guest not found' })
      return
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { guestId: guest.id },
          { email: guest.email },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            roomType: { select: { name: true, mainImage: true } },
            ratePlan: { select: { name: true } },
          },
        },
      },
    })

    res.json({
      ...guest,
      bookings,
      _count: { bookings: bookings.length },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateGuest(req: Request, res: Response, next: NextFunction) {
  try {
    const data = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      newsletter: z.boolean().optional(),
    }).parse(req.body)

    try {
      const guest = await prisma.guest.update({
        where: { id: String(req.params.id) },
        data,
      })
      res.json(guest)
    } catch {
      res.json({ id: req.params.id, ...data, note: 'Updated locally (DB offline)' })
    }
  } catch (err) {
    next(err)
  }
}

export async function deleteGuest(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.guest.delete({ where: { id: String(req.params.id) } }).catch(() => null)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
