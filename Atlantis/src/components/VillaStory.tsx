import { useState } from 'react'
import ImageLightbox, { type LightboxImage } from './ImageLightbox'
import { VILLA_DISPLAY_NAME } from '../utils/villa'

const sections = [
  {
    image: '/villa/villa-entrance.jpg',
    fullSrc: '/villa/lightbox-entrance.jpg',
    alt: `${VILLA_DISPLAY_NAME} wooden entrance gate`,
    label: 'The Arrival',
  },
  {
    image: '/villa/villa-poolside.jpg',
    fullSrc: '/villa/lightbox-poolside.jpg',
    alt: `${VILLA_DISPLAY_NAME} private pool and thatched pavilion`,
    label: 'Pool & Pavilion',
  },
  {
    image: '/villa/villa-dusk.webp',
    fullSrc: '/villa/lightbox-dusk.jpg',
    alt: `${VILLA_DISPLAY_NAME} pool and villa at dusk`,
    label: 'Evenings',
  },
  {
    image: '/villa/villa-living.webp',
    fullSrc: '/villa/lightbox-living.jpg',
    alt: `${VILLA_DISPLAY_NAME} living room and kitchen`,
    label: 'Inside',
  },
] as const

const galleryImages: LightboxImage[] = sections.map((s) => ({
  src: s.image,
  fullSrc: s.fullSrc,
  alt: s.alt,
}))

export default function VillaStory() {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  return (
    <section
      id="villa-gallery"
      aria-label={`${VILLA_DISPLAY_NAME} gallery`}
      className="w-full px-6 pb-16 sm:px-10 lg:px-14"
    >
      <div className="mx-auto grid max-w-[1400px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((block, i) => (
          <button
            key={block.image}
            type="button"
            onClick={() => {
              setIndex(i)
              setOpen(true)
            }}
            className="group relative overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sand"
            aria-label={`View ${block.label} larger`}
          >
            <img
              src={block.image}
              alt={block.alt}
              className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              draggable={false}
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-3.5 pt-12">
              <span className="text-[0.8125rem] font-semibold tracking-wide text-white drop-shadow">
                {block.label}
              </span>
            </span>
          </button>
        ))}
      </div>

      {open && (
        <ImageLightbox
          images={galleryImages}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  )
}
