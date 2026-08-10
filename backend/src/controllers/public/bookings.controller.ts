import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { computeBreakdown, nightsBetween, parseDate, generateBookingRef } from '../../utils/pricing'
import { adjustAvailability, getAverageNightlyRate } from '../../services/availability.service'
import { validatePromoCode, applyPromoDiscount, incrementPromoUsage } from '../../services/promo.service'
import { createBookingInLodgify } from '../../services/lodgifyService'
import { isLodgifyConfigured } from '../../config/lodgify'
import { createError } from '../../middleware/error'

const CartItemSchema = z.object({
  roomTypeId: z.string(),
  ratePlanId: z.string(),
})

const CreateBookingSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  roomsCount: z.number().int().min(1).default(1),
  currency: z.enum(['AED', 'USD', 'EUR', 'GBP']).default('AED'),
  promoCode: z.string().optional(),
  items: z.array(CartItemSchema).min(1),
  // Guest info
  guestPrefix: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  country: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  specialRequests: z.string().optional(),
  newsletter: z.boolean().default(false),
})

/** POST /api/bookings — create a booking */
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateBookingSchema.parse(req.body)
    const checkIn = parseDate(data.checkIn)
    const checkOut = parseDate(data.checkOut)

    if (checkIn >= checkOut) throw createError('checkOut must be after checkIn', 400)

    const nights = nightsBetween(checkIn, checkOut)

    // Validate all room types and rate plans exist
    const itemDetails = await Promise.all(
      data.items.map(async (item) => {
        const roomType = await prisma.roomType.findUnique({ where: { id: item.roomTypeId } })
        if (!roomType || !roomType.isActive) throw createError(`Room type not found: ${item.roomTypeId}`, 400)

        const ratePlan = await prisma.ratePlan.findUnique({ where: { id: item.ratePlanId } })
        if (!ratePlan || !ratePlan.isActive) throw createError(`Rate plan not found: ${item.ratePlanId}`, 400)
        if (ratePlan.roomTypeId !== item.roomTypeId) throw createError('Rate plan does not belong to room type', 400)

        const nightlyRate = await getAverageNightlyRate(item.ratePlanId, checkIn, checkOut)
        const breakdown = computeBreakdown(nightlyRate, nights)

        return { roomType, ratePlan, nightlyRate, breakdown }
      }),
    )

    // Validate promo code
    let promoResult: Awaited<ReturnType<typeof validatePromoCode>> | null = null
    if (data.promoCode?.trim()) {
      promoResult = await validatePromoCode(data.promoCode.trim(), data.items[0]?.roomTypeId)
    }

    // Calculate total
    let totalAmount = itemDetails.reduce((sum, d) => sum + d.breakdown.total, 0)
    if (promoResult) {
      totalAmount = applyPromoDiscount(totalAmount, promoResult.discountType, promoResult.discountValue)
    }

    // Upsert guest
    const guest = await prisma.guest.upsert({
      where: { email: data.email },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        country: data.country,
        city: data.city,
        newsletter: data.newsletter,
      },
      create: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        prefix: data.guestPrefix,
        phone: data.phone,
        country: data.country,
        city: data.city,
        newsletter: data.newsletter,
      },
    })

    // Generate unique booking reference
    let bookingRef: string
    do {
      bookingRef = generateBookingRef()
    } while (await prisma.booking.findUnique({ where: { bookingRef } }))

    // Create booking + items in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          bookingRef,
          guestId: guest.id,
          promoCodeId: promoResult?.promoCodeId,
          currency: data.currency,
          status: 'CONFIRMED',
          totalAmount,
          checkIn,
          checkOut,
          adults: data.adults,
          children: data.children,
          roomsCount: data.roomsCount,
          guestPrefix: data.guestPrefix,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          country: data.country,
          city: data.city,
          zipCode: data.zipCode,
          specialRequests: data.specialRequests,
          newsletter: data.newsletter,
          confirmedAt: new Date(),
          items: {
            create: itemDetails.map((d) => ({
              roomTypeId: d.roomType.id,
              ratePlanId: d.ratePlan.id,
              nightlyRate: d.nightlyRate,
              nights,
              subtotal: d.breakdown.subtotal,
              serviceCharge: d.breakdown.serviceCharge,
              municipalityFee: d.breakdown.municipalityFee,
              vat: d.breakdown.vat,
              total: d.breakdown.total,
            })),
          },
        },
        include: { items: { include: { roomType: { include: { category: true } }, ratePlan: true } } },
      })
      return b
    })

    // Reduce inventory
    await Promise.all(
      data.items.map((item) => adjustAvailability(item.roomTypeId, checkIn, checkOut, -1)),
    )

    // Increment promo usage
    if (promoResult) await incrementPromoUsage(promoResult.promoCodeId)

    // Push to Lodgify so OTAs block dates — never fail the local booking if this errors
    if (isLodgifyConfigured()) {
      try {
        for (const d of itemDetails) {
          const propertyId = d.roomType.lodgifyPropertyId
          const lodgifyRoomTypeId = d.roomType.lodgifyRoomTypeId
          if (!propertyId || !lodgifyRoomTypeId) {
            console.warn(
              `[Lodgify] Skipping push for room ${d.roomType.id} — lodgifyPropertyId/lodgifyRoomTypeId not mapped`,
            )
            continue
          }

          const lodgifyResult = await createBookingInLodgify({
            propertyId,
            roomTypeId: lodgifyRoomTypeId,
            arrival: data.checkIn,
            departure: data.checkOut,
            guestName: `${data.firstName} ${data.lastName}`.trim(),
            guestEmail: data.email,
            guestPhone: data.phone,
            adults: data.adults,
            children: data.children,
            status: 'booked',
            source: 'Websites',
            notes: data.specialRequests,
            totalAmount: d.breakdown.total,
            currency: data.currency,
          })

          // Persist Lodgify id on first successful push (idempotency for future syncs)
          if (!booking.lodgifyBookingId) {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { lodgifyBookingId: String(lodgifyResult.id), lodgifySource: 'Websites' },
            })
          }
        }
      } catch (lodgifyErr) {
        console.error(
          '[Lodgify] Failed to push booking after local save (local booking still valid):',
          lodgifyErr instanceof Error ? lodgifyErr.message : lodgifyErr,
        )
      }
    }

    res.status(201).json({ booking, bookingRef: booking.bookingRef })
  } catch (err) {
    next(err)
  }
}

/** GET /api/bookings/:ref — retrieve booking by reference */
export async function getBookingByRef(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingRef: String(req.params.ref).toUpperCase() },
      include: {
        items: {
          include: {
            roomType: { include: { category: true, images: { take: 1 } } },
            ratePlan: true,
          },
        },
        promoCode: { select: { code: true, discountType: true, discountValue: true } },
      },
    })

    if (!booking) throw createError('Booking not found', 404)
    res.json(booking)
  } catch (err) {
    next(err)
  }
}

/** POST /api/bookings/validate-promo — validate a promo code */
export async function validatePromo(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, roomTypeId } = z.object({
      code: z.string().min(1),
      roomTypeId: z.string().optional(),
    }).parse(req.body)

    const result = await validatePromoCode(code, roomTypeId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** GET /api/bookings/guest/:email — guest booking history (requires email) */
export async function getGuestBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse({ email: req.params.email })
    const bookings = await prisma.booking.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            roomType: { select: { name: true, mainImage: true } },
            ratePlan: { select: { name: true } },
          },
        },
      },
    })
    res.json(bookings)
  } catch (err) {
    next(err)
  }
}
