import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type {
  BedType,
  CartItem,
  ConfirmedBooking,
  Currency,
  FiltersState,
  GuestsState,
  RatePlan,
  RoomCategory,
  SortOption,
  ListView,
  SubRoom,
  ViewType,
} from '../types'
import { computeBreakdown, nightsBetween, setCurrencyRates, toISODate } from '../utils/pricing'
import { hotelApi, type ApiRoomCategory } from '../api/client'

interface PendingBooking {
  room: SubRoom
  categoryName: string
  ratePlan: RatePlan
}

interface BookingState {
  guests: GuestsState
  checkIn: Date | null
  checkOut: Date | null
  promoCode: string
  currency: Currency
  cart: CartItem[]
  bookings: ConfirmedBooking[]
  sort: SortOption
  listView: ListView
  filters: FiltersState
  searchApplied: boolean
  pendingBooking: PendingBooking | null
  detailRoom: { room: SubRoom; categoryName: string } | null
  cartOpen: boolean
  alertsDismissed: string[]
  alertsOpen: boolean
  categories: RoomCategory[]
  searchLoading: boolean
  searchError: string
  cartError: string
  hotelAlerts: Array<{ id: string; title: string; message: string }>
}

type Action =
  | { type: 'SET_GUESTS'; guests: Partial<GuestsState> }
  | { type: 'SET_DATES'; checkIn: Date | null; checkOut: Date | null }
  | { type: 'SET_PROMO'; code: string }
  | { type: 'SET_CURRENCY'; currency: Currency }
  | { type: 'APPLY_SEARCH' }
  | { type: 'RESET_SEARCH' }
  | { type: 'SET_SORT'; sort: SortOption }
  | { type: 'SET_LIST_VIEW'; listView: ListView }
  | { type: 'SET_FILTERS'; filters: Partial<FiltersState> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'OPEN_BOOKING'; payload: PendingBooking }
  | { type: 'CLOSE_BOOKING' }
  | { type: 'ADD_TO_CART' }
  | { type: 'REMOVE_FROM_CART'; id: string }
  | { type: 'CLEAR_CART' }
  | { type: 'CONFIRM_CHECKOUT' }
  | { type: 'REMOVE_BOOKING'; id: string }
  | { type: 'TOGGLE_CART'; open?: boolean }
  | { type: 'OPEN_DETAIL'; room: SubRoom; categoryName: string }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'DISMISS_ALERT'; id: string }
  | { type: 'TOGGLE_ALERTS'; open?: boolean }
  | { type: 'SET_SEARCH_LOADING'; loading: boolean }
  | { type: 'SET_SEARCH_RESULTS'; categories: RoomCategory[] }
  | { type: 'SET_SEARCH_ERROR'; error: string }
  | { type: 'SET_CART_ERROR'; error: string }
  | { type: 'SET_HOTEL_ALERTS'; alerts: Array<{ id: string; title: string; message: string }> }

const today = new Date(2026, 7, 1) // Aug 1, 2026
/** First open Limiria night from Lodgify availability */
const defaultCheckIn = new Date(2026, 7, 18) // Aug 18
const defaultCheckOut = new Date(2026, 7, 20) // Aug 20

function mapCategories(apiCats: ApiRoomCategory[]): RoomCategory[] {
  return apiCats
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      rooms: cat.rooms
        .filter((room) => room.ratePlans.length > 0)
        .map((room) => ({
          id: room.id,
          name: room.name,
          bedType: room.bedType,
          view: room.view,
          maxOccupancy: room.maxOccupancy,
          sizeSqm: room.sizeSqm,
          description: room.description,
          image: room.image || '/villa/villa-pool.png',
          gallery: room.gallery?.length ? room.gallery : [room.image || '/villa/villa-pool.png'],
          amenities: room.amenities ?? [],
          perks: room.perks ?? [],
          available: room.available !== false,
          ratePlans: room.ratePlans.map((p) => ({
            id: p.id,
            name: p.name,
            nightlyRate: p.nightlyRate,
            description: p.description,
          })),
        })),
    }))
    .filter((cat) => cat.rooms.length > 0)
}

