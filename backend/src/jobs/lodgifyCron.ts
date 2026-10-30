import cron from 'node-cron'
import { isLodgifyConfigured } from '../config/lodgify'
import { runLodgifySync } from '../services/syncService'

let started = false

/** Max wall-clock time for one Lodgify sync run (1 minute). */
const SYNC_TIMEOUT_MS = 60_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * Sync Lodgify availability + channel bookings every 5 minutes.
 * Each run is capped at 1 minute. Errors are logged; the process never exits.
 */
export function startLodgifyCron(): void {
  if (started) return
  started = true

  if (!isLodgifyConfigured()) {
    console.log('⚠ Lodgify cron skipped — LODGIFY_API_KEY not set')
    return
  }

  // Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const startedAt = new Date().toISOString()
    console.log(`[Lodgify cron] sync started at ${startedAt}`)
    try {
      const result = await withTimeout(runLodgifySync(), SYNC_TIMEOUT_MS, 'Lodgify sync')
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

  console.log('✓ Lodgify sync cron scheduled (every 5 minutes, max 1 min per run)')
}
