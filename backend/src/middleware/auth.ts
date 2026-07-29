import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { AdminRole } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string
        email: string
        role: AdminRole
      }
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  try {
    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    if (payload.type !== 'access') throw new Error('Wrong token type')
    req.admin = { id: payload.sub, email: payload.email, role: payload.role as AdminRole }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    if (!roles.includes(req.admin.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export const requireSuperAdmin = requireRole(AdminRole.SUPER_ADMIN)
export const requireReservationsManager = requireRole(
  AdminRole.SUPER_ADMIN,
  AdminRole.RESERVATIONS_MANAGER,
)
export const requireContentEditor = requireRole(
  AdminRole.SUPER_ADMIN,
  AdminRole.RESERVATIONS_MANAGER,
  AdminRole.CONTENT_EDITOR,
)