const initialState: BookingState = {
  guests: { adults: 2, children: 0, rooms: 1, childAges: [] },
  checkIn: defaultCheckIn,
  checkOut: defaultCheckOut,
  promoCode: '',
  currency: 'USD',
  cart: [],
  bookings: [],
  sort: 'lowest',
  listView: 'rooms',
  filters: {
    bedTypes: [],
    views: [],
    priceMin: 0,
    priceMax: 20000,
  },
  searchApplied: true,
  pendingBooking: null,
  detailRoom: null,
  cartOpen: false,
  alertsDismissed: [],
  alertsOpen: false,
  categories: [],
  searchLoading: true,
  searchError: '',
  cartError: '',
  hotelAlerts: [],
}

function reducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case 'SET_GUESTS':
      return { ...state, guests: { ...state.guests, ...action.guests } }
    case 'SET_DATES': {
      const checkIn = action.checkIn
      const checkOut = action.checkOut
      let cart = state.cart
      if (checkIn && checkOut) {
        const nightsCount = nightsBetween(checkIn, checkOut)
        const breakdown = computeBreakdown(1396, nightsCount)
        const defaultCartItem: CartItem = {
          id: `limiria-villa-stay`,
          roomId: 'cmt481dng000ysgh0ofqxz748',
          roomName: 'Limiria Villa Zanzibar',
          categoryName: 'Private Villa',
          ratePlanId: 'cmt481dnn001hsgh0ugjr0ap2',
          ratePlanName: 'Best Available Rate',
          image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
          nightlyRate: 1396,
          checkIn: toISODate(checkIn),
          checkOut: toISODate(checkOut),
          nights: nightsCount,
          breakdown,
        }
        cart = [defaultCartItem]
      }
      return { ...state, checkIn, checkOut, cart, cartError: '' }
    }
    case 'SET_PROMO':
      return { ...state, promoCode: action.code }
    case 'SET_CURRENCY':
      return { ...state, currency: action.currency }
    case 'APPLY_SEARCH':
      return { ...state, searchApplied: true }
    case 'RESET_SEARCH':
      return {
        ...state,
        searchApplied: true,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: { adults: 2, children: 0, rooms: 1, childAges: [] },
        promoCode: '',
      }
    case 'SET_SORT':
      return { ...state, sort: action.sort }
    case 'SET_LIST_VIEW':
      return { ...state, listView: action.listView }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.filters } }
    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: {
          bedTypes: [],
          views: [],
          priceMin: 0,
          priceMax: 20000,
        },
      }
    case 'OPEN_BOOKING':
      return { ...state, pendingBooking: action.payload, cartError: '' }
    case 'CLOSE_BOOKING':
      return { ...state, pendingBooking: null }
    case 'ADD_TO_CART': {
      if (!state.pendingBooking) return state
      if (!state.checkIn || !state.checkOut) {
        return {
          ...state,
          cartError: 'Please select check-in and check-out dates before booking.',
        }
      }
      const { room, categoryName, ratePlan } = state.pendingBooking
      const nightsCount = nightsBetween(state.checkIn, state.checkOut)
      const breakdown = computeBreakdown(ratePlan.nightlyRate, nightsCount)
      const item: CartItem = {
        id: `${room.id}-${ratePlan.id}-${Date.now()}`,
        roomId: room.id,
        roomName: room.name,
        categoryName,
        ratePlanId: ratePlan.id,
        ratePlanName: ratePlan.name,
        image: room.image,
        nightlyRate: ratePlan.nightlyRate,
        checkIn: toISODate(state.checkIn),
        checkOut: toISODate(state.checkOut),
        nights: nightsCount,
        breakdown,
      }
      return {
        ...state,
        cart: [...state.cart, item],
        pendingBooking: null,
        cartError: '',
      }
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((c) => c.id !== action.id),
      }
    case 'CLEAR_CART':
      return { ...state, cart: [], cartOpen: false }
    case 'CONFIRM_CHECKOUT': {
      if (state.cart.length === 0) return state
      const confirmedAt = new Date().toISOString()
      const newBookings: ConfirmedBooking[] = state.cart.map((item) => ({
        ...item,
        confirmedAt,
        status: 'confirmed' as const,
      }))
      return {
        ...state,
        bookings: [...newBookings, ...state.bookings],
        cart: [],
        cartOpen: false,
      }
    }
    case 'REMOVE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.filter((b) => b.id !== action.id),
      }
    case 'TOGGLE_CART':
      return {
        ...state,
        cartOpen: action.open ?? !state.cartOpen,
      }
    case 'OPEN_DETAIL':
      return {
        ...state,
        detailRoom: { room: action.room, categoryName: action.categoryName },
      }
    case 'CLOSE_DETAIL':
      return { ...state, detailRoom: null }
    case 'DISMISS_ALERT':
      return {
        ...state,
        alertsDismissed: [...state.alertsDismissed, action.id],
      }
    case 'TOGGLE_ALERTS':
      return {
        ...state,
        alertsOpen: action.open ?? !state.alertsOpen,
      }
    case 'SET_SEARCH_LOADING':
      return { ...state, searchLoading: action.loading }
    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        categories: action.categories,
        searchLoading: false,
        searchError: '',
      }
    case 'SET_SEARCH_ERROR':
      return {
        ...state,
        searchLoading: false,
        searchError: action.error,
        categories: [],
      }
    case 'SET_CART_ERROR':
      return { ...state, cartError: action.error }
    case 'SET_HOTEL_ALERTS':
      return { ...state, hotelAlerts: action.alerts }
    default:
      return state
  }
}

