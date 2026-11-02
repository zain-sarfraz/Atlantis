/**
 * Audit ALL months: Lodgify API vs local availability table.
 * Exit 1 if any night mismatches.
 */
import '../src/load-env'
import { prisma } from '../src/config/database'
import { getAvailability } from '../src/services/lodgifyService'
import { env } from '../src/config/env'

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function eachDayInclusive(startIso: string, endIso: string): string[] {
  const out: string[] = []
  const cur = new Date(`${startIso}T00:00:00.000Z`)
  const end = new Date(`${endIso}T00:00:00.000Z`)
  while (cur <= end) {
    out.push(toKey(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

type Reason = 'open' | 'booked' | 'closed'

function reasonFromPeriod(p: {
  available: number
  closed_period?: unknown
  bookings?: unknown[]
}): Reason {
  if (p.bookings && p.bookings.length > 0) return 'booked'
  if (p.closed_period) return 'closed'
  if (p.available > 0) return 'open'
  return 'closed'
}

async function main() {
  const propertyId = env.lodgifyPropertyId ?? 714507
  const room = await prisma.roomType.findFirst({
    where: { lodgifyPropertyId: propertyId, isActive: true, lodgifyRoomTypeId: { not: null } },
  })
  if (!room) {
    console.error('No mapped roomType for property', propertyId)
    process.exit(1)
  }

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCMonth(start.getUTCMonth() - 1)
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  end.setUTCMonth(end.getUTCMonth() + 14)
  const startIso = toKey(start)
  const endIso = toKey(end)

  console.log(`Room ${room.name} (${room.id}) property=${propertyId} window ${startIso}..${endIso}`)

  const raw = (await getAvailability(propertyId, startIso, endIso)) as Array<{
    room_type_id?: number
    periods?: Array<{
      start: string
      end: string
      available: number
      closed_period?: unknown
      bookings?: unknown[]
    }>
  }>

  const lodgify = new Map<string, Reason>()
  for (const block of raw ?? []) {
    if (block.room_type_id != null && block.room_type_id !== room.lodgifyRoomTypeId) continue
    for (const p of block.periods ?? []) {
      const reason = reasonFromPeriod(p)
      for (const day of eachDayInclusive(p.start.slice(0, 10), p.end.slice(0, 10))) {
        if (day < startIso || day > endIso) continue
        const prev = lodgify.get(day)
        if (prev === 'booking' || prev === 'booked') continue
        if (reason === 'booked' || !prev) lodgify.set(day, reason)
        else if (reason === 'closed') lodgify.set(day, 'closed')
      }
    }
  }

  const localRows = await prisma.availability.findMany({
    where: {
      roomTypeId: room.id,
      date: { gte: start, lte: end },
    },
    select: { date: true, available: true, blockReason: true },
  })

  const local = new Map<string, Reason>()
  for (const r of localRows) {
    const key = toKey(r.date)
    if (r.available > 0) local.set(key, 'open')
    else if (r.blockReason === 'booking') local.set(key, 'booked')
    else local.set(key, 'closed')
  }

  const mismatches: string[] = []
  const months = new Map<string, { open: number; booked: number; closed: number; mismatch: number }>()

  const allDays = new Set([...lodgify.keys(), ...local.keys()])
  for (const day of [...allDays].sort()) {
    const month = day.slice(0, 7)
    if (!months.has(month)) months.set(month, { open: 0, booked: 0, closed: 0, mismatch: 0 })
    const m = months.get(month)!
    const L = lodgify.get(day) ?? 'open'
    const D = local.get(day) ?? 'open'
    if (D === 'open') m.open++
    else if (D === 'booked') m.booked++
    else m.closed++
    if (L !== D) {
      m.mismatch++
      mismatches.push(`${day}: lodgify=${L} local=${D}`)
    }
  }

  console.log('\nMonth summary (local counts / mismatches vs Lodgify):')
  for (const [month, s] of [...months.entries()].sort()) {
    console.log(
      `  ${month}: open=${s.open} booked=${s.booked} closed=${s.closed} mismatches=${s.mismatch}`,
    )
  }

  console.log(`\nTotal mismatches: ${mismatches.length}`)
  if (mismatches.length) {
    console.log(mismatches.slice(0, 40).join('\n'))
    if (mismatches.length > 40) console.log(`... +${mismatches.length - 40} more`)
  }

  // Simulate public API classification from DB (same rules as getBlockedDates)
  let pubBooked = 0
  let pubClosed = 0
  for (const r of localRows) {
    if (r.available > 0) continue
    if (r.blockReason === 'booking') pubBooked++
    else pubClosed++
  }
  console.log(`\nPublic label from availability only: booked=${pubBooked} closed=${pubClosed}`)

  await prisma.$disconnect()
  process.exit(mismatches.length ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
