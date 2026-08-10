export type BedType = 'King' | 'Queen' | 'Twin' | 'Sofa Bed'
export type ViewType = 'Ocean' | 'Palm' | 'Garden' | 'City' | 'Pool'
export type BoardType =
  | 'Room Only'
  | 'Bed & Breakfast'
  | 'Half Board'
  | 'Full Board'

export interface RatePlan {
  id: string
  name: BoardType | string
  nightlyRate: number
  description: string
}

export interface SubRoom {
  id: string
  name: string
  bedType: BedType | string
  view: ViewType | string
  maxOccupancy: number
  sizeSqm: number
  description: string
  image: string
  gallery: string[]
  amenities: string[]
  perks: string[]
  ratePlans: RatePlan[]
  /** False when selected dates are sold out (villa still listed). */
  available?: boolean
}

export interface RoomCategory {
  id: string
  name: string
  rooms: SubRoom[]
}

export interface GuestsState {
  adults: number
  children: number
  rooms: number
  /** Age per child (0–13). Length matches `children`. */
  childAges: (number | null)[]
}

export interface DateRange {
  checkIn: Date | null
  checkOut: Date | null
}

export interface CartItem {
  id: string
  roomId: string
  roomName: string
  categoryName: string
  ratePlanId: string
  ratePlanName: string
  image: string
  nightlyRate: number
  checkIn: string
  checkOut: string
  nights: number
  breakdown: PriceBreakdown
}

export interface ConfirmedBooking extends CartItem {
  confirmedAt: string
  status: 'confirmed'
}

export interface PriceBreakdown {
  nightlyRate: number
  nights: number
  subtotal: number
  serviceCharge: number
  municipalityFee: number
  vat: number
  total: number
}

export interface FiltersState {
  bedTypes: BedType[]
  views: ViewType[]
  priceMin: number
  priceMax: number
}

export type SortOption = 'lowest' | 'highest'

export type ListView = 'rooms' | 'rates'

export type Currency = 'AED' | 'USD' | 'EUR' | 'GBP'
