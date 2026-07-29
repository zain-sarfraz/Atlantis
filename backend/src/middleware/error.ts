import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { env } from '../config/env'

export interface ApiError extends Error {
  statusCode?: number
}

export function createError(message: string, statusCode: number): ApiError {
  const err = new Error(message) as ApiError
  err.statusCode = statusCode
  return err
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(createError(`Route not found: ${req.method} ${req.path}`, 404))
}

const UNIQUE_MESSAGES: Record<string, string> = {
  RoomType_slug_key: 'A room type with this name already exists. Choose a different name.',
  RoomCategory_slug_key: 'A category with this name already exists. Choose a different name.',
  PromoCode_code_key: 'This promo code already exists.',
  AdminUser_email_key: 'An account with this email already exists.',
  Guest_email_key: 'A guest with this email already exists.',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    const summary = details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join('; ')
    res.status(400).json({
      error: summary || 'Validation error',
      details,
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = err.meta?.target as string[] | string | undefined
      const key = Array.isArray(target) ? target.join('_') : String(target ?? '')
      const blob = `${key} ${err.message}`
      const named = Object.entries(UNIQUE_MESSAGES).find(([k]) => blob.includes(k))
      // Field-only targets from MySQL (e.g. ["slug"]) — fall back by model hint in message
      const fieldFallback =
        !named && (key === 'slug' || key.includes('slug'))
          ? blob.includes('RoomCategory')
            ? UNIQUE_MESSAGES.RoomCategory_slug_key
            : UNIQUE_MESSAGES.RoomType_slug_key
          : null
      const message = named?.[1] ?? fieldFallback ?? 'This record already exists. Use a different unique value.'
      res.status(409).json({ error: message })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Related record not found. Check category or linked IDs.' })
      return
    }
  }

  const statusCode = err.statusCode ?? 500
  const message = err.message || 'Internal server error'

  if (statusCode >= 500 && env.nodeEnv !== 'test') {
    console.error('[Error]', err)
  }

  res.status(statusCode).json({
    error: message,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  })
}
