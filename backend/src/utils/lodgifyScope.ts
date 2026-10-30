import type { Prisma } from '@prisma/client'
import { env } from '../config/env'

/**
 * Prisma filter: only bookings for LODGIFY_PROPERTY_ID (Limiria Villa = 714507).
 * Requires a booking item mapped to that Lodgify property — no null/empty leakage.
 */
export function scopedBookingWhere(
  extra: Prisma.BookingWhereInput = {},
): Prisma.BookingWhereInput {
  if (env.lodgifyPropertyId == null) return extra
  return {
    AND: [
      extra,
      {
        items: {
          some: {
            roomType: { lodgifyPropertyId: env.lodgifyPropertyId },
          },
        },
      },
    ],
  }
}

/** Prisma filter for BookingItem queries scoped to the configured Lodgify property. */
export function scopedBookingItemWhere(
  extra: Prisma.BookingItemWhereInput = {},
): Prisma.BookingItemWhereInput {
  if (env.lodgifyPropertyId == null) return extra
  return {
    AND: [
      extra,
      {
        roomType: { lodgifyPropertyId: env.lodgifyPropertyId },
      },
    ],
  }
}

export function scopedLodgifyPropertyId(): number | undefined {
  return env.lodgifyPropertyId ?? undefined
}
