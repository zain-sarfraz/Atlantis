import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'

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
export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await prisma.hotelAlert.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(alerts)
  } catch (err) {
    next(err)
  }
}
