import { Request, Response, NextFunction } from 'express'
import { runLodgifySync } from '../../services/syncService'

/** POST /api/admin/sync/lodgify — manually trigger availability + booking sync */
export async function syncLodgify(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await runLodgifySync()
    const ok = result.availability.ok && result.bookings.ok
    res.status(ok ? 200 : 207).json({
      success: ok,
      availability: result.availability,
      bookings: result.bookings,
    })
  } catch (err) {
    // Should not throw (runLodgifySync catches), but keep Express safe
    console.error('[Lodgify admin sync] unexpected error:', err)
    next(err)
  }
}
