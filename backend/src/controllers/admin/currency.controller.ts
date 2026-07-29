import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { syncRatesFromApi } from '../../services/currency.service'

export async function listRates(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await prisma.currencyRate.findMany({ orderBy: { toCurrency: 'asc' } })
    res.json(rates)
  } catch (err) { next(err) }
}

const RateSchema = z.object({
  toCurrency: z.string().length(3).toUpperCase(),
  rate: z.number().positive(),
})

export async function upsertRate(req: Request, res: Response, next: NextFunction) {
  try {
    const { toCurrency, rate } = RateSchema.parse(req.body)
    const record = await prisma.currencyRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: 'AED', toCurrency } },
      update: { rate, lastUpdated: new Date() },
      create: { fromCurrency: 'AED', toCurrency, rate },
    })
    res.json(record)
  } catch (err) { next(err) }
}

export async function syncRates(req: Request, res: Response, next: NextFunction) {
  try {
    await syncRatesFromApi()
    const rates = await prisma.currencyRate.findMany()
    res.json({ message: 'Rates synced', rates })
  } catch (err) { next(err) }
}
