import type { RoomCategory, SubRoom } from '../types'

export const VILLA_DISPLAY_NAME = 'Limiria Villa Zanzibar'

/** Sharp hero banner — daytime villa exterior (HD variants in /villa/). */
export const VILLA_HERO_IMAGE = '/villa/villa-banner-hd.jpg'
export const VILLA_HERO_IMAGE_2X = '/villa/villa-banner-2x.jpg'
export const VILLA_HERO_IMAGE_FALLBACK = '/villa/villa-banner.png'

/** Palm King room copy, adapted for the villa listing. */
export const VILLA_DESCRIPTION =
  'Overlook the iconic palm fronds from a refined private villa of calm neutrals and soft natural light - pool deck, open lounges, and the entire home reserved for your stay.'

/**
 * Limiria Villa gallery — local property photos + Booking.com listing shots.
 */
export const VILLA_GALLERY = [
  VILLA_HERO_IMAGE,
  '/villa/villa-pool.png',
  '/villa/villa-gate.png',
  '/villa/villa-bcom-1.jpg',
  '/villa/villa-bcom-2.jpg',
  'https://cf.bstatic.com/xdata/images/hotel/max1024x768/239223573.jpg?k=5a18f0975ec63d220e101c7b90efae0af30bc373d1bd005313a6e2de34909086&o=',
  'https://cf.bstatic.com/xdata/images/hotel/max1024x768/434673065.jpg?k=85bdacc3d9122fa94bf4d4d558801b527243ee77f46028ebef9553b2a51ccf61&o=',
] as const

/** @deprecated use VILLA_GALLERY */
export const VILLA_GALLERY_FALLBACK = VILLA_GALLERY

/** Prefer Limiria / Palm King (Lodgify 714507). Do not fall back to other hotel rooms. */
export function pickVillaRoom(categories: RoomCategory[]): SubRoom | null {
  const rooms = categories.flatMap((c) => c.rooms)
  return (
    rooms.find(
      (r) =>
        /limiria/i.test(r.name) ||
        /palm/i.test(r.name) ||
        /zanzibar/i.test(r.name),
    ) ?? null
  )
}

/** Always show Limiria villa photos first; ignore generic hotel room images. */
export function buildVillaGallery(_room?: SubRoom): string[] {
  return [...VILLA_GALLERY]
}
