import { VillaRateType } from '@prisma/client'
import { prisma } from '../config/database'
import { parseDate } from '../utils/pricing'
import { env } from '../config/env'
import { lodgifyClient, isLodgifyConfigured } from '../config/lodgify'

export type EffectiveRateSource = 'SPECIFIC_DATE' | 'MONTHLY' | 'YEARLY' | 'PRICE_OVERRIDE' | 'BASE'

export type DayRate = {
  date: string
  priceAed: number
  source: EffectiveRateSource
}

function eachDayInclusive(start: Date, end: Date): string[] {
  const days: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

function eachDayExclusiveEnd(start: Date, end: Date): string[] {
  const days: string[] = []
  const cur = new Date(start)
  while (cur < end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

/** Resolve nightly AED for one calendar date (priority: date > month > year > override > base). */
export async function resolveNightlyRateAed(
  villaId: string,
  ratePlanId: string,
  date: Date,
): Promise<{ price: number; source: EffectiveRateSource }> {
  const dateStr = date.toISOString().slice(0, 10)
  const month = date.getUTCMonth() + 1

  const [specific, monthly, yearly, override, plan] = await Promise.all([
    prisma.villaRate.findFirst({
      where: { villaId, rateType: 'SPECIFIC_DATE', date },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.villaRate.findFirst({
      where: { villaId, rateType: 'MONTHLY', month },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.villaRate.findFirst({
      where: { villaId, rateType: 'YEARLY' },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.priceOverride.findUnique({
      where: { ratePlanId_date: { ratePlanId, date } },
    }),
    prisma.ratePlan.findUnique({ where: { id: ratePlanId }, select: { basePrice: true } }),
  ])

  if (specific) return { price: specific.basePrice, source: 'SPECIFIC_DATE' }
  if (monthly) return { price: monthly.basePrice, source: 'MONTHLY' }
  if (yearly) return { price: yearly.basePrice, source: 'YEARLY' }
  if (override) return { price: override.price, source: 'PRICE_OVERRIDE' }
  return { price: plan?.basePrice ?? 0, source: 'BASE' }
}

/** Average nightly AED over [checkIn, checkOut). */
export async function averageNightlyRateAed(
  villaId: string,
  ratePlanId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<number> {
  const days = eachDayExclusiveEnd(checkIn, checkOut)
  if (!days.length) return 0
  let total = 0
  for (const d of days) {
    const { price } = await resolveNightlyRateAed(villaId, ratePlanId, parseDate(d))
    total += price
  }
  return Math.round((total / days.length) * 100) / 100
}

export async function listVillaRates(villaId: string) {
  return prisma.villaRate.findMany({
    where: { villaId },
    orderBy: [{ rateType: 'asc' }, { month: 'asc' }, { date: 'asc' }],
  })
}

export async function getRatesCalendar(
  villaId: string,
  year: number,
  month: number,
): Promise<{ days: DayRate[]; yearly: number | null; monthly: number | null }> {
  const plan = await prisma.ratePlan.findFirst({
    where: { roomTypeId: villaId, isActive: true },
    orderBy: { basePrice: 'asc' },
  })
  if (!plan) {
    return { days: [], yearly: null, monthly: null }
  }

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0)) // last day of month
  const dayStrs = eachDayInclusive(start, end)

  const [yearly, monthlyRow] = await Promise.all([
    prisma.villaRate.findFirst({
      where: { villaId, rateType: 'YEARLY' },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.villaRate.findFirst({
      where: { villaId, rateType: 'MONTHLY', month },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const days: DayRate[] = []
  for (const d of dayStrs) {
    const resolved = await resolveNightlyRateAed(villaId, plan.id, parseDate(d))
    days.push({ date: d, priceAed: resolved.price, source: resolved.source })
  }

  return {
    days,
    yearly: yearly?.basePrice ?? plan.basePrice,
    monthly: monthlyRow?.basePrice ?? null,
  }
}

export async function setYearlyRate(villaId: string, basePrice: number) {
  const existing = await prisma.villaRate.findFirst({
    where: { villaId, rateType: 'YEARLY' },
  })
  const row = existing
    ? await prisma.villaRate.update({
        where: { id: existing.id },
        data: { basePrice },
      })
    : await prisma.villaRate.create({
        data: { villaId, rateType: 'YEARLY', basePrice, month: null, date: null },
      })

  // Keep primary rate plan base in sync for booking fallback / Lodgify pull baseline
  await prisma.ratePlan.updateMany({
    where: { roomTypeId: villaId, isActive: true },
    data: { basePrice },
  })

  return row
}

export async function setMonthlyRate(villaId: string, month: number, basePrice: number) {
  if (month < 1 || month > 12) throw new Error('month must be 1–12')
  const existing = await prisma.villaRate.findFirst({
    where: { villaId, rateType: 'MONTHLY', month },
  })
  if (existing) {
    return prisma.villaRate.update({
      where: { id: existing.id },
      data: { basePrice },
    })
  }
  return prisma.villaRate.create({
    data: { villaId, rateType: 'MONTHLY', month, basePrice, date: null },
  })
}

export async function setDateRates(
  villaId: string,
  from: string,
  to: string,
  basePrice: number,
) {
  const start = parseDate(from)
  const end = parseDate(to)
  if (end < start) throw new Error('to must be on or after from')

  const days = eachDayInclusive(start, end)
  const plan = await prisma.ratePlan.findFirst({
    where: { roomTypeId: villaId, isActive: true },
    orderBy: { basePrice: 'asc' },
  })

  const results = []
  for (const day of days) {
    const date = parseDate(day)
    const existing = await prisma.villaRate.findFirst({
      where: { villaId, rateType: 'SPECIFIC_DATE', date },
    })
    const row = existing
      ? await prisma.villaRate.update({
          where: { id: existing.id },
          data: { basePrice },
        })
      : await prisma.villaRate.create({
          data: {
            villaId,
            rateType: 'SPECIFIC_DATE',
            date,
            basePrice,
            month: null,
          },
        })
    results.push(row)

    // Mirror into PriceOverride so Lodgify pull/legacy paths stay consistent
    if (plan) {
      await prisma.priceOverride.upsert({
        where: { ratePlanId_date: { ratePlanId: plan.id, date } },
        update: { price: basePrice },
        create: { ratePlanId: plan.id, date, price: basePrice },
      })
    }
  }
  return { updated: results.length, rates: results }
}

export async function deleteVillaRate(id: string) {
  return prisma.villaRate.delete({ where: { id } })
}

/**
 * Best-effort push of a flat nightly rate into Lodgify rates calendar.
 * Lodgify public API support varies; failures are returned (not thrown) for UI messaging.
 */
export async function pushRatesToLodgify(
  villaId: string,
  from: string,
  to: string,
  priceAed: number,
): Promise<{ ok: boolean; message: string }> {
  if (!isLodgifyConfigured()) {
    return { ok: false, message: 'Lodgify is not configured (LODGIFY_API_KEY missing)' }
  }

  const villa = await prisma.roomType.findUnique({ where: { id: villaId } })
  if (!villa?.lodgifyPropertyId || !villa.lodgifyRoomTypeId) {
    return { ok: false, message: 'Villa is not mapped to Lodgify property/room type IDs' }
  }

  try {
    // Lodgify v2 rates calendar is primarily read; try POST update when available.
    await lodgifyClient.post('/rates/calendar', {
      HouseId: villa.lodgifyPropertyId,
      RoomTypeId: villa.lodgifyRoomTypeId,
      StartDate: from,
      EndDate: to,
      Price: priceAed,
      CurrencyCode: 'AED',
    })
    return { ok: true, message: 'Rates pushed to Lodgify calendar' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[VillaRates] Lodgify push failed (rates saved locally):', msg)
    return {
      ok: false,
      message: `Saved locally. Lodgify sync unavailable: ${msg}. Check Lodgify calendar: ${
        env.lodgifyBaseUrl
      } — property ${villa.lodgifyPropertyId} / room ${villa.lodgifyRoomTypeId}`,
    }
  }
}

export type { VillaRateType }
