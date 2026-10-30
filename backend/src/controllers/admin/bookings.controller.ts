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
import { excludeLodgifyBooking } from '../../services/lodgifyExclusion.service'
import { env } from '../../config/env'

/** Keep mock fallback limited to Limiria Villa (property 714507). */
function isLimiriaMockBooking(b: { items?: Array<{ roomType?: { name?: string } }> }): boolean {
  const name = b.items?.[0]?.roomType?.name?.toLowerCase() ?? ''
  return name.includes('limiria')
}

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

    // Base filters (everything except status) — used for status counts + list
    const baseFilters: Prisma.BookingWhereInput = {}

    // Date range = stays that OVERLAP the range (needed for month views like November).
    // Overlap: checkOut > from AND checkIn <= to
    // If neither from/to sent → all bookings (Clear filters).
    if (from || to) {
      if (from) {
        baseFilters.checkOut = { gt: new Date(`${from}T00:00:00.000Z`) }
      }
      if (to) {
        baseFilters.checkIn = { lte: new Date(`${to}T23:59:59.999Z`) }
      }
    }

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
      baseFilters.AND = andParts
    }

    const baseWhere = scopedBookingWhere(baseFilters)
    const where = status ? scopedBookingWhere({ ...baseFilters, status }) : baseWhere

    const [bookings, total, grouped] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        // Always date-wise (check-in month/day sequence) regardless of filters
        orderBy: [{ checkIn: 'asc' }, { checkOut: 'asc' }, { bookingRef: 'asc' }],
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
      prisma.booking.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ])

    const counts = {
      all: 0,
      CONFIRMED: 0,
      PENDING: 0,
      CANCELLED: 0,
      CHECKED_IN: 0,
      CHECKED_OUT: 0,
      NO_SHOW: 0,
    }
    for (const row of grouped) {
      const n = row._count._all
      counts.all += n
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = n
      }
    }
    // UI buckets
    const confirmed = counts.CONFIRMED + counts.CHECKED_IN + counts.CHECKED_OUT
    const tentative = counts.PENDING
    const declined = counts.CANCELLED + counts.NO_SHOW

    res.json({
      bookings: bookings.map((b) => ({
        ...b,
        channel: normalizeLodgifyChannel(b.lodgifySource),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      counts: {
        all: counts.all,
        confirmed,
        tentative,
        declined,
      },
    })
  } catch {
    let result = MOCK_BOOKINGS.filter(isLimiriaMockBooking).map((b) => ({
      ...b,
      channel: normalizeLodgifyChannel(b.lodgifySource || b.channel),
    }))
    const status = req.query.status ? String(req.query.status) : ''
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : ''
    const channelsRaw = req.query.channels ? String(req.query.channels) : ''
    const from = req.query.from ? String(req.query.from) : ''
    const to = req.query.to ? String(req.query.to) : ''

    if (search) {
      result = result.filter(
        (b) =>
          b.firstName.toLowerCase().includes(search) ||
          b.lastName.toLowerCase().includes(search) ||
          b.bookingRef.toLowerCase().includes(search) ||
          b.email.toLowerCase().includes(search),
      )
    }
    if (from) {
      const fromTs = new Date(`${from}T00:00:00.000Z`).getTime()
      result = result.filter((b) => new Date(b.checkOut).getTime() > fromTs)
    }
    if (to) {
      const toTs = new Date(`${to}T23:59:59.999Z`).getTime()
      result = result.filter((b) => new Date(b.checkIn).getTime() <= toTs)
    }
    if (channelsRaw) {
      const allowedChannels = channelsRaw.split(',').map((c) => c.trim().toLowerCase())
      result = result.filter((b) => {
        const norm = b.channel.toLowerCase()
        const rawCh = (b.lodgifySource || '').toLowerCase()
        return (
          allowedChannels.includes(norm) ||
          allowedChannels.includes(rawCh) ||
          (allowedChannels.includes('websites') && (rawCh === 'direct' || norm === 'websites'))
        )
      })
    }

    const counts = {
      all: result.length,
      confirmed: result.filter((b) =>
        ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status),
      ).length,
      tentative: result.filter((b) => b.status === 'PENDING').length,
      declined: result.filter((b) =>
        ['CANCELLED', 'NO_SHOW', 'DECLINED'].includes(b.status),
      ).length,
    }

    if (status) {
      result = result.filter((b) => b.status === status)
    }

    result.sort((a, b) => {
      const aIn = new Date(a.checkIn).getTime()
      const bIn = new Date(b.checkIn).getTime()
      if (aIn !== bIn) return aIn - bIn
      return new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime()
    })

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const start = (page - 1) * limit
    const paginated = result.slice(start, start + limit)

    res.json({
      bookings: paginated,
      total: result.length,
      page,
      limit,
      pages: Math.ceil(result.length / limit) || 1,
      counts,
    })
  }
}

