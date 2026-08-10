import '../src/load-env'
import { prisma } from '../src/config/database'
import { runLodgifySync } from '../src/services/syncService'
import { getBookings } from '../src/services/lodgifyService'

function fmtDate(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : 'null'
}

async function snapshotState() {
  const totalLodgify = await prisma.booking.count({ where: { lodgifyBookingId: { not: null } } })
  const totalZero = await prisma.booking.count({ where: { lodgifyBookingId: { not: null }, totalAmount: 0 } })
  const zain = await prisma.booking.findFirst({
    where: {
      firstName: 'Zain',
      lastName: 'Sarfraz',
      checkIn: new Date('2026-08-21T00:00:00.000Z'),
      checkOut: new Date('2026-08-22T00:00:00.000Z'),
    },
    select: {
      id: true,
      bookingRef: true,
      status: true,
      totalAmount: true,
      currency: true,
      specialRequests: true,
      lodgifySource: true,
      checkIn: true,
      checkOut: true,
    },
  })
  const zeroSamples = await prisma.booking.findMany({
    where: { lodgifyBookingId: { not: null }, totalAmount: 0 },
    select: {
      id: true,
      bookingRef: true,
      firstName: true,
      lastName: true,
      checkIn: true,
      checkOut: true,
      specialRequests: true,
      lodgifySource: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  return { totalLodgify, totalZero, zain, zeroSamples }
}

async function main() {
  console.log('=== PRE-SYNC SNAPSHOT ===')
  const before = await snapshotState()
  console.log(JSON.stringify(before, null, 2))

  console.log('\n=== RUNNING FULL LODGIFY SYNC ===')
  const result = await runLodgifySync()
  console.log(JSON.stringify(result, null, 2))

  console.log('\n=== POST-SYNC SNAPSHOT ===')
  const after = await snapshotState()
  console.log(JSON.stringify(after, null, 2))

  // Only Limiria Villa Zanzibar (LODGIFY_PROPERTY_ID)
  for (const propertyId of [714507]) {
    console.log(`\n=== RAW LODGIFY BOOKINGS FOR PROPERTY ${propertyId} ===`)
    try {
      const bookings = await getBookings(propertyId, { stayFilter: 'All' })
      console.log(`count=${bookings.length}`)
      console.log(JSON.stringify(bookings.slice(0, 5), null, 2))
    } catch (err) {
      console.error(`Failed to fetch bookings for ${propertyId}:`, err)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try { await prisma.$disconnect() } catch (_) {}
  process.exit(1)
})
