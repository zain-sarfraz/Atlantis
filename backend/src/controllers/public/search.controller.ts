import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { getAvailableRoomTypes, getAverageNightlyRate } from '../../services/availability.service'
import { getAllRates } from '../../services/currency.service'
import { computeBreakdown, nightsBetween, parseDate } from '../../utils/pricing'
import { BoardType } from '@prisma/client'

const SearchSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(20).default(2),
  children: z.coerce.number().int().min(0).max(10).default(0),
  rooms: z.coerce.number().int().min(1).max(10).default(1),
  currency: z.enum(['AED', 'USD', 'EUR', 'GBP']).default('AED'),
  promoCode: z.string().optional(),
})

/** Map DB enum values to frontend display strings */
const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  ROOM_ONLY: 'Room Only',
  BED_AND_BREAKFAST: 'Bed & Breakfast',
  HALF_BOARD: 'Half Board',
  FULL_BOARD: 'Full Board',
}

const BED_TYPE_LABELS: Record<string, string> = {
  KING: 'King',
  QUEEN: 'Queen',
  TWIN: 'Twin',
  SOFA_BED: 'Sofa Bed',
}

const VIEW_TYPE_LABELS: Record<string, string> = {
  OCEAN: 'Ocean',
  PALM: 'Palm',
  GARDEN: 'Garden',
  CITY: 'City',
  POOL: 'Pool',
}

/**
 * GET /api/search
 * Returns available room categories + room types with rate plans and computed prices.
 */
export async function searchAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const query = SearchSchema.parse(req.query)
    const checkIn = parseDate(query.checkIn)
    const checkOut = parseDate(query.checkOut)

    if (checkIn >= checkOut) {
      res.status(400).json({ error: 'checkOut must be after checkIn' })
      return
    }

    const nights = nightsBetween(checkIn, checkOut)
    const availableIds = await getAvailableRoomTypes(checkIn, checkOut)
    const rates = await getAllRates()
    const currencyRate = rates[query.currency] ?? 1

    const categories = await prisma.roomCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        rooms: {
          where: { isActive: true, id: { in: availableIds } },
          orderBy: { displayOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            amenities: { orderBy: { sortOrder: 'asc' } },
            ratePlans: { where: { isActive: true }, orderBy: { basePrice: 'asc' } },
          },
        },
      },
    })

    // Enrich with effective pricing
    const enriched = await Promise.all(
      categories.map(async (cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        rooms: await Promise.all(
          cat.rooms.map(async (room) => ({
            id: room.id,
            name: room.name,
            slug: room.slug,
            bedType: BED_TYPE_LABELS[room.bedType] ?? room.bedType,
            view: VIEW_TYPE_LABELS[room.viewType] ?? room.viewType,
            maxOccupancy: room.maxOccupancy,
            sizeSqm: room.sizeSqm,
            description: room.description,
            image: room.mainImage ?? room.images[0]?.url ?? '',
            gallery: room.images.map((img) => img.url),
            amenities: room.amenities.filter((a) => a.category === 'AMENITY').map((a) => a.name),
            perks: room.amenities.filter((a) => a.category === 'PERK').map((a) => a.name),
            ratePlans: await Promise.all(
              room.ratePlans.map(async (plan) => {
                const avgNightlyRate = await getAverageNightlyRate(plan.id, checkIn, checkOut)
                const breakdown = computeBreakdown(avgNightlyRate, nights)
                const convertedRate = Math.round(avgNightlyRate * currencyRate)
                const convertedBreakdown = {
                  nightlyRate: convertedRate,
                  nights,
                  subtotal: Math.round(breakdown.subtotal * currencyRate),
                  serviceCharge: Math.round(breakdown.serviceCharge * currencyRate),
                  municipalityFee: Math.round(breakdown.municipalityFee * currencyRate),
                  vat: Math.round(breakdown.vat * currencyRate),
                  total: Math.round(breakdown.total * currencyRate),
                }
                return {
                  id: plan.id,
                  name: BOARD_TYPE_LABELS[plan.name],
                  description: plan.description ?? '',
                  nightlyRate: convertedRate,
                  breakdown: convertedBreakdown,
                  currency: query.currency,
                }
              }),
            ),
          })),
        ),
      })),
    )

    res.json({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      nights,
      adults: query.adults,
      children: query.children,
      rooms: query.rooms,
      currency: query.currency,
      categories: enriched.filter((c) => c.rooms.length > 0),
    })
  } catch (err) {
    next(err)
  }
}
