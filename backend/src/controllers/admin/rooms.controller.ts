import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { createError } from '../../middleware/error'
import { slugify } from '../../utils/slugify'
import { BedType, ViewType } from '@prisma/client'

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(req: Request, res: Response) {
  try {
    const cats = await prisma.roomCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { rooms: true } } },
    })
    res.json(cats)
  } catch {
    res.json([
      { id: 'cat-king', name: 'King Rooms', slug: 'king-rooms', displayOrder: 0, _count: { rooms: 1 } },
    ])
  }
}

const CategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
})

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'category'
  let n = 2
  for (;;) {
    const existing = await prisma.roomCategory.findUnique({ where: { slug }, select: { id: true } }).catch(() => null)
    if (!existing || (excludeId && existing.id === excludeId)) return slug
    slug = `${base}-${n++}`
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CategorySchema.parse(req.body)
    const slug = await uniqueCategorySlug(slugify(data.name))
    const cat = await prisma.roomCategory.create({ data: { ...data, slug } })
    res.status(201).json(cat)
  } catch (err) { next(err) }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CategorySchema.partial().parse(req.body)
    const updates: Record<string, unknown> = { ...data }
    const id = String(req.params.id)
    if (data.name) updates.slug = await uniqueCategorySlug(slugify(data.name), id)
    const cat = await prisma.roomCategory.update({ where: { id }, data: updates })
    res.json(cat)
  } catch (err) { next(err) }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const rooms = await prisma.roomType.findMany({ where: { categoryId: id }, select: { id: true } }).catch(() => [])
    const roomIds = rooms.map((r) => r.id)
    if (roomIds.length) {
      const bookingCount = await prisma.bookingItem.count({ where: { roomTypeId: { in: roomIds } } }).catch(() => 0)
      if (bookingCount > 0) {
        throw createError('Cannot delete this category because its rooms are used in bookings.', 409)
      }
    }
    await prisma.roomCategory.delete({ where: { id } })
    res.status(204).send()
  } catch (err) { next(err) }
}

// ─── Room Types ───────────────────────────────────────────────────────────────

export async function listRoomTypes(req: Request, res: Response) {
  try {
    const { categoryId, isActive } = req.query
    const rooms = await prisma.roomType.findMany({
      where: {
        ...(categoryId ? { categoryId: String(categoryId) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
        ratePlans: { where: { isActive: true }, orderBy: { basePrice: 'asc' } },
      },
    })
    res.json(rooms)
  } catch {
    res.json([
      {
        id: 'room-limiria-villa',
        name: 'Limiria Villa Zanzibar',
        slug: 'limiria-villa-zanzibar',
        bedType: 'KING',
        viewType: 'PALM',
        maxOccupancy: 2,
        sizeSqm: 42,
        description: 'Private villa in Zanzibar',
        mainImage: '/villa/villa-pool.png',
        isActive: true,
        category: { id: 'cat-king', name: 'King Rooms' },
        images: [{ id: 'img-1', url: '/villa/villa-pool.png', sortOrder: 1 }],
        amenities: [{ id: 'am-1', name: 'Private Pool', category: 'AMENITY', sortOrder: 0 }],
        ratePlans: [{ id: 'plan-1', name: 'ROOM_ONLY', basePrice: 380, isActive: true }],
      },
    ])
  }
}

export async function getRoomType(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await prisma.roomType.findUnique({
      where: { id: String(req.params.id) },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
        ratePlans: { orderBy: { basePrice: 'asc' } },
      },
    })
    if (!room) throw createError('Room type not found', 404)
    res.json(room)
  } catch (err) { next(err) }
}

const RoomTypeSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  bedType: z.nativeEnum(BedType),
  maxOccupancy: z.coerce.number().int().min(1),
  sizeSqm: z.coerce.number().positive('Size must be greater than 0'),
  viewType: z.nativeEnum(ViewType),
  description: z.string().optional().default(''),
  mainImage: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
  lodgifyPropertyId: z.coerce.number().int().positive().nullable().optional(),
  lodgifyRoomTypeId: z.coerce.number().int().positive().nullable().optional(),
  amenities: z.array(z.object({ name: z.string(), category: z.enum(['AMENITY', 'PERK']), sortOrder: z.number().int().default(0) })).optional(),
})

async function uniqueRoomSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'room'
  let n = 2
  for (;;) {
    const existing = await prisma.roomType.findUnique({ where: { slug }, select: { id: true } })
    if (!existing || (excludeId && existing.id === excludeId)) return slug
    slug = `${base}-${n++}`
  }
}

export async function createRoomType(req: Request, res: Response, next: NextFunction) {
  try {
    const { amenities, ...data } = RoomTypeSchema.parse(req.body)
    const category = await prisma.roomCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } })
    if (!category) throw createError('Category not found', 400)

    const slug = await uniqueRoomSlug(slugify(data.name))

    const room = await prisma.roomType.create({
      data: {
        ...data,
        slug,
        amenities: amenities ? { create: amenities } : undefined,
      },
      include: { amenities: true },
    })
    res.status(201).json(room)
  } catch (err) { next(err) }
}

