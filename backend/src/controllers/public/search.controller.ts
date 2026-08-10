import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { getAvailableRoomTypes, getAverageNightlyRate } from '../../services/availability.service'
import { convertForDisplay, getAllRates } from '../../services/currency.service'
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
 * When LODGIFY_PROPERTY_ID is set, only that villa is returned — always included so the
 * guest UI can show rates even if the selected dates are sold out.
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
    const availableSet = new Set(availableIds)
    const rates = await getAllRates()
    const currencyRate = rates[query.currency] ?? 1

    // Always include the configured Limiria villa so the listing never disappears
    const villa = await prisma.roomType.findFirst({
      where: {
        isActive: true,
        OR: [
          ...(env.lodgifyPropertyId != null
            ? [{ lodgifyPropertyId: env.lodgifyPropertyId }]
            : []),
          { slug: 'limiria-villa-zanzibar' },
          { name: { contains: 'Limiria' } },
        ],
      },
      select: { id: true },
    })

    const roomIdSet = new Set(availableIds)
    if (villa) roomIdSet.add(villa.id)

    // Single-villa mode: only return the Limiria property room types
    const roomFilter =
      env.lodgifyPropertyId != null
        ? {
            isActive: true as const,
            lodgifyPropertyId: env.lodgifyPropertyId,
            id: villa ? { in: [villa.id] } : { in: [] as string[] },
          }
        : {
            isActive: true as const,
            id: { in: [...roomIdSet] },
          }

    const categories = await prisma.roomCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        rooms: {
          where: roomFilter,
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
            available: availableSet.has(room.id),
            ratePlans: await Promise.all(
              room.ratePlans.map(async (plan) => {
                const avgNightlyRate = await getAverageNightlyRate(plan.id, checkIn, checkOut)
                const breakdown = computeBreakdown(avgNightlyRate, nights)
                const ratesMap = { [query.currency]: currencyRate, AED: 1 }
                const convertedRate = convertForDisplay(avgNightlyRate, query.currency, ratesMap)
                const convertedBreakdown = {
                  nightlyRate: convertedRate,
                  nights,
                  subtotal: convertForDisplay(breakdown.subtotal, query.currency, ratesMap),
                  serviceCharge: convertForDisplay(breakdown.serviceCharge, query.currency, ratesMap),
                  municipalityFee: convertForDisplay(breakdown.municipalityFee, query.currency, ratesMap),
                  vat: convertForDisplay(breakdown.vat, query.currency, ratesMap),
                  total: convertForDisplay(breakdown.total, query.currency, ratesMap),
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