interface BookingContextValue {
  state: BookingState
  nights: number
  today: Date
  setGuests: (g: Partial<GuestsState>) => void
  setDates: (checkIn: Date | null, checkOut: Date | null) => void
  setPromo: (code: string) => void
  setCurrency: (c: Currency) => void
  applySearch: () => void
  resetSearch: () => void
  setSort: (s: SortOption) => void
  setListView: (v: ListView) => void
  setFilters: (f: Partial<FiltersState>) => void
  clearFilters: () => void
  toggleBedType: (b: BedType) => void
  toggleView: (v: ViewType) => void
  openBooking: (room: SubRoom, categoryName: string, rate: RatePlan) => void
  closeBooking: () => void
  addToCart: () => boolean
  removeFromCart: (id: string) => void
  clearCart: () => void
  confirmCheckout: () => void
  removeBooking: (id: string) => void
  toggleCart: (open?: boolean) => void
  openDetail: (room: SubRoom, categoryName: string) => void
  closeDetail: () => void
  dismissAlert: (id: string) => void
  toggleAlerts: (open?: boolean) => void
  cartCount: number
  cartTotal: number
  bookingsTotal: number
  fromTotal: number | null
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const searchSeq = useRef(0)

  const nights =
    state.checkIn && state.checkOut
      ? nightsBetween(state.checkIn, state.checkOut)
      : 0

  useEffect(() => {
    hotelApi.getAlerts()
      .then((alerts) => dispatch({
        type: 'SET_HOTEL_ALERTS',
        alerts: alerts.map((a) => ({ id: a.id, title: a.title, message: a.message })),
      }))
      .catch(() => {/* keep empty */})

    hotelApi.getCurrency()
      .then((res) => setCurrencyRates(res.rates))
      .catch(() => {/* keep defaults */})
  }, [])

  useEffect(() => {
    if (!state.searchApplied || !state.checkIn || !state.checkOut) return

    const seq = ++searchSeq.current
    dispatch({ type: 'SET_SEARCH_LOADING', loading: true })

    hotelApi
      .search({
        checkIn: toISODate(state.checkIn),
        checkOut: toISODate(state.checkOut),
        adults: state.guests.adults,
        children: state.guests.children,
        rooms: 1,
        currency: state.currency,
        promoCode: state.promoCode || undefined,
      })
      .then((res) => {
        if (seq !== searchSeq.current) return
        dispatch({ type: 'SET_SEARCH_RESULTS', categories: mapCategories(res.categories) })
      })
      .catch((err: unknown) => {
        if (seq !== searchSeq.current) return
        dispatch({
          type: 'SET_SEARCH_ERROR',
          error: (err as Error).message || 'Failed to load villa availability',
        })
      })
  }, [
    state.searchApplied,
    state.checkIn,
    state.checkOut,
    state.currency,
    state.guests.adults,
    state.guests.children,
    state.promoCode,
  ])

