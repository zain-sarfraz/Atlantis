/**
 * One-time: normalize historical Booking.lodgifySource values to Lodgify inbox channels.
 * Run: npx tsx scripts/normalize-channels.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { normalizeLodgifyChannel } from '../src/utils/lodgifyChannels'

const prisma = new PrismaClient()

async function main() {
  const bookings = await prisma.booking.findMany({
    select: { id: true, lodgifySource: true },
  })
  let updated = 0
  for (const b of bookings) {
    const next = normalizeLodgifyChannel(b.lodgifySource)
    if (b.lodgifySource !== next) {
      await prisma.booking.update({ where: { id: b.id }, data: { lodgifySource: next } })
      updated += 1
      console.log(`${b.id}: ${b.lodgifySource ?? 'null'} → ${next}`)
    }
  }
  console.log(`Done. Updated ${updated} / ${bookings.length} bookings.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
