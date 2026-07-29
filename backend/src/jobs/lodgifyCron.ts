import cron from 'node-cron'
import { isLodgifyConfigured } from '../config/lodgify'
import { runLodgifySync } from '../services/syncService'

let started = false

/**
 * Sync Lodgify availability + channel bookings every 15 minutes.
 * Errors are logged; the process never exits because of sync failures.
 */
export function startLodgifyCron(): void {
  if (started) return
  started = true

  if (!isLodgifyConfigured()) {
    console.log('⚠ Lodgify cron skipped — LODGIFY_API_KEY not set')
    return
  }

  // Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const startedAt = new Date().toISOString()
    console.log(`[Lodgify cron] sync started at ${startedAt}`)
    try {
      const result = await runLodgifySync()
      const ok = result.availability.ok && result.bookings.ok
      if (ok) {
        console.log(
          `[Lodgify cron] success — availability dates=${result.availability.datesUpdated}, bookings=${result.bookings.bookingsSynced}`,
        )
      } else {
        console.error('[Lodgify cron] completed with errors', {
          availability: result.availability.message,
          availabilityErrors: result.availability.errors,
          bookings: result.bookings.message,
          bookingErrors: result.bookings.errors,
        })
      }
    } catch (err) {
      console.error('[Lodgify cron] unexpected failure:', err instanceof Error ? err.message : err)
    }
  })

  console.log('✓ Lodgify sync cron scheduled (every 15 minutes)')
}
