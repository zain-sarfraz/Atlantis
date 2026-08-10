import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { createError } from '../../middleware/error'
import {
  deleteVillaRate,
  getRatesCalendar,
  listVillaRates,
  pushRatesToLodgify,
  setDateRates,
  setMonthlyRate,
  setYearlyRate,
} from '../../services/villaRates.service'
import { convertForDisplay, getAllRatesCached } from '../../services/currency.service'

const YearlySchema = z.object({
  basePrice: z.coerce.number().positive(),
  syncLodgify: z.boolean().optional(),
})

const MonthlySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  basePrice: z.coerce.number().positive(),
})

const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  basePrice: z.coerce.number().positive(),
  syncLodgify: z.boolean().optional(),
})

async function withCurrencyPreview(basePriceAed: number) {
  const rates = await getAllRatesCached()
  return {
    AED: convertForDisplay(basePriceAed, 'AED', rates),
    USD: convertForDisplay(basePriceAed, 'USD', rates),
    EUR: convertForDisplay(basePriceAed, 'EUR', rates),
    GBP: convertForDisplay(basePriceAed, 'GBP', rates),
  }
}

export async function getVillaRates(req: Request, res: Response, next: NextFunction) {
  try {
    const villaId = String(req.params.villaId)
    const rates = await listVillaRates(villaId)
    const fx = await getAllRatesCached()
    res.json({
      rates,
      exchangeRates: fx,
      preview: await Promise.all(
        rates.map(async (r) => ({
          id: r.id,
          currencies: await withCurrencyPreview(r.basePrice),
        })),
      ),
    })
  } catch (err) {
    next(err)
  }
}

export async function getVillaRatesCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const villaId = String(req.params.villaId)
    const monthStr = typeof req.query.month === 'string' ? req.query.month : ''
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw createError('month query required as YYYY-MM', 400)
    }
    const [y, m] = monthStr.split('-').map(Number)
    const calendar = await getRatesCalendar(villaId, y, m)
    const fx = await getAllRatesCached()
    res.json({
      ...calendar,
      exchangeRates: fx,
      yearlyCurrencies: calendar.yearly != null ? await withCurrencyPreview(calendar.yearly) : null,
      monthlyCurrencies:
        calendar.monthly != null ? await withCurrencyPreview(calendar.monthly) : null,
    })
  } catch (err) {
    next(err)
  }
}

export async function putYearlyRate(req: Request, res: Response, next: NextFunction) {
  try {
    const villaId = String(req.params.villaId)
    const body = YearlySchema.parse(req.body)
    const row = await setYearlyRate(villaId, body.basePrice)
    let lodgify: { ok: boolean; message: string } | undefined
    if (body.syncLodgify) {
      const year = new Date().getUTCFullYear()
      lodgify = await pushRatesToLodgify(
        villaId,
        `${year}-01-01`,
        `${year}-12-31`,
        body.basePrice,
      )
    }
    res.json({
      rate: row,
      currencies: await withCurrencyPreview(row.basePrice),
      lodgify,
      message: 'Yearly rate saved (AED)',
    })
  } catch (err) {
    next(err)
  }
}

export async function putMonthlyRate(req: Request, res: Response, next: NextFunction) {
  try {
    const villaId = String(req.params.villaId)
    const body = MonthlySchema.parse(req.body)
    const row = await setMonthlyRate(villaId, body.month, body.basePrice)
    res.json({
      rate: row,
      currencies: await withCurrencyPreview(row.basePrice),
      message: `Monthly rate saved for month ${body.month}`,
    })
  } catch (err) {
    next(err)
  }
}

export async function putDateRates(req: Request, res: Response, next: NextFunction) {
  try {
    const villaId = String(req.params.villaId)
    const body = DateRangeSchema.parse(req.body)
    const result = await setDateRates(villaId, body.from, body.to, body.basePrice)
    let lodgify: { ok: boolean; message: string } | undefined
    if (body.syncLodgify) {
      lodgify = await pushRatesToLodgify(villaId, body.from, body.to, body.basePrice)
    }
    res.json({
      ...result,
      currencies: await withCurrencyPreview(body.basePrice),
      lodgify,
      message: `Updated ${result.updated} date(s)`,
    })
  } catch (err) {
    next(err)
  }
}

export async function removeVillaRate(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteVillaRate(String(req.params.id))
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function previewRate(req: Request, res: Response, next: NextFunction) {
  try {
    const amount = z.coerce.number().nonnegative().parse(req.query.amount ?? req.body?.amount)
    res.json({
      amountAed: amount,
      currencies: await withCurrencyPreview(amount),
      exchangeRates: await getAllRatesCached(),
    })
  } catch (err) {
    next(err)
  }
}