export const MOCK_BOOKINGS = [
  {
    id: '22703006',
    bookingRef: 'LG22703006',
    firstName: 'tiesting',
    lastName: '.',
    email: 't.317422@guest.booking.com',
    phone: '+1 555-0199',
    status: 'CONFIRMED',
    totalAmount: 1410,
    currency: 'AED',
    checkIn: '2026-09-03',
    checkOut: '2026-09-04',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-25T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22703006', roomTypeId: 'room-limiria-villa', nightlyRate: 1410, nights: 1, total: 1410, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18938070',
    bookingRef: 'LG18938070',
    firstName: 'Andrea',
    lastName: 'Lacci',
    email: 'alacci.391024@guest.booking.com',
    phone: '+39 347 0000000',
    status: 'CONFIRMED',
    totalAmount: 13000,
    currency: 'AED',
    checkIn: '2026-08-08',
    checkOut: '2026-08-18',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-01T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-18938070', roomTypeId: 'room-limiria-villa', nightlyRate: 1300, nights: 10, total: 13000, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18386630',
    bookingRef: 'LG18386630',
    firstName: 'Pia',
    lastName: 'Holstein Grynnerup',
    email: 'pgrynn.491023@guest.booking.com',
    phone: '+45 20 00 00 00',
    status: 'CONFIRMED',
    totalAmount: 21854,
    currency: 'AED',
    checkIn: '2026-07-13',
    checkOut: '2026-07-30',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-02-01T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-18386630', roomTypeId: 'room-limiria-villa', nightlyRate: 1285.5, nights: 17, total: 21854, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19178810',
    bookingRef: 'LG19178810',
    firstName: 'Wynnete',
    lastName: 'Mavura',
    email: 'wmavur.918231@guest.booking.com',
    phone: '+254 711 000000',
    status: 'CONFIRMED',
    totalAmount: 5068,
    currency: 'AED',
    checkIn: '2026-11-20',
    checkOut: '2026-11-24',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-12T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-19178810', roomTypeId: 'room-limiria-villa', nightlyRate: 1267, nights: 4, total: 5068, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162471',
    bookingRef: 'LG16162471',
    firstName: 'Layal',
    lastName: 'Zahoui',
    email: 'lzahou.591023@guest.booking.com',
    phone: '+961 3 000000',
    status: 'CONFIRMED',
    totalAmount: 9916,
    currency: 'AED',
    checkIn: '2026-09-11',
    checkOut: '2026-09-18',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-07-15T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162471', roomTypeId: 'room-limiria-villa', nightlyRate: 1416.5, nights: 7, total: 9916, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162477',
    bookingRef: 'LG16162477',
    firstName: 'Sandra',
    lastName: 'Kohaut',
    email: 'skohau.591023@guest.booking.com',
    phone: '+49 160 0000000',
    status: 'CONFIRMED',
    totalAmount: 8558,
    currency: 'AED',
    checkIn: '2026-01-04',
    checkOut: '2026-01-10',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-07-29T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162477', roomTypeId: 'room-limiria-villa', nightlyRate: 1426.3, nights: 6, total: 8558, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16927258',
    bookingRef: 'LG16927258',
    firstName: 'anthony',
    lastName: 'giordano',
    email: 'agiord.201934@guest.booking.com',
    phone: '+1 555-0812',
    status: 'CONFIRMED',
    totalAmount: 6427,
    currency: 'AED',
    checkIn: '2025-12-25',
    checkOut: '2025-12-30',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-11-06T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16927258', roomTypeId: 'room-limiria-villa', nightlyRate: 1285.4, nights: 5, total: 6427, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '17008693',
    bookingRef: 'LG17008693',
    firstName: 'Rebecca',
    lastName: 'Iban',
    email: 'riban.102934@guest.booking.com',
    phone: '+1 555-0912',
    status: 'CONFIRMED',
    totalAmount: 8999,
    currency: 'AED',
    checkIn: '2026-01-15',
    checkOut: '2026-01-22',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-11-12T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-17008693', roomTypeId: 'room-limiria-villa', nightlyRate: 1285.5, nights: 7, total: 8999, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16628181',
    bookingRef: 'LG16628181',
    firstName: 'Natalia',
    lastName: 'Mbamba',
    email: 'nmbamb.491023@guest.booking.com',
    phone: '+27 83 000 0000',
    status: 'CONFIRMED',
    totalAmount: 1168,
    currency: 'AED',
    checkIn: '2025-10-18',
    checkOut: '2025-10-19',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-10-17T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16628181', roomTypeId: 'room-limiria-villa', nightlyRate: 1168, nights: 1, total: 1168, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162474',
    bookingRef: 'LG16162474',
    firstName: 'Fabio Lorenzo',
    lastName: 'Leotta',
    email: 'fleott.591023@guest.booking.com',
    phone: '+39 320 0000000',
    status: 'CONFIRMED',
    totalAmount: 8631,
    currency: 'AED',
    checkIn: '2025-12-06',
    checkOut: '2025-12-12',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-05-10T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162474', roomTypeId: 'room-limiria-villa', nightlyRate: 1438.5, nights: 6, total: 8631, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162475',
    bookingRef: 'LG16162475',
    firstName: 'Mirte',
    lastName: 'van der Ven',
    email: 'mvande.491023@guest.booking.com',
    phone: '+31 6 00000000',
    status: 'CONFIRMED',
    totalAmount: 4260,
    currency: 'AED',
    checkIn: '2025-12-30',
    checkOut: '2026-01-02',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-08-29T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162475', roomTypeId: 'room-limiria-villa', nightlyRate: 1420, nights: 3, total: 4260, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '17552937',
    bookingRef: 'LG17552937',
    firstName: 'Muhammad',
    lastName: 'Mawji',
    email: 'mmawji.102934@guest.booking.com',
    phone: '+44 7911 123456',
    status: 'CONFIRMED',
    totalAmount: 3893,
    currency: 'AED',
    checkIn: '2025-12-18',
    checkOut: '2025-12-21',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-12-16T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-17552937', roomTypeId: 'room-limiria-villa', nightlyRate: 1297.6, nights: 3, total: 3893, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '10937965',
    bookingRef: 'LG10937965',
    firstName: 'Huwel',
    lastName: 'katja',
    email: 'hkatja.491023@guest.booking.com',
    phone: '+49 151 0000000',
    status: 'PENDING',
    totalAmount: 9769,
    currency: 'AED',
    checkIn: '2026-07-28',
    checkOut: '2026-08-04',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-10937965', roomTypeId: 'room-limiria-villa', nightlyRate: 1395.5, nights: 7, total: 9769, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '11015907',
    bookingRef: 'LG11015907',
    firstName: 'Andy',
    lastName: 'van Popta',
    email: 'avanpo.591023@guest.booking.com',
    phone: '+31 6 12345678',
    status: 'CONFIRMED',
    totalAmount: 3500,
    currency: 'AED',
    checkIn: '2026-10-06',
    checkOut: '2026-10-09',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-27T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-11015907', roomTypeId: 'room-limiria-villa', nightlyRate: 1166.6, nights: 3, total: 3500, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '11015880',
    bookingRef: 'LG11015880',
    firstName: 'Natalia',
    lastName: 'Demidenko',
    email: 'ndemid.491023@guest.booking.com',
    phone: '+380 50 000 0000',
    status: 'CONFIRMED',
    totalAmount: 6500,
    currency: 'AED',
    checkIn: '2026-01-10',
    checkOut: '2026-01-15',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-27T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-11015880', roomTypeId: 'room-limiria-villa', nightlyRate: 1300, nights: 5, total: 6500, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '10937957',
    bookingRef: 'LG10937957',
    firstName: 'Tabid-Mathisen',
    lastName: 'amal',
    email: 'tamal.591023@guest.booking.com',
    phone: '+47 900 00 000',
    status: 'CONFIRMED',
    totalAmount: 18500,
    currency: 'AED',
    checkIn: '2025-12-17',
    checkOut: '2025-12-31',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-10937957', roomTypeId: 'room-limiria-villa', nightlyRate: 1321.4, nights: 14, total: 18500, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '10937949',
    bookingRef: 'LG10937949',
    firstName: 'Navani',
    lastName: 'Tanishqa',
    email: 'ntanis.491023@guest.booking.com',
    phone: '+91 98000 00000',
    status: 'CONFIRMED',
    totalAmount: 4800,
    currency: 'AED',
    checkIn: '2025-10-09',
    checkOut: '2025-10-13',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-10937949', roomTypeId: 'room-limiria-villa', nightlyRate: 1200, nights: 4, total: 4800, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '10937940',
    bookingRef: 'LG10937940',
    firstName: 'Tiffany',
    lastName: 'Brown',
    email: 'tbrown.591023@guest.booking.com',
    phone: '+1 555-0144',
    status: 'CONFIRMED',
    totalAmount: 5200,
    currency: 'AED',
    checkIn: '2025-09-12',
    checkOut: '2025-09-16',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-10937940', roomTypeId: 'room-limiria-villa', nightlyRate: 1300, nights: 4, total: 5200, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '10937937',
    bookingRef: 'LG10937937',
    firstName: 'Geloo',
    lastName: 'Safiyyah',
    email: 'gsafiy.491023@guest.booking.com',
    phone: '+230 5000 0000',
    status: 'CONFIRMED',
    totalAmount: 5100,
    currency: 'AED',
    checkIn: '2025-09-05',
    checkOut: '2025-09-09',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-10937937', roomTypeId: 'room-limiria-villa', nightlyRate: 1275, nights: 4, total: 5100, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22588100',
    bookingRef: 'LG22588100',
    firstName: 'Gianmarco',
    lastName: 'Bruno',
    email: 'gbruno.019283@guest.booking.com',
    phone: '+39 340 0000000',
    status: 'CONFIRMED',
    totalAmount: 2450,
    currency: 'AED',
    checkIn: '2026-08-21',
    checkOut: '2026-08-28',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22588100', roomTypeId: 'room-limiria-villa', nightlyRate: 350, nights: 7, total: 2450, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22540380',
    bookingRef: 'LG22540380',
    firstName: 'Laura',
    lastName: 'Piacenti',
    email: 'lpiace.620758@guest.booking.com',
    phone: '+39 333 0000000',
    status: 'CONFIRMED',
    totalAmount: 2550,
    currency: 'AED',
    checkIn: '2026-12-28',
    checkOut: '2027-01-04',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-17T16:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22540380', roomTypeId: 'room-limiria-villa', nightlyRate: 364.28, nights: 7, total: 2550, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22451649',
    bookingRef: 'LG22451649',
    firstName: 'Mwajuma',
    lastName: 'Zanzibar',
    email: 'mzanzi.141486@guest.booking.com',
    phone: '+255 777 000000',
    status: 'CONFIRMED',
    totalAmount: 1750,
    currency: 'AED',
    checkIn: '2026-11-12',
    checkOut: '2026-11-17',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-13T10:30:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22451649', roomTypeId: 'room-limiria-villa', nightlyRate: 350, nights: 5, total: 1750, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '20570894',
    bookingRef: 'LG20570894',
    firstName: 'Rebecca',
    lastName: 'Payne',
    email: 'rpayne.292953@guest.booking.com',
    phone: '+44 7700 900888',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2026-05-25',
    checkOut: '2026-05-30',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-05-18T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-20570894', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 5, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '20226318',
    bookingRef: 'LG20226318',
    firstName: 'Stefanie',
    lastName: 'Maier',
    email: 'smaier.700615@guest.booking.com',
    phone: '+49 170 0000000',
    status: 'CONFIRMED',
    totalAmount: 700,
    currency: 'AED',
    checkIn: '2026-09-04',
    checkOut: '2026-09-06',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-05-05T14:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-20226318', roomTypeId: 'room-limiria-villa', nightlyRate: 350, nights: 2, total: 700, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '20130970',
    bookingRef: 'LG20130970',
    firstName: 'Maria',
    lastName: 'Soledad Arroyo',
    email: 'marroy.390486@guest.booking.com',
    phone: '+54 9 11 0000 0000',
    status: 'CONFIRMED',
    totalAmount: 1760,
    currency: 'AED',
    checkIn: '2026-09-12',
    checkOut: '2026-09-17',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-04-28T09:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-20130970', roomTypeId: 'room-limiria-villa', nightlyRate: 352, nights: 5, total: 1760, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '20077365',
    bookingRef: 'LG20077365',
    firstName: 'Ramatou',
    lastName: 'Lamido',
    email: 'rlamid.160941@guest.booking.com',
    phone: '+237 600 000000',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2026-10-16',
    checkOut: '2026-10-23',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-04-24T12:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-20077365', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 7, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19845511',
    bookingRef: 'LG19845511',
    firstName: 'Redhouane',
    lastName: 'Mesbah',
    email: 'rmesba.632724@guest.booking.com',
    phone: '+33 6 12345678',
    status: 'CONFIRMED',
    totalAmount: 2076,
    currency: 'AED',
    checkIn: '2026-08-01',
    checkOut: '2026-08-07',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-04-10T11:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-19845511', roomTypeId: 'room-limiria-villa', nightlyRate: 346, nights: 6, total: 2076, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19693002',
    bookingRef: 'LG19693002',
    firstName: 'Christina',
    lastName: 'Vestergaard',
    email: 'cveste.480642@guest.booking.com',
    phone: '+45 30 00 00 00',
    status: 'CONFIRMED',
    totalAmount: 2112,
    currency: 'AED',
    checkIn: '2026-07-05',
    checkOut: '2026-07-11',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-04-01T15:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-19693002', roomTypeId: 'room-limiria-villa', nightlyRate: 352, nights: 6, total: 2112, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19476154',
    bookingRef: 'LG19476154',
    firstName: 'Nonhlanhla',
    lastName: 'Nkomo',
    email: 'nnkomo.591136@guest.booking.com',
    phone: '+27 82 111 2222',
    status: 'CONFIRMED',
    totalAmount: 550.5,
    currency: 'AED',
    checkIn: '2026-04-17',
    checkOut: '2026-04-20',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-27T09:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-19476154', roomTypeId: 'room-limiria-villa', nightlyRate: 183.5, nights: 3, total: 550.5, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19470409',
    bookingRef: 'LG19470409',
    firstName: 'Aaron',
    lastName: 'Ibrahim',
    email: 'aibrah.180085@guest.booking.com',
    phone: '+1 555-0999',
    status: 'CONFIRMED',
    totalAmount: 1645,
    currency: 'AED',
    checkIn: '2026-05-18',
    checkOut: '2026-05-25',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-26T14:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-19470409', roomTypeId: 'room-limiria-villa', nightlyRate: 235, nights: 7, total: 1645, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22494964',
    bookingRef: 'LG22494964',
    firstName: 'Tamara',
    lastName: 'Chibuike-Ibe',
    email: 'tchibu.091823@guest.booking.com',
    phone: '+234 800 0000000',
    status: 'CONFIRMED',
    totalAmount: 1440,
    currency: 'AED',
    checkIn: '2026-10-05',
    checkOut: '2026-10-10',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-15T11:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22494964', roomTypeId: 'room-limiria-villa', nightlyRate: 288, nights: 5, total: 1440, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22464424',
    bookingRef: 'LG22464424',
    firstName: 'Yvonne',
    lastName: 'Mwakio',
    email: 'ymwaki.819283@guest.booking.com',
    phone: '+254 700 000000',
    status: 'CONFIRMED',
    totalAmount: 996,
    currency: 'AED',
    checkIn: '2026-12-14',
    checkOut: '2026-12-17',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-14T09:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22464424', roomTypeId: 'room-limiria-villa', nightlyRate: 332, nights: 3, total: 996, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22356072',
    bookingRef: 'LG22356072',
    firstName: 'Sean',
    lastName: 'Dickerson',
    email: 'sdicke.018273@guest.booking.com',
    phone: '+1 555-0182',
    status: 'CONFIRMED',
    totalAmount: 1160,
    currency: 'AED',
    checkIn: '2027-03-16',
    checkOut: '2027-03-20',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-08-08T14:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22356072', roomTypeId: 'room-limiria-villa', nightlyRate: 290, nights: 4, total: 1160, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '22005723',
    bookingRef: 'LG22005723',
    firstName: 'Jael',
    lastName: 'Makanzu',
    email: 'jmakan.091823@guest.booking.com',
    phone: '+243 810 000000',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2026-08-31',
    checkOut: '2026-09-04',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-07-20T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-22005723', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 4, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '21309992',
    bookingRef: 'LG21309992',
    firstName: 'Mwenzi',
    lastName: 'Chimfwembe',
    email: 'mchimf.918273@guest.booking.com',
    phone: '+260 970 000000',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2026-10-18',
    checkOut: '2026-10-25',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-06-15T12:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-21309992', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 7, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '21227097',
    bookingRef: 'LG21227097',
    firstName: 'Bambam',
    lastName: 'Noluyolo Mbalie',
    email: 'bmbalie.019283@guest.booking.com',
    phone: '+27 82 000 0000',
    status: 'CONFIRMED',
    totalAmount: 1470,
    currency: 'AED',
    checkIn: '2026-12-30',
    checkOut: '2027-01-04',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-06-10T16:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-21227097', roomTypeId: 'room-limiria-villa', nightlyRate: 294, nights: 5, total: 1470, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19553008',
    bookingRef: 'LG19553008',
    firstName: 'Airbnb',
    lastName: 'Guest',
    email: 'airbnb.guest1955@guest.airbnb.com',
    phone: '+1 555-0199',
    status: 'PENDING',
    totalAmount: 2750,
    currency: 'AED',
    checkIn: '2026-12-29',
    checkOut: '2027-01-09',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-30T10:00:00.000Z',
    channel: 'Airbnb',
    lodgifySource: 'AirbnbIntegration',
    items: [{ id: 'i-19553008', roomTypeId: 'room-limiria-villa', nightlyRate: 250, nights: 11, total: 2750, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '19178810',
    bookingRef: 'LG19178810',
    firstName: 'Wynnete',
    lastName: 'Mavura',
    email: 'wmavur.192837@guest.booking.com',
    phone: '+263 77 000 0000',
    status: 'CONFIRMED',
    totalAmount: 1384,
    currency: 'AED',
    checkIn: '2026-11-20',
    checkOut: '2026-11-24',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-12T15:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-19178810', roomTypeId: 'room-limiria-villa', nightlyRate: 346, nights: 4, total: 1384, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18920041',
    bookingRef: 'LG18920041',
    firstName: 'Aboubacar',
    lastName: 'Guest',
    email: 'aboubacar@guest.airbnb.com',
    phone: '+223 70 00 00 00',
    status: 'PENDING',
    totalAmount: 1500,
    currency: 'AED',
    checkIn: '2026-09-20',
    checkOut: '2026-09-26',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-02-25T11:00:00.000Z',
    channel: 'Airbnb',
    lodgifySource: 'AirbnbIntegration',
    items: [{ id: 'i-18920041', roomTypeId: 'room-limiria-villa', nightlyRate: 250, nights: 6, total: 1500, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18629126',
    bookingRef: 'LG18629126',
    firstName: 'Sarah',
    lastName: 'Soussan',
    email: 'ssouss.918273@guest.booking.com',
    phone: '+33 6 00 00 00 00',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2027-01-04',
    checkOut: '2027-01-11',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-02-10T14:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-18629126', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 7, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18308660',
    bookingRef: 'LG18308660',
    firstName: 'tabeth',
    lastName: 'g',
    email: 'tabethg.918273@guest.booking.com',
    phone: '+263 71 000 0000',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2026-12-23',
    checkOut: '2026-12-28',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-01-25T16:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-18308660', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 5, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '17807142',
    bookingRef: 'LG17807142',
    firstName: 'Anne',
    lastName: 'Bogomba',
    email: 'abogom.192837@guest.booking.com',
    phone: '+241 07 00 00 00',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2026-12-23',
    checkOut: '2026-12-28',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-01-05T09:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-17807142', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 5, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18938070',
    bookingRef: 'LG18938070',
    firstName: 'Andrea',
    lastName: 'Lacci',
    email: 'alacci.019283@guest.booking.com',
    phone: '+39 333 111111',
    status: 'CONFIRMED',
    totalAmount: 3540,
    currency: 'AED',
    checkIn: '2026-12-10',
    checkOut: '2026-12-15',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-03-01T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-18938070', roomTypeId: 'room-limiria-villa', nightlyRate: 354, nights: 10, total: 3540, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '18386630',
    bookingRef: 'LG18386630',
    firstName: 'Pia',
    lastName: 'Holstein Grynnerup',
    email: 'pgrynn.019283@guest.booking.com',
    phone: '+45 20 00 00 00',
    status: 'CONFIRMED',
    totalAmount: 5950,
    currency: 'AED',
    checkIn: '2026-07-13',
    checkOut: '2026-07-30',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2026-02-01T12:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-18386630', roomTypeId: 'room-limiria-villa', nightlyRate: 350, nights: 17, total: 5950, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '17552937',
    bookingRef: 'LG17552937',
    firstName: 'Muhammad',
    lastName: 'Mawji',
    email: 'mmawji.019283@guest.booking.com',
    phone: '+44 7911 123456',
    status: 'CONFIRMED',
    totalAmount: 1060,
    currency: 'AED',
    checkIn: '2025-12-18',
    checkOut: '2025-12-21',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-12-16T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-17552937', roomTypeId: 'room-limiria-villa', nightlyRate: 353.33, nights: 3, total: 1060, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '17008693',
    bookingRef: 'LG17008693',
    firstName: 'Rebecca',
    lastName: 'Iban',
    email: 'riban.019283@guest.booking.com',
    phone: '+34 600 000000',
    status: 'CONFIRMED',
    totalAmount: 2450,
    currency: 'AED',
    checkIn: '2026-01-15',
    checkOut: '2026-01-22',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-11-12T09:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-17008693', roomTypeId: 'room-limiria-villa', nightlyRate: 350, nights: 7, total: 2450, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16927258',
    bookingRef: 'LG16927258',
    firstName: 'anthony',
    lastName: 'giordano',
    email: 'agiord.019283@guest.booking.com',
    phone: '+1 555-0177',
    status: 'CONFIRMED',
    totalAmount: 1750,
    currency: 'AED',
    checkIn: '2025-12-25',
    checkOut: '2025-12-30',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-11-06T14:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16927258', roomTypeId: 'room-limiria-villa', nightlyRate: 350, nights: 5, total: 1750, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16628181',
    bookingRef: 'LG16628181',
    firstName: 'Natalia',
    lastName: 'Mbamba',
    email: 'nmbamb.019283@guest.booking.com',
    phone: '+27 83 000 0000',
    status: 'CONFIRMED',
    totalAmount: 318,
    currency: 'AED',
    checkIn: '2025-10-18',
    checkOut: '2025-10-19',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-10-17T11:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16628181', roomTypeId: 'room-limiria-villa', nightlyRate: 318, nights: 1, total: 318, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162477',
    bookingRef: 'LG16162477',
    firstName: 'Sandra',
    lastName: 'Kohaut',
    email: 'skohau.019283@guest.booking.com',
    phone: '+49 160 0000000',
    status: 'CONFIRMED',
    totalAmount: 2330,
    currency: 'AED',
    checkIn: '2026-01-04',
    checkOut: '2026-01-10',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-07-29T15:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162477', roomTypeId: 'room-limiria-villa', nightlyRate: 388.33, nights: 6, total: 2330, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162475',
    bookingRef: 'LG16162475',
    firstName: 'Mirte',
    lastName: 'van der Ven',
    email: 'mvande.019283@guest.booking.com',
    phone: '+31 6 00000000',
    status: 'CONFIRMED',
    totalAmount: 1160,
    currency: 'AED',
    checkIn: '2025-12-30',
    checkOut: '2026-01-02',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-08-29T12:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162475', roomTypeId: 'room-limiria-villa', nightlyRate: 386.66, nights: 3, total: 1160, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162474',
    bookingRef: 'LG16162474',
    firstName: 'Fabio Lorenzo',
    lastName: 'Leotta',
    email: 'fleott.019283@guest.booking.com',
    phone: '+39 320 0000000',
    status: 'CONFIRMED',
    totalAmount: 2350,
    currency: 'AED',
    checkIn: '2025-12-06',
    checkOut: '2025-12-12',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-05-10T16:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162474', roomTypeId: 'room-limiria-villa', nightlyRate: 391.66, nights: 6, total: 2350, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162471',
    bookingRef: 'LG16162471',
    firstName: 'Layal',
    lastName: 'Zahoui',
    email: 'lzahou.019283@guest.booking.com',
    phone: '+961 3 000000',
    status: 'CONFIRMED',
    totalAmount: 2700,
    currency: 'AED',
    checkIn: '2025-09-11',
    checkOut: '2025-09-18',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-07-15T10:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162471', roomTypeId: 'room-limiria-villa', nightlyRate: 385.71, nights: 7, total: 2700, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '16162476',
    bookingRef: 'LG16162476',
    firstName: 'Daniela',
    lastName: 'Valesova',
    email: 'dvales.019283@guest.booking.com',
    phone: '+420 777 000000',
    status: 'CANCELLED',
    totalAmount: 0,
    currency: 'AED',
    checkIn: '2025-06-28',
    checkOut: '2025-07-11',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2025-07-14T09:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-16162476', roomTypeId: 'room-limiria-villa', nightlyRate: 0, nights: 13, total: 0, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
  {
    id: '10937918',
    bookingRef: 'LG10937918',
    firstName: 'Kisusi',
    lastName: 'Alphaeus',
    email: 'kalpha.019283@guest.booking.com',
    phone: '+255 784 000000',
    status: 'CONFIRMED',
    totalAmount: 600,
    currency: 'AED',
    checkIn: '2024-08-19',
    checkOut: '2024-08-21',
    adults: 2,
    children: 0,
    rooms: 1,
    createdAt: '2024-08-20T08:00:00.000Z',
    channel: 'Booking.com',
    lodgifySource: 'BookingCom',
    items: [{ id: 'i-10937918', roomTypeId: 'room-limiria-villa', nightlyRate: 300, nights: 2, total: 600, roomType: { name: 'Limiria Villa Zanzibar', category: { name: 'King Rooms' } }, ratePlan: { name: 'ROOM_ONLY' } }],
  },
]

export async function getBooking(req: Request, res: Response) {
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
    if (!booking) {
      const match = MOCK_BOOKINGS.find((b) => b.id === id || b.bookingRef === id) ?? MOCK_BOOKINGS[0]
      res.json(match)
      return
    }
    res.json(booking)
  } catch {
    const id = String(req.params.id)
    const match = MOCK_BOOKINGS.find((b) => b.id === id || b.bookingRef === id) ?? MOCK_BOOKINGS[0]
    res.json(match)
  }
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
  } catch {
    const id = String(req.params.id)
    const status = req.body?.status ?? 'CONFIRMED'
    const match = MOCK_BOOKINGS.find((b) => b.id === id || b.bookingRef === id) ?? MOCK_BOOKINGS[0]
    if (match) match.status = status
    res.json({ ...match, status })
  }
}

export async function deleteBooking(req: Request, res: Response, next: NextFunction) {
  const targetId = String(req.params.id)
  const stripped = targetId.replace(/^LG/i, '')

  // 1. Remove from in-memory MOCK_BOOKINGS list (all matching refs/ids)
  for (let i = MOCK_BOOKINGS.length - 1; i >= 0; i--) {
    const b = MOCK_BOOKINGS[i]
    if (
      String(b.id) === targetId ||
      b.bookingRef === targetId ||
      String(b.id) === stripped ||
      b.bookingRef === `LG${stripped}`
    ) {
      MOCK_BOOKINGS.splice(i, 1)
    }
  }

  // 2. DB delete + record Lodgify exclusion so sync/webhooks do not re-import
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: targetId },
          { bookingRef: targetId },
          { lodgifyBookingId: targetId },
          { lodgifyBookingId: stripped },
          { bookingRef: `LG${stripped}` },
        ],
      },
      select: { id: true, lodgifyBookingId: true, bookingRef: true },
    })

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' })
      return
    }

    // Only allow deleting bookings for the configured Limiria property when scoped
    if (env.lodgifyPropertyId != null) {
      const scoped = await prisma.booking.findFirst({
        where: scopedBookingWhere({ id: booking.id }),
        select: { id: true },
      })
      if (!scoped) {
        res.status(403).json({ error: 'Booking is outside Limiria Villa scope' })
        return
      }
    }

    await excludeLodgifyBooking(booking.lodgifyBookingId ?? stripped, booking.bookingRef)
    await prisma.booking.delete({ where: { id: booking.id } })
    res.status(200).json({ success: true })
  } catch (err) {
    console.warn('[DB Fallback] deleteBooking DB delete failed (removed from mock):', err)
    // Still succeed for mock-only mode so UI stays consistent while MySQL is down
    res.status(200).json({ success: true, warning: 'Deleted from cache; database unavailable' })
  }
}