export async function updateRoomType(req: Request, res: Response, next: NextFunction) {
  try {
    const { amenities, ...data } = RoomTypeSchema.partial().parse(req.body)
    const updates: Record<string, unknown> = { ...data }
    const id = String(req.params.id)
    if (data.name) updates.slug = await uniqueRoomSlug(slugify(data.name), id)

    const room = await prisma.roomType.update({
      where: { id },
      data: updates,
    })

    if (amenities) {
      await prisma.roomAmenity.deleteMany({ where: { roomTypeId: room.id } })
      await prisma.roomAmenity.createMany({ data: amenities.map((a) => ({ ...a, roomTypeId: room.id })) })
    }

    res.json(await prisma.roomType.findUnique({
      where: { id: room.id },
      include: { amenities: { orderBy: { sortOrder: 'asc' } }, images: true, ratePlans: true },
    }))
  } catch (err) { next(err) }
}

export async function deleteRoomType(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const bookingCount = await prisma.bookingItem.count({ where: { roomTypeId: id } })
    if (bookingCount > 0) {
      throw createError('Cannot delete this room type because it is used in existing bookings. Deactivate it instead.', 409)
    }
    await prisma.roomType.delete({ where: { id } })
    res.status(204).send()
  } catch (err) { next(err) }
}

// ─── Room Images ──────────────────────────────────────────────────────────────

export async function addRoomImage(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file
    if (!file) throw createError('No file uploaded', 400)

    const imageUrl = `/uploads/${file.filename}`
    const alt = req.body.alt ?? ''
    const sortOrder = parseInt(req.body.sortOrder ?? '0', 10)

    const roomTypeId = String(req.params.id)
    const image = await prisma.roomImage.create({
      data: { roomTypeId, url: imageUrl, alt, sortOrder },
    })

    // Set as mainImage if first
    const room = await prisma.roomType.findUnique({ where: { id: roomTypeId } })
    if (!room?.mainImage) {
      await prisma.roomType.update({ where: { id: roomTypeId }, data: { mainImage: imageUrl } })
    }

    res.status(201).json(image)
  } catch (err) { next(err) }
}

export async function deleteRoomImage(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.roomImage.delete({ where: { id: String(req.params.imageId) } })
    res.status(204).send()
  } catch (err) { next(err) }
}

// ─── Rate Plans ───────────────────────────────────────────────────────────────

import { BoardType } from '@prisma/client'

const RatePlanSchema = z.object({
  name: z.nativeEnum(BoardType),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  isActive: z.boolean().default(true),
})

export async function listRatePlans(req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.ratePlan.findMany({
      where: { roomTypeId: String(req.params.roomTypeId) },
      orderBy: { basePrice: 'asc' },
    })
    res.json(plans)
  } catch (err) { next(err) }
}

export async function createRatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const data = RatePlanSchema.parse(req.body)
    const plan = await prisma.ratePlan.create({ data: { ...data, roomTypeId: String(req.params.roomTypeId) } })
    res.status(201).json(plan)
  } catch (err) { next(err) }
}

export async function updateRatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const data = RatePlanSchema.partial().parse(req.body)
    const plan = await prisma.ratePlan.update({ where: { id: String(req.params.id) }, data })
    res.json(plan)
  } catch (err) { next(err) }
}

export async function deleteRatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const bookingCount = await prisma.bookingItem.count({ where: { ratePlanId: id } })
    if (bookingCount > 0) {
      throw createError('Cannot delete this rate plan because it is used in existing bookings.', 409)
    }
    await prisma.ratePlan.delete({ where: { id } })
    res.status(204).send()
  } catch (err) { next(err) }
}

// ─── Price Overrides ──────────────────────────────────────────────────────────

const PriceOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().positive(),
})

export async function listPriceOverrides(req: Request, res: Response, next: NextFunction) {
  try {
    const overrides = await prisma.priceOverride.findMany({
      where: { ratePlanId: String(req.params.id) },
      orderBy: { date: 'asc' },
    })
    res.json(overrides)
  } catch (err) { next(err) }
}

export async function upsertPriceOverride(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, price } = PriceOverrideSchema.parse(req.body)
    const d = new Date(date)
    const ratePlanId = String(req.params.id)
    const override = await prisma.priceOverride.upsert({
      where: { ratePlanId_date: { ratePlanId, date: d } },
      update: { price },
      create: { ratePlanId, date: d, price },
    })
    res.json(override)
  } catch (err) { next(err) }
}

export async function deletePriceOverride(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.priceOverride.delete({ where: { id: String(req.params.overrideId) } })
    res.status(204).send()
  } catch (err) { next(err) }
}
