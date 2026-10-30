import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { signAccessToken } from '../../utils/jwt'

const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function registerGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const { firstName, lastName, email, password, phone } = parsed.data

    const existing = await prisma.guest.findUnique({ where: { email } })
    if (existing) {
      if (existing.password) {
        res.status(409).json({ error: 'An account with this email already exists.' })
        return
      }
      // Guest record exists from a booking — add password to upgrade to account
      const hashed = await bcrypt.hash(password, 12)
      const guest = await prisma.guest.update({
        where: { email },
        data: { password: hashed, firstName, lastName, phone },
      })
      const token = signAccessToken({ sub: guest.id, email: guest.email, role: 'guest' })
      res.status(200).json({
        token,
        user: { id: guest.id, email: guest.email, firstName: guest.firstName, lastName: guest.lastName },
      })
      return
    }

    const hashed = await bcrypt.hash(password, 12)
    const guest = await prisma.guest.create({
      data: { firstName, lastName, email, password: hashed, phone },
    })
    const token = signAccessToken({ sub: guest.id, email: guest.email, role: 'guest' })
    res.status(201).json({
      token,
      user: { id: guest.id, email: guest.email, firstName: guest.firstName, lastName: guest.lastName },
    })
  } catch (err) {
    next(err)
  }
}

export async function loginGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email or password.' })
      return
    }
    const { email, password } = parsed.data

    const guest = await prisma.guest.findUnique({ where: { email } })
    if (!guest || !guest.password) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const valid = await bcrypt.compare(password, guest.password)
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const token = signAccessToken({ sub: guest.id, email: guest.email, role: 'guest' })
    res.json({
      token,
      user: { id: guest.id, email: guest.email, firstName: guest.firstName, lastName: guest.lastName },
    })
  } catch (err) {
    next(err)
  }
}

export async function getGuestProfile(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const { verifyAccessToken } = await import('../../utils/jwt')
    const payload = verifyAccessToken(authHeader.slice(7))
    if (payload.role !== 'guest') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const guest = await prisma.guest.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
    })
    if (!guest) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user: guest })
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