  const cartCount = state.cart.length
  const cartTotal = state.cart.reduce((sum, i) => sum + i.breakdown.total, 0)
  const bookingsTotal = state.bookings.reduce(
    (sum, i) => sum + i.breakdown.total,
    0,
  )

  const fromTotal = useMemo(() => {
    if (!nights || state.categories.length === 0) return null
    const rates = state.categories.flatMap((c) =>
      c.rooms.flatMap((r) => r.ratePlans.map((p) => p.nightlyRate)),
    )
    if (!rates.length) return null
    return Math.min(...rates) * nights
  }, [state.categories, nights])

  const value = useMemo<BookingContextValue>(
    () => ({
      state,
      nights,
      today,
      setGuests: (g) =>
        dispatch({ type: 'SET_GUESTS', guests: { ...g, rooms: 1 } }),
      setDates: (checkIn, checkOut) =>
        dispatch({ type: 'SET_DATES', checkIn, checkOut }),
      setPromo: (code) => dispatch({ type: 'SET_PROMO', code }),
      setCurrency: (currency) => dispatch({ type: 'SET_CURRENCY', currency }),
      applySearch: () => dispatch({ type: 'APPLY_SEARCH' }),
      resetSearch: () => dispatch({ type: 'RESET_SEARCH' }),
      setSort: (sort) => dispatch({ type: 'SET_SORT', sort }),
      setListView: (listView) =>
        dispatch({ type: 'SET_LIST_VIEW', listView }),
      setFilters: (filters) => dispatch({ type: 'SET_FILTERS', filters }),
      clearFilters: () => dispatch({ type: 'CLEAR_FILTERS' }),
      toggleBedType: (b) => {
        const current = state.filters.bedTypes
        const bedTypes = current.includes(b)
          ? current.filter((x) => x !== b)
          : [...current, b]
        dispatch({ type: 'SET_FILTERS', filters: { bedTypes } })
      },
      toggleView: (v) => {
        const current = state.filters.views
        const views = current.includes(v)
          ? current.filter((x) => x !== v)
          : [...current, v]
        dispatch({ type: 'SET_FILTERS', filters: { views } })
      },
      openBooking: (room, categoryName, ratePlan) =>
        dispatch({
          type: 'OPEN_BOOKING',
          payload: { room, categoryName, ratePlan },
        }),
      closeBooking: () => dispatch({ type: 'CLOSE_BOOKING' }),
      addToCart: () => {
        if (!state.checkIn || !state.checkOut) {
          dispatch({
            type: 'SET_CART_ERROR',
            error: 'Please select check-in and check-out dates before booking.',
          })
          return false
        }
        dispatch({ type: 'ADD_TO_CART' })
        return true
      },
      removeFromCart: (id) => dispatch({ type: 'REMOVE_FROM_CART', id }),
      clearCart: () => dispatch({ type: 'CLEAR_CART' }),
      confirmCheckout: () => dispatch({ type: 'CONFIRM_CHECKOUT' }),
      removeBooking: (id) => dispatch({ type: 'REMOVE_BOOKING', id }),
      toggleCart: (open) => dispatch({ type: 'TOGGLE_CART', open }),
      openDetail: (room, categoryName) =>
        dispatch({ type: 'OPEN_DETAIL', room, categoryName }),
      closeDetail: () => dispatch({ type: 'CLOSE_DETAIL' }),
      dismissAlert: (id) => dispatch({ type: 'DISMISS_ALERT', id }),
      toggleAlerts: (open) => dispatch({ type: 'TOGGLE_ALERTS', open }),
      cartCount,
      cartTotal,
      bookingsTotal,
      fromTotal,
    }),
    [state, nights, cartCount, cartTotal, bookingsTotal, fromTotal],
  )

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}
