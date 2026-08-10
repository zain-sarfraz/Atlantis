import type { Prisma } from '@prisma/client'
import { env } from '../config/env'

/** Prisma filter: bookings belonging to LODGIFY_PROPERTY_ID (via room type mapping). */
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
      { roomType: { lodgifyPropertyId: env.lodgifyPropertyId } },
    ],
  }
}

export function scopedLodgifyPropertyId(): number | undefined {
  return env.lodgifyPropertyId ?? undefined
}
