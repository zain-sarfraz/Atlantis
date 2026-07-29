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
        include: { _count: { select: { bookings: true } } },
      }),
      prisma.guest.count({ where }),
    ])

    res.json({ guests, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) { next(err) }
}

export async function getGuest(req: Request, res: Response, next: NextFunction) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: String(req.params.id) },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: { include: { roomType: { select: { name: true } }, ratePlan: { select: { name: true } } } },
          },
        },
      },
    })
    if (!guest) throw createError('Guest not found', 404)
    res.json(guest)
  } catch (err) { next(err) }
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

    const guest = await prisma.guest.update({ where: { id: String(req.params.id) }, data })
    res.json(guest)
  } catch (err) { next(err) }
}

export async function deleteGuest(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.guest.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  } catch (err) { next(err) }
}
