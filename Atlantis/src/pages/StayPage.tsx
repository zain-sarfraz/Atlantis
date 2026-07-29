import { useMemo } from 'react'
import { useBooking } from '../context/BookingContext'
import SearchBar from '../components/SearchBar'
import AlertsBanner from '../components/AlertsBanner'
import FilterBar from '../components/FilterBar'
import RoomCard from '../components/RoomCard'
import RateListView from '../components/RateListView'
import CartSidebar from '../components/CartSidebar'
import type { RoomCategory } from '../types'

function getLowestRate(category: RoomCategory): number {
  const rates = category.rooms.flatMap((r) => r.ratePlans.map((p) => p.nightlyRate))
  return rates.length ? Math.min(...rates) : Number.POSITIVE_INFINITY
}

export default function StayPage() {
  const { state } = useBooking()

  const filtered = useMemo(() => {
    const { bedTypes, views, priceMin, priceMax } = state.filters

    let cats = state.categories
      .map((cat) => {
        const rooms = cat.rooms.filter((room) => {
          if (bedTypes.length && !bedTypes.includes(room.bedType as never)) return false
          if (views.length && !views.includes(room.view as never)) return false
          const rates = room.ratePlans.map((p) => p.nightlyRate)
          if (!rates.length) return false
          const lowest = Math.min(...rates)
          if (lowest < priceMin || lowest > priceMax) return false
          return true
        })
        return { ...cat, rooms }
      })
      .filter((cat) => cat.rooms.length > 0)

    cats = [...cats].sort((a, b) => {
      const pa = getLowestRate(a)
      const pb = getLowestRate(b)
      return state.sort === 'lowest' ? pa - pb : pb - pa
    })

    return cats
  }, [state.categories, state.filters, state.sort])

  return (
    <>
      <AlertsBanner />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-0">
            <SearchBar />
            <FilterBar />

            <section className="pt-8">
              <h1 className="mb-2 text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
                Select a Room
              </h1>
              <div className="mb-6 border-b border-border" />

              {state.searchLoading ? (
                <div className="rounded-lg border border-border bg-white py-16 text-center">
                  <p className="text-base text-slate-500">Loading available rooms…</p>
                </div>
              ) : state.searchError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 py-10 text-center">
                  <p className="text-base font-medium text-red-700">Could not load rooms</p>
                  <p className="mt-2 text-sm text-red-600">{state.searchError}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border border-border bg-white py-16 text-center">
                  <p className="text-xl font-medium text-navy">No rooms match</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Try adjusting your dates, filters, or price range.
                  </p>
                </div>
              ) : state.listView === 'rates' ? (
                <RateListView categories={filtered} />
              ) : (
                <div className="space-y-6">
                  {filtered.map((category) => (
                    <RoomCard key={category.id} category={category} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="lg:sticky lg:top-24">
            <CartSidebar />
          </div>
        </div>
      </div>
    </>
  )
}
