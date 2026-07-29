import { useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import type { BedType, ListView, SortOption, ViewType } from '../types'

const bedOptions: BedType[] = ['King', 'Queen', 'Twin', 'Sofa Bed']
const viewOptions: ViewType[] = ['Ocean', 'Palm', 'Garden', 'City', 'Pool']

export default function FilterBar() {
  const {
    state,
    setSort,
    setListView,
    toggleBedType,
    toggleView,
    setFilters,
    clearFilters,
  } = useBooking()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount =
    state.filters.bedTypes.length +
    state.filters.views.length +
    (state.filters.priceMin > 0 || state.filters.priceMax < 20000 ? 1 : 0)

  return (
    <div className="relative z-10 border-b border-border bg-white p-4 rounded-xl">
      <div className="flex flex-wrap items-center gap-3 py-3">
        <label className="type-label flex items-center gap-2">
          View By:
          <select
            value={state.listView}
            onChange={(e) => setListView(e.target.value as ListView)}
            className="rounded border border-border bg-cream px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-ink outline-none focus:border-sand focus:ring-2 focus:ring-sand"
          >
            <option value="rooms">Rooms</option>
            <option value="rates">Rates</option>
          </select>
        </label>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <label className="type-label flex items-center gap-2">
          Sort By:
          <select
            value={state.sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded border border-border bg-cream px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-ink outline-none focus:border-sand focus:ring-2 focus:ring-sand"
          >
            <option value="lowest">Lowest Price</option>
            <option value="highest">Highest Price</option>
          </select>
        </label>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="type-label flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-navy transition hover:border-sand focus:ring-2 focus:ring-sand"
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-sand px-1.5 py-0.5 text-xs font-semibold normal-case tracking-normal text-navy">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {filtersOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-white p-4 shadow-lg">
              <div className="mb-3">
                <p className="type-label mb-2">Bed Type</p>
                <div className="flex flex-wrap gap-2">
                  {bedOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBedType(b)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:ring-2 focus:ring-sand ${
                        state.filters.bedTypes.includes(b)
                          ? 'bg-sand text-navy'
                          : 'bg-cream-dark text-ink hover:bg-sand-light'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <p className="type-label mb-2">View</p>
                <div className="flex flex-wrap gap-2">
                  {viewOptions.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleView(v)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:ring-2 focus:ring-sand ${
                        state.filters.views.includes(v)
                          ? 'bg-sand text-navy'
                          : 'bg-cream-dark text-ink hover:bg-sand-light'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="type-label mb-2">Price Range (AED / night)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={state.filters.priceMin}
                    onChange={(e) =>
                      setFilters({ priceMin: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-border px-2 py-1.5 text-sm text-ink outline-none focus:border-sand focus:ring-2 focus:ring-sand"
                    min={0}
                  />
                  <span className="text-slate-500">–</span>
                  <input
                    type="number"
                    value={state.filters.priceMax}
                    onChange={(e) =>
                      setFilters({
                        priceMax: Number(e.target.value) || 20000,
                      })
                    }
                    className="w-full rounded border border-border px-2 py-1.5 text-sm text-ink outline-none focus:border-sand focus:ring-2 focus:ring-sand"
                    min={0}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearFilters()
                  setFiltersOpen(false)
                }}
                className="type-label w-full rounded-lg border border-border py-2.5 text-navy transition hover:border-sand focus:ring-2 focus:ring-sand"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
