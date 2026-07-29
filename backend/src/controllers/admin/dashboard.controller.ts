import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/database'

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
    const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      monthRevenue,
      totalRevenue,
      checkInsToday,
      checkOutsToday,
      totalGuests,
      recentBookings,
      topRoomTypes,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.booking.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: firstOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.booking.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      prisma.booking.count({ where: { checkIn: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } }),
      prisma.booking.count({ where: { checkOut: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } }),
      prisma.guest.count(),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { take: 1, include: { roomType: { select: { name: true } } } },
        },
      }),
      prisma.bookingItem.groupBy({
        by: ['roomTypeId'],
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ])

    // Enrich top room types
    const enrichedTopRooms = await Promise.all(
      topRoomTypes.map(async (r) => {
        const rt = await prisma.roomType.findUnique({ where: { id: r.roomTypeId }, select: { name: true } })
        return { roomTypeId: r.roomTypeId, name: rt?.name ?? 'Unknown', bookings: r._count.id, revenue: r._sum.total ?? 0 }
      }),
    )

    // Revenue chart — last 30 days
    const revenueByDay = await prisma.booking.groupBy({
      by: ['createdAt'],
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true },
    })

    res.json({
      stats: {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        monthRevenue: monthRevenue._sum.totalAmount ?? 0,
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
        checkInsToday,
        checkOutsToday,
        totalGuests,
      },
      recentBookings,
      topRoomTypes: enrichedTopRooms,
      revenueByDay: revenueByDay.map((r) => ({
        date: r.createdAt.toISOString().slice(0, 10),
        revenue: r._sum.totalAmount ?? 0,
      })),
    })
  } catch (err) { next(err) }
}
