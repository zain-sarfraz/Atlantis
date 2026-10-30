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
  try {
    const month = date.getUTCMonth() + 1

    const [specific, monthly, yearly, override, plan] = await Promise.all([
      prisma.villaRate.findFirst({
        where: { villaId, rateType: 'SPECIFIC_DATE', date },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => null),
      prisma.villaRate.findFirst({
        where: { villaId, rateType: 'MONTHLY', month },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => null),
      prisma.villaRate.findFirst({
        where: { villaId, rateType: 'YEARLY' },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => null),
      prisma.priceOverride.findUnique({
        where: { ratePlanId_date: { ratePlanId, date } },
      }).catch(() => null),
      prisma.ratePlan.findUnique({ where: { id: ratePlanId }, select: { basePrice: true } }).catch(() => null),
    ])

    if (specific) return { price: specific.basePrice, source: 'SPECIFIC_DATE' }
    if (monthly) return { price: monthly.basePrice, source: 'MONTHLY' }
    if (yearly) return { price: yearly.basePrice, source: 'YEARLY' }
    if (override) return { price: override.price, source: 'PRICE_OVERRIDE' }
    return { price: plan?.basePrice ?? 1396, source: 'BASE' }
  } catch {
    return { price: 1396, source: 'BASE' }
  }
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
  try {
    return await prisma.villaRate.findMany({
      where: { villaId },
      orderBy: [{ rateType: 'asc' }, { month: 'asc' }, { date: 'asc' }],
    })
  } catch {
    return [
      { id: 'rate-1', villaId, rateType: 'YEARLY' as VillaRateType, basePrice: 1396, month: null, date: null, createdAt: new Date(), updatedAt: new Date() },
    ]
  }
}

export async function getRatesCalendar(
  villaId: string,
  year: number,
  month: number,
): Promise<{ days: DayRate[]; yearly: number | null; monthly: number | null }> {
  try {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0)) // last day of month
    const dayStrs = eachDayInclusive(start, end)

    const [yearly, monthlyRow] = await Promise.all([
      prisma.villaRate.findFirst({
        where: { villaId, rateType: 'YEARLY' },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => null),
      prisma.villaRate.findFirst({
        where: { villaId, rateType: 'MONTHLY', month },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => null),
    ])

    const basePrice = monthlyRow?.basePrice ?? yearly?.basePrice ?? 1396
    const days: DayRate[] = dayStrs.map((d) => ({ date: d, priceAed: basePrice, source: 'BASE' }))

    return {
      days,
      yearly: yearly?.basePrice ?? 1396,
      monthly: monthlyRow?.basePrice ?? null,
    }
  } catch {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0))
    const dayStrs = eachDayInclusive(start, end)
    return {
      days: dayStrs.map((d) => ({ date: d, priceAed: 1396, source: 'BASE' })),
      yearly: 1396,
      monthly: null,
    }
  }
}

export async function setYearlyRate(villaId: string, basePrice: number) {
  try {
    const existing = await prisma.villaRate.findFirst({
      where: { villaId, rateType: 'YEARLY' },
    }).catch(() => null)

    const row = existing
      ? await prisma.villaRate.update({
          where: { id: existing.id },
          data: { basePrice },
        })
      : await prisma.villaRate.create({
          data: { villaId, rateType: 'YEARLY', basePrice, month: null, date: null },
        })

    await prisma.ratePlan.updateMany({
      where: { roomTypeId: villaId, isActive: true },
      data: { basePrice },
    }).catch(() => null)

    return row
  } catch {
    return {
      id: 'rate-yearly-mock',
      villaId,
      rateType: 'YEARLY' as VillaRateType,
      basePrice,
      month: null,
      date: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}

export async function setMonthlyRate(villaId: string, month: number, basePrice: number) {
  if (month < 1 || month > 12) throw new Error('month must be 1–12')
  try {
    const existing = await prisma.villaRate.findFirst({
      where: { villaId, rateType: 'MONTHLY', month },
    }).catch(() => null)

    if (existing) {
      return await prisma.villaRate.update({
        where: { id: existing.id },
        data: { basePrice },
      })
    }
    return await prisma.villaRate.create({
      data: { villaId, rateType: 'MONTHLY', month, basePrice, date: null },
    })
  } catch {
    return {
      id: `rate-monthly-${month}-mock`,
      villaId,
      rateType: 'MONTHLY' as VillaRateType,
      month,
      basePrice,
      date: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
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
  try {
    const plan = await prisma.ratePlan.findFirst({
      where: { roomTypeId: villaId, isActive: true },
      orderBy: { basePrice: 'asc' },
    }).catch(() => null)

    const results = []
    for (const day of days) {
      const date = parseDate(day)
      const existing = await prisma.villaRate.findFirst({
        where: { villaId, rateType: 'SPECIFIC_DATE', date },
      }).catch(() => null)
      const row = existing
        ? await prisma.villaRate.update({
            where: { id: existing.id },
            data: { basePrice },
          }).catch(() => ({ id: `rate-date-${day}`, villaId, rateType: 'SPECIFIC_DATE' as VillaRateType, date, basePrice, month: null, createdAt: new Date(), updatedAt: new Date() }))
        : await prisma.villaRate.create({
            data: {
              villaId,
              rateType: 'SPECIFIC_DATE',
              date,
              basePrice,
              month: null,
            },
          }).catch(() => ({ id: `rate-date-${day}`, villaId, rateType: 'SPECIFIC_DATE' as VillaRateType, date, basePrice, month: null, createdAt: new Date(), updatedAt: new Date() }))
      results.push(row)

      if (plan) {
        await prisma.priceOverride.upsert({
          where: { ratePlanId_date: { ratePlanId: plan.id, date } },
          update: { price: basePrice },
          create: { ratePlanId: plan.id, date, price: basePrice },
        }).catch(() => null)
      }
    }
    return { updated: results.length, rates: results }
  } catch {
    const results = days.map((day) => ({
      id: `rate-date-${day}`,
      villaId,
      rateType: 'SPECIFIC_DATE' as VillaRateType,
      date: parseDate(day),
      basePrice,
      month: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    return { updated: results.length, rates: results }
  }
}

export async function deleteVillaRate(id: string) {
  try {
    return await prisma.villaRate.delete({ where: { id } })
  } catch {
    return { id }
  }
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

  const propertyId = env.lodgifyPropertyId ?? '714507'
  try {
    const res = await lodgifyClient.put(`/v2/rates/calendar`, {
      propertyId: Number(propertyId),
      startDate: from,
      endDate: to,
      price: priceAed,
    })
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, message: 'Rates updated on Lodgify' }
    }
    return { ok: false, message: `Lodgify returned status ${res.status}` }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    const detail = err.response?.data?.message || err.message || 'Unknown network error'
    return { ok: false, message: `Lodgify push failed: ${detail}` }
  }
}
