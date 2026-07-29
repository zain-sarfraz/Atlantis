import { Request, Response, NextFunction } from 'express'
import { getAllRates } from '../../services/currency.service'

/** GET /api/currency — returns all AED → X rates */
export async function getCurrencyRates(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await getAllRates()
    res.json({ base: 'AED', rates })
  } catch (err) {
    next(err)
  }
}
