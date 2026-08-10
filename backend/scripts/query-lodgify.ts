import { PrismaClient } from '@prisma/client'
import { runLodgifySync } from '../src/services/syncService'

const prisma = new PrismaClient()

async function main() {
  console.log('--- DB state before sync ---')
  const zain = await prisma.booking.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Zain' } },
        { lastName: { contains: 'Sarfraz' } },
        { email: { contains: 'zain' } },
        { specialRequests: { contains: 'Zain' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const zeros = await prisma.booking.findMany({
    where: { totalAmount: 0 },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const rooms = await prisma.roomType.findMany({
    where: { lodgifyPropertyId: { in: [714507] } },
    orderBy: [{ lodgifyPropertyId: 'asc' }, { lodgifyRoomTypeId: 'asc' }],
  })
  console.log(JSON.stringify({ zain, zeros, rooms }, null, 2))

  console.log('--- Running Lodgify sync ---')
  const syncResult = await runLodgifySync()
  console.log(JSON.stringify(syncResult, null, 2))

  console.log('--- DB state after sync ---')
  const zainAfter = await prisma.booking.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Zain' } },
        { lastName: { contains: 'Sarfraz' } },
        { email: { contains: 'zain' } },
        { specialRequests: { contains: 'Zain' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const zerosAfter = await prisma.booking.findMany({
    where: { totalAmount: 0 },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  console.log(JSON.stringify({ zainAfter, zerosAfter }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
