import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'
import { AdminRole } from '@prisma/client'

const StaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(AdminRole).default(AdminRole.CONTENT_EDITOR),
  isActive: z.boolean().default(true),
})

export async function listStaff(req: Request, res: Response) {
  try {
    const staff = await prisma.adminUser.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(staff)
  } catch {
    res.json([
      { id: 'admin-super-id', email: 'admin@admin.com', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', isActive: true, createdAt: new Date().toISOString() },
    ])
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { password, ...data } = StaffSchema.parse(req.body)

    const existing = await prisma.adminUser.findUnique({ where: { email: data.email } }).catch(() => null)
    if (existing) throw createError('Email already exists', 409)

    const hashedPassword = await bcrypt.hash(password, 12)
    const staff = await prisma.adminUser.create({
      data: { ...data, password: hashedPassword },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    })
    res.status(201).json(staff)
  } catch (err) { next(err) }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { password, ...data } = StaffSchema.partial().parse(req.body)

    // Only SUPER_ADMIN can change roles
    if (data.role && req.admin?.role !== AdminRole.SUPER_ADMIN) {
      throw createError('Only super admins can change roles', 403)
    }

    const updates: Record<string, unknown> = { ...data }
    if (password) updates.password = await bcrypt.hash(password, 12)

    const staff = await prisma.adminUser.update({
      where: { id: String(req.params.id) },
      data: updates,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })
    res.json(staff)
  } catch (err) { next(err) }
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    if (id === req.admin?.id) throw createError('Cannot delete your own account', 400)
    await prisma.adminUser.delete({ where: { id } })
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function listAlerts(req: Request, res: Response) {
  try {
    const alerts = await prisma.hotelAlert.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json(alerts)
  } catch {
    res.json([
      { id: '1', title: 'Pool Notice', message: 'Lagoon pool open daily 8 AM - 8 PM.', isActive: true, sortOrder: 0 },
    ])
  }
}

const AlertSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function createAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = AlertSchema.parse(req.body)
    const alert = await prisma.hotelAlert.create({ data })
    res.status(201).json(alert)
  } catch (err) { next(err) }
}

export async function updateAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = AlertSchema.partial().parse(req.body)
    const alert = await prisma.hotelAlert.update({ where: { id: String(req.params.id) }, data })
    res.json(alert)
  } catch (err) { next(err) }
}

export async function deleteAlert(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.hotelAlert.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  } catch (err) { next(err) }
}
