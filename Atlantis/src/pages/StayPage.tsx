import { useMemo } from 'react'
import {
  BedDouble,
  Check,
  Maximize2,
  Waves,
  Users,
  Wifi,
  Droplets,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import SearchBar from '../components/SearchBar'
import BookingCard from '../components/BookingCard'
import VillaStory from '../components/VillaStory'
import ZoomableImage from '../components/ZoomableImage'
import type { LightboxImage } from '../components/ImageLightbox'
import {
  pickVillaRoom,
  VILLA_DESCRIPTION,
  VILLA_DISPLAY_NAME,
  VILLA_HERO_IMAGE,
  VILLA_HERO_IMAGE_2X,
  VILLA_HERO_IMAGE_FALLBACK,
} from '../utils/villa'

const amenityIcons = [
  { icon: Droplets, label: 'Private Pool' },
  { icon: Wifi, label: 'High-Speed Wi-Fi' },
  { icon: UtensilsCrossed, label: 'Fully Equipped Kitchen' },
  { icon: Sparkles, label: 'Daily Housekeeping' },
] as const

const defaultAmenities = [
  'Walk-in rain shower',
  'Minibar with complimentary soft drinks',
  'Private balcony',
  'High-speed Wi-Fi',
  '55" smart television',
  'Nespresso coffee machine',
  'Luxury bath amenities',
  'In-room safe',
  'USB charging outlets',
  'Blackout curtains',
]

const defaultHighlights = [
  'Unlimited Aquaventure Waterpark access',
  'Complimentary fitness centre access',
  'Kids Club privileges',
  'Beach & pool towels',
  'Daily housekeeping',
]

const introGallery: LightboxImage[] = [
  {
    src: '/villa/villa-poolside.jpg',
    fullSrc: '/villa/lightbox-poolside.jpg',
    alt: 'Villa pool deck and lounge',
  },
  {
    src: '/villa/villa-gate.png',
    fullSrc: '/villa/lightbox-gate.jpg',
    alt: 'Villa entrance gate',
  },
  {
    src: '/villa/villa-bcom-2.jpg',
    fullSrc: '/villa/lightbox-aerial.jpg',
    alt: 'Aerial view of the villa',
  },
]

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

  const scrollToSearch = () => {
    document.getElementById('booking-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="bg-cream">
      <div className="relative z-50 mx-auto max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-10">
        <SearchBar />
      </div>

      {/* Hero — HD banner, no blur upscale */}
      <section className="relative mt-4 min-h-[62vh] w-full overflow-hidden sm:min-h-[68vh]">
        <img
          src={VILLA_HERO_IMAGE}
          srcSet={`${VILLA_HERO_IMAGE_FALLBACK} 1024w, ${VILLA_HERO_IMAGE} 1920w, ${VILLA_HERO_IMAGE_2X} 2560w`}
          sizes="100vw"
          width={1920}
          height={1440}
          alt={VILLA_DISPLAY_NAME}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/50 via-black/25 to-transparent" />

        <div className="relative mx-auto flex min-h-[62vh] w-full max-w-[1400px] items-center justify-end px-6 py-16 sm:min-h-[68vh] sm:px-10 lg:px-14">
          <div className="w-full max-w-xl rounded-2xl bg-black/30 p-6 text-right text-white shadow-[0_0_40px_20px_rgba(0,0,0,0.35)] sm:p-8">
            <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl md:text-[3.5rem]">
              {VILLA_DISPLAY_NAME}
            </h1>
            <p className="mt-4 font-serif text-lg font-medium italic leading-snug text-white/95 sm:text-xl">
              Your private escape in Zanzibar
            </p>

            <div className="mt-6 ml-auto h-px w-16 bg-sand" aria-hidden />

            <p className="type-eyebrow mt-6 text-sand">
              Private Villa · Zanzibar
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-end gap-x-6 gap-y-3 text-[0.8125rem] font-medium tracking-wide text-white sm:text-[0.875rem]">
              <span className="flex items-center gap-2">
                <BedDouble size={18} strokeWidth={1.5} />
                {villa?.bedType ?? 'King'} Bed
              </span>
              <span className="flex items-center gap-2">
                <Users size={18} strokeWidth={1.5} />
                Sleeps {villa?.maxOccupancy ?? 2}
              </span>
              <span className="flex items-center gap-2">
                <Maximize2 size={18} strokeWidth={1.5} />
                {villa?.sizeSqm ?? 42} sq m
              </span>
              <span className="flex items-center gap-2">
                <Waves size={18} strokeWidth={1.5} />
                {villa?.view ?? 'Palm'} View
              </span>
            </div>

            <button
              type="button"
              onClick={scrollToSearch}
              className="type-cta mt-10 rounded bg-sand px-10 py-3.5 text-white transition hover:bg-sand-dark"
            >
              Check Availability
            </button>
          </div>
        </div>
      </section>

      {/* A Private Villa — text left, collage right (large + 2 stacked) */}
      <section className="w-full bg-cream px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <p className="type-eyebrow text-2xl text-sand">
              A Private Villa
            </p>
            <h2 className="mt-2.5 font-serif text-[2rem] font-semibold tracking-[-0.02em] text-navy md:text-[2.5rem]">
              {VILLA_DISPLAY_NAME}
            </h2>
            <p className="type-body mt-5 max-w-xl text-slate-600">
              {villa?.description?.trim() || VILLA_DESCRIPTION}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {amenityIcons.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-start gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand/10">
                    <Icon size={22} className="text-sand" strokeWidth={1.5} />
                  </span>
                  <p className="text-[0.75rem] font-semibold leading-snug tracking-tight text-navy">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1.35fr_1fr] gap-3 sm:gap-4">
            <ZoomableImage
              src={introGallery[0].src}
              alt={introGallery[0].alt}
              gallery={introGallery}
              className="h-full min-h-[260px] w-full rounded-2xl sm:min-h-[320px] lg:min-h-[380px]"
              loading="lazy"
            />
            <div className="flex flex-col gap-3 sm:gap-4">
              <ZoomableImage
                src={introGallery[1].src}
                alt={introGallery[1].alt}
                gallery={introGallery}
                className="aspect-[16/10] w-full flex-1 rounded-2xl"
                loading="lazy"
              />
              <ZoomableImage
                src={introGallery[2].src}
                alt={introGallery[2].alt}
                gallery={introGallery}
                className="aspect-[16/10] w-full flex-1 rounded-2xl"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Villa Details — cream card + booking sidebar */}
      <section id="villa-booking" className="w-full px-6 pb-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-[1400px]">
          {state.searchLoading ? (
            <div className="rounded-2xl bg-cream-dark/50 py-16 text-center">
              <p className="text-base text-slate-500">Loading villa availability…</p>
            </div>
          ) : state.searchError ? (
            <div className="rounded-2xl bg-red-50 py-10 text-center">
              <p className="text-base font-medium text-red-700">Could not load the villa</p>
              <p className="mt-2 text-sm text-red-600">{state.searchError}</p>
            </div>
          ) : !villa ? (
            <div className="rounded-2xl bg-cream-dark/40 py-16 text-center">
              <p className="font-serif text-xl font-medium text-navy">Villa unavailable</p>
              <p className="mt-2 text-sm text-slate-500">
                Could not load {VILLA_DISPLAY_NAME}. Check that the backend is running, then try again.
              </p>
            </div>
          ) : rates.length === 0 ? (
            <div className="rounded-2xl bg-cream-dark/40 py-16 text-center">
              <p className="font-serif text-xl font-medium text-navy">No rates configured</p>
              <p className="mt-2 text-sm text-slate-500">
                {VILLA_DISPLAY_NAME} has no active rate plans yet.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#f3efe8] p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
                <div className="lg:border-r lg:border-sand-light/80 lg:pr-10">
                  <h3 className="font-serif text-[1.75rem] font-semibold tracking-[-0.02em] text-navy md:text-[2rem]">
                    Villa Details
                  </h3>
                  <p className="type-meta mt-1.5 text-slate-500">
                    Everything included with your stay at Limiria Villa Zanzibar.
                  </p>

                  <div className="mt-7 grid gap-8 sm:grid-cols-2 sm:gap-10">
                    <div>
                      <h4 className="type-eyebrow mb-4 text-navy">
                        Amenities
                      </h4>
                      <ul className="space-y-3">
                        {(villa.amenities.length > 0 ? villa.amenities : defaultAmenities).map(
                          (a) => (
                            <li
                              key={a}
                              className="flex gap-2.5 text-[0.875rem] font-medium leading-relaxed text-ink"
                            >
                              <Check
                                size={16}
                                className="mt-0.5 shrink-0 text-sand"
                                strokeWidth={2}
                              />
                              {a}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="type-eyebrow mb-4 text-navy">
                        Highlights
                      </h4>
                      <ul className="space-y-3">
                        {(villa.perks.length > 0 ? villa.perks : defaultHighlights).map((p) => (
                          <li
                            key={p}
                            className="flex gap-2.5 text-[0.875rem] font-medium leading-relaxed text-ink"
                          >
                            <Check
                              size={16}
                              className="mt-0.5 shrink-0 text-sand"
                              strokeWidth={2}
                            />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <BookingCard room={villa} rates={rates} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="w-full px-6 pb-16 sm:px-10 lg:px-14">
        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-2xl">
          <img
            src="/villa/villa-bcom-1.jpg"
            alt="Zanzibar experience"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex flex-col items-center px-6 py-16 text-center sm:px-10 sm:py-20">
            <p className="type-eyebrow  text-center text-sand-light">
              <span className="text-sand-light">The Zanzibar Experience</span>
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-center font-serif text-[2rem] font-semibold tracking-[-0.02em] text-white sm:text-[2.5rem] md:text-[3rem]">
              Slow days. Warm water. Golden sunsets.
            </h2>
            <p className="type-body mx-auto mt-4 max-w-xl text-center text-lg text-white/95">
              Spend your days between the private pool, the pavilion, and quiet moments under the
              palms — a private home rhythm, not a hotel schedule.
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById('villa-gallery')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="type-cta mt-8 rounded border-2 border-white px-6 py-3 text-white transition hover:bg-white hover:text-navy"
            >
              Explore Experiences
            </button>
          </div>
        </div>
      </section>

      <VillaStory />

      <section className="relative mt-4 w-full overflow-hidden">
        <img
          src="/villa/villa-pool.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative mx-auto max-w-[1400px] px-6 py-20 text-center sm:px-10 lg:px-14">
          <h2 className="font-serif text-[2rem] font-semibold tracking-[-0.02em] text-white sm:text-[2.5rem] md:text-[3rem]">
            Ready to Escape?
          </h2>
          <p className="type-body mt-3 text-[1.0625rem] text-white/95">
            Your private Zanzibar experience awaits.
          </p>
          <button
            type="button"
            onClick={scrollToSearch}
            className="type-cta mt-8 rounded bg-sand px-8 py-3.5 text-white transition hover:bg-sand-dark"
          >
            Book Your Stay
          </button>
        </div>
      </section>
    </div>
  )
}
