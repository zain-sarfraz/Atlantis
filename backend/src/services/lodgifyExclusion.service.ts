import { prisma } from '../config/database'

/** True if this Lodgify booking was deleted in admin and must not be re-imported. */
export async function isLodgifyBookingExcluded(lodgifyBookingId: string): Promise<boolean> {
  const id = lodgifyBookingId?.trim()
  if (!id) return false
  try {
    const row = await prisma.lodgifyBookingExclusion.findUnique({
      where: { lodgifyBookingId: id },
      select: { id: true },
    })
    return Boolean(row)
  } catch {
    return false
  }
}

/** Remember a Lodgify booking id so sync / webhooks skip it after admin delete. */
export async function excludeLodgifyBooking(
  lodgifyBookingId: string | null | undefined,
  bookingRef?: string | null,
): Promise<void> {
  const id = lodgifyBookingId?.trim()
  if (!id) return
  try {
    await prisma.lodgifyBookingExclusion.upsert({
      where: { lodgifyBookingId: id },
      create: {
        lodgifyBookingId: id,
        bookingRef: bookingRef?.slice(0, 20) || null,
      },
      update: {
        bookingRef: bookingRef?.slice(0, 20) || null,
      },
    })
  } catch (err) {
    console.warn('[Lodgify exclusion] failed to record exclusion:', err)
  }
}
