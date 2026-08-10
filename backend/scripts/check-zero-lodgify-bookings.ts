import '../src/load-env'
import { prisma } from '../src/config/database'

async function main() {
  const rows = await prisma.booking.findMany({
    where: {
      lodgifyBookingId: { not: null },
      totalAmount: 0,
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      bookingRef: true,
      firstName: true,
      lastName: true,
      status: true,
      totalAmount: true,
      currency: true,
      checkIn: true,
      checkOut: true,
      specialRequests: true,
      lodgifySource: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  console.log(JSON.stringify(rows, null, 2))
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
