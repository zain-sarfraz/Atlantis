import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt'
import { createError } from '../../middleware/error'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = LoginSchema.parse(req.body)

    const admin = await prisma.adminUser.findUnique({ where: { email } })
    if (!admin || !admin.isActive) throw createError('Invalid credentials', 401)

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) throw createError('Invalid credentials', 401)

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLogin: new Date() } })

    const payload = { sub: admin.id, email: admin.email, role: admin.role }
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      admin: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role },
    })
  } catch (err) {
    next(err)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body)
    const payload = verifyRefreshToken(token)
    if (payload.type !== 'refresh') throw createError('Invalid token type', 401)

    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } })
    if (!admin || !admin.isActive) throw createError('Account not found or disabled', 401)

    const base = { sub: admin.id, email: admin.email, role: admin.role }
    res.json({ accessToken: signAccessToken(base) })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await prisma.adminUser.findUniqueOrThrow({
      where: { id: req.admin!.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, lastLogin: true },
    })
    res.json(admin)
  } catch (err) {
    next(err)
  }
}
