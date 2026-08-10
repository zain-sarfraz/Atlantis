import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'
import { adjustAvailability } from '../../services/availability.service'
import { BookingStatus } from '@prisma/client'
import { scopedBookingWhere } from '../../utils/lodgifyScope'
import {
  lodgifySourceWhereForChannels,
  normalizeLodgifyChannel,
  parseChannelsQuery,
} from '../../utils/lodgifyChannels'

const ListBookingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(BookingStatus).optional(),
  search: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  channels: z.string().optional(),
})

export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, status, search, from, to, channels: channelsRaw } =
      ListBookingsSchema.parse(req.query)
    const skip = (page - 1) * limit
    const channels = parseChannelsQuery(channelsRaw)

    const filters: Prisma.BookingWhereInput = {}
    if (status) filters.status = status
    if (from) filters.checkIn = { gte: new Date(from) }
    if (to) filters.checkOut = { ...(filters.checkOut as object ?? {}), lte: new Date(to) }

    const andParts: Prisma.BookingWhereInput[] = []

    const q = search?.trim()
    if (q) {
      // Support full-name search ("Jane Doe") by requiring each word to match a field
      const words = q.split(/\s+/).filter(Boolean)
      for (const word of words) {
        andParts.push({
          OR: [
            { bookingRef: { contains: word } },
            { firstName: { contains: word } },
            { lastName: { contains: word } },
            { email: { contains: word } },
            { phone: { contains: word } },
            { lodgifySource: { contains: word } },
          ],
        })
      }
    }

    const sourceClauses = channels ? lodgifySourceWhereForChannels(channels) : undefined
    if (sourceClauses?.length) {
      andParts.push({ OR: sourceClauses })
    }

    if (andParts.length) {
      filters.AND = andParts
    }

    const where = scopedBookingWhere(filters)

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              roomType: { select: { name: true, category: { select: { name: true } } } },
              ratePlan: { select: { name: true } },
            },
          },
          promoCode: { select: { code: true } },
        },
      }),
      prisma.booking.count({ where }),
    ])

    res.json({
      bookings: bookings.map((b) => ({
        ...b,
        channel: normalizeLodgifyChannel(b.lodgifySource),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

export async function getBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            roomType: { include: { category: true, images: { take: 1 } } },
            ratePlan: true,
          },
        },
        guest: true,
        promoCode: true,
      },
    })
    if (!booking) throw createError('Booking not found', 404)
    res.json(booking)
  } catch (err) { next(err) }
}

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
})

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const { status } = UpdateStatusSchema.parse(req.body)
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id } })

    const updates: Record<string, unknown> = { status }

    if (status === 'CONFIRMED') updates.confirmedAt = new Date()
    if (status === 'CANCELLED') {
      updates.cancelledAt = new Date()
      // Release inventory
      const items = await prisma.bookingItem.findMany({ where: { bookingId: booking.id } })
      await Promise.all(
        items.map((item) => adjustAvailability(item.roomTypeId, booking.checkIn, booking.checkOut, 1)),
      )
    }

    const updated = await prisma.booking.update({ where: { id }, data: updates })
    res.json(updated)
  } catch (err) { next(err) }
}

export async function deleteBooking(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.booking.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  } catch (err) { next(err) }
}
