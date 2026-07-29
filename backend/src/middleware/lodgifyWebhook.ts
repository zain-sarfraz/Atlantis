import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer
    }
  }
}

function parseSecrets(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function signaturesMatch(provided: string, expectedHex: string): boolean {
  try {
    const a = Buffer.from(provided.toUpperCase())
    const b = Buffer.from(expectedHex.toUpperCase())
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch (err) {
    console.error('[Lodgify webhook] signaturesMatch threw:', err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * Lodgify docs: header `ms-signature: sha256=HEX`
 * Soft-fail in testing: never block the request (always next()).
 */
export function verifyLodgifyWebhook(req: Request, res: Response, next: NextFunction): void {
  try {
    const secrets = parseSecrets(env.lodgifyWebhookSecret ?? '')
    const rawHeader = req.headers['ms-signature'] as string | undefined

    console.log(
      `[Lodgify webhook] signature check: secretsConfigured=${secrets.length} headerPresent=${Boolean(rawHeader)}`,
    )

    if (secrets.length === 0) {
      console.warn('[Lodgify webhook] LODGIFY_WEBHOOK_SECRET not set — verification skipped')
      next()
      return
    }

    if (!rawHeader) {
      // TODO: hard 401 once verification confirmed in production
      console.warn('[Lodgify webhook] Missing ms-signature — processing anyway (testing mode)')
      next()
      return
    }

    const provided = rawHeader.includes('=')
      ? rawHeader.slice(rawHeader.indexOf('=') + 1).trim()
      : rawHeader.trim()

    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}))
    const ok = secrets.some((secret) => {
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
      return signaturesMatch(provided, expected)
    })

    if (ok) {
      console.log('[Lodgify webhook] ms-signature OK')
    } else {
      // TODO: reject with 401 once confirmed working end-to-end
      console.warn(
        '[Lodgify webhook] ms-signature did not match any secret — processing anyway (testing mode)',
      )
    }

    next()
  } catch (err) {
    // Never swallow — always log and continue so the booking can still be saved
    console.error(
      '[Lodgify webhook] verifyLodgifyWebhook threw (continuing):',
      err instanceof Error ? err.stack ?? err.message : err,
    )
    next()
  }
}
