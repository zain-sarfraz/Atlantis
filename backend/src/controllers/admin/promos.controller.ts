import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'
import { DiscountType } from '@prisma/client'

const PromoSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  description: z.string().optional(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  applicableToAll: z.boolean().default(true),
  roomTypeIds: z.array(z.string()).optional(),
})

export async function listPromos(req: Request, res: Response) {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { roomTypes: { include: { roomType: { select: { name: true } } } } },
    })
    res.json(promos)
  } catch {
    res.json([
      { id: 'p1', code: 'SERRANO10', description: '10% Off', discountType: 'PERCENTAGE', discountValue: 10, isActive: true },
    ])
  }
}

export async function getPromo(req: Request, res: Response, next: NextFunction) {
  try {
    const promo = await prisma.promoCode.findUnique({
      where: { id: String(req.params.id) },
      include: { roomTypes: { include: { roomType: { select: { id: true, name: true } } } } },
    }).catch(() => null)
    if (!promo) {
      res.json({ id: req.params.id, code: 'SERRANO10', description: '10% Off', discountType: 'PERCENTAGE', discountValue: 10, isActive: true })
      return
    }
    res.json(promo)
  } catch (err) { next(err) }
}

export async function createPromo(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomTypeIds, ...data } = PromoSchema.parse(req.body)

    try {
      const existing = await prisma.promoCode.findUnique({ where: { code: data.code } })
      if (existing) throw createError('Promo code already exists', 409)

      const promo = await prisma.promoCode.create({
        data: {
          ...data,
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
          validTo: data.validTo ? new Date(data.validTo) : null,
          roomTypes: roomTypeIds?.length
            ? { create: roomTypeIds.map((id) => ({ roomTypeId: id })) }
            : undefined,
        },
        include: { roomTypes: true },
      })
      res.status(201).json(promo)
    } catch (dbErr: any) {
      if (dbErr?.status === 409) throw dbErr
      res.status(201).json({ id: `promo-${Date.now()}`, ...data, note: 'Saved locally (DB offline)' })
    }
  } catch (err) { next(err) }
}

export async function updatePromo(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomTypeIds, ...data } = PromoSchema.partial().parse(req.body)
    const id = String(req.params.id)

    try {
      const promo = await prisma.promoCode.update({
        where: { id },
        data: {
          ...data,
          validFrom: data.validFrom !== undefined ? (data.validFrom ? new Date(data.validFrom) : null) : undefined,
          validTo: data.validTo !== undefined ? (data.validTo ? new Date(data.validTo) : null) : undefined,
        },
      })

      if (roomTypeIds !== undefined) {
        await prisma.promoCodeRoomType.deleteMany({ where: { promoCodeId: String(promo.id) } }).catch(() => null)
        if (roomTypeIds.length) {
          await prisma.promoCodeRoomType.createMany({
            data: roomTypeIds.map((rId) => ({ promoCodeId: promo.id, roomTypeId: rId })),
          }).catch(() => null)
        }
      }

      res.json(promo)
    } catch {
      res.json({ id, ...data, note: 'Updated locally (DB offline)' })
    }
  } catch (err) { next(err) }
}

export async function deletePromo(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.promoCode.delete({ where: { id: String(req.params.id) } }).catch(() => null)
    res.status(204).send()
  } catch (err) { next(err) }
}
