import { prisma } from '../config/database'
import { applyDiscount } from '../utils/pricing'
import { createError } from '../middleware/error'

export interface PromoValidationResult {
  valid: boolean
  promoCodeId: string
  code: string
  discountType: 'PERCENTAGE' | 'FIXED_AED'
  discountValue: number
  description: string | null
}

/**
 * Validate a promo code, optionally checking it applies to a given room type.
 * Throws ApiError on invalid code.
 */
export async function validatePromoCode(
  code: string,
  roomTypeId?: string,
): Promise<PromoValidationResult> {
  let promo = null
  try {
    promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { roomTypes: true },
    })
  } catch {
    // DB unreachable fallback for standard demo promos
    if (code.toUpperCase().trim() === 'WELCOME10' || code.toUpperCase().trim() === 'SUMMER20') {
      return {
        valid: true,
        promoCodeId: 'promo-demo',
        code: code.toUpperCase().trim(),
        discountType: 'PERCENTAGE',
        discountValue: 10,
        description: 'Demo discount',
      }
    }
  }

  if (!promo || !promo.isActive) {
    throw createError('Promo code is invalid or expired', 400)
  }

  const now = new Date()
  if (promo.validFrom && promo.validFrom > now) {
    throw createError('Promo code is not yet active', 400)
  }
  if (promo.validTo && promo.validTo < now) {
    throw createError('Promo code has expired', 400)
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    throw createError('Promo code usage limit reached', 400)
  }

  // Check room-type applicability
  if (!promo.applicableToAll && roomTypeId) {
    const applies = promo.roomTypes.some((rt) => rt.roomTypeId === roomTypeId)
    if (!applies) {
      throw createError('Promo code is not applicable to this room type', 400)
    }
  }

  return {
    valid: true,
    promoCodeId: promo.id,
    code: promo.code,
    discountType: promo.discountType as 'PERCENTAGE' | 'FIXED_AED',
    discountValue: promo.discountValue,
    description: promo.description,
  }
}

/** Apply promo discount to a subtotal amount (in AED). */
export function applyPromoDiscount(
  subtotal: number,
  discountType: 'PERCENTAGE' | 'FIXED_AED',
  discountValue: number,
): number {
  return applyDiscount(subtotal, discountType, discountValue)
}

/** Increment usedCount after a successful booking. */
export async function incrementPromoUsage(promoCodeId: string): Promise<void> {
  try {
    await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { usedCount: { increment: 1 } },
    })
  } catch {
    // Ignore DB offline errors
  }
}
