import { useMemo } from 'react'
import { useBooking } from '../context/BookingContext'
import SearchBar from '../components/SearchBar'
import VillaCard from '../components/VillaCard'
import CartSidebar from '../components/CartSidebar'
import VillaStory, { VillaVideo } from '../components/VillaStory'
import { pickVillaRoom, VILLA_DISPLAY_NAME } from '../utils/villa'

export default function StayPage() {
  const { state } = useBooking()

  const villa = useMemo(() => pickVillaRoom(state.categories), [state.categories])

  const rates = useMemo(() => {
    if (!villa) return []
    const plans = [...villa.ratePlans]
    return state.sort === 'highest'
      ? plans.sort((a, b) => b.nightlyRate - a.nightlyRate)
      : plans.sort((a, b) => a.nightlyRate - b.nightlyRate)
  }, [villa, state.sort])

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-0">
            <SearchBar />

            <section className="pt-8">
              <h1 className="mb-2 text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
                {VILLA_DISPLAY_NAME}
              </h1>
              <p className="mb-4 text-base text-slate-600">
                One private villa — {VILLA_DISPLAY_NAME}.
              </p>
              <div className="mb-6 border-b border-border" />

              {state.searchLoading ? (
                <div className="rounded-lg border border-border bg-white py-16 text-center">
                  <p className="text-base text-slate-500">Loading villa availability…</p>
                </div>
              ) : state.searchError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 py-10 text-center">
                  <p className="text-base font-medium text-red-700">Could not load the villa</p>
                  <p className="mt-2 text-sm text-red-600">{state.searchError}</p>
                </div>
              ) : !villa ? (
                <div className="rounded-lg border border-border bg-white py-16 text-center">
                  <p className="text-xl font-medium text-navy">Villa unavailable</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Could not load {VILLA_DISPLAY_NAME}. Check that the backend is running, then try again.
                  </p>
                </div>
              ) : rates.length === 0 ? (
                <div className="rounded-lg border border-border bg-white py-16 text-center">
                  <p className="text-xl font-medium text-navy">No rates configured</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {VILLA_DISPLAY_NAME} has no active rate plans yet.
                  </p>
                </div>
              ) : (
                <VillaCard room={villa} rates={rates} />
              )}

              <VillaStory />
            </section>
          </div>

          <div className="lg:sticky lg:top-24">
            <CartSidebar />
          </div>
        </div>
      </div>

      <VillaVideo />
    </>
  )
}
