import ZoomableImage from './ZoomableImage'
import { VILLA_DISPLAY_NAME } from '../utils/villa'

const sections = [
  {
    image: '/villa/villa-entrance.jpg',
    alt: `${VILLA_DISPLAY_NAME} wooden entrance gate`,
    eyebrow: 'The arrival',
    title: 'Behind the wooden gate',
    body: 'Limiria Villa is a private home in Zanzibar — not a hotel corridor. Coral-stone walls and a thatched makuti roof frame the entrance. Once the gate closes, the entire villa is yours.',
    points: [
      'Entire villa reserved for your stay',
      'Quiet, gated arrival',
      'Traditional makuti architecture',
    ],
  },
  {
    image: '/villa/villa-poolside.jpg',
    alt: `${VILLA_DISPLAY_NAME} private pool and thatched pavilion`,
    eyebrow: 'Pool & pavilion',
    title: 'Slow days by the water',
    body: 'A private pool sits against white walls and a soaring thatched pavilion. Wooden deck, sun loungers, and floor-to-ceiling glass — open the doors and live between the water and the house.',
    points: [
      'Private swimming pool',
      'Open-air lounge and outdoor dining',
      'Light-filled interiors opening to the deck',
    ],
  },
  {
    image: '/villa/villa-dusk.webp',
    alt: `${VILLA_DISPLAY_NAME} pool and villa at dusk`,
    eyebrow: 'Evenings',
    title: 'Golden hour by the pool',
    body: 'As the light softens, the pool turns still and the house glows from within. Loungers on the deck, warm wood under the eaves, and the quiet of a private villa at the end of the day.',
    points: [
      'Infinity pool facing the horizon',
      'Covered outdoor living after sunset',
      'The whole house lit for you alone',
    ],
  },
  {
    image: '/villa/villa-living.webp',
    alt: `${VILLA_DISPLAY_NAME} living room and kitchen`,
    eyebrow: 'Inside',
    title: 'A home, not a hotel room',
    body: 'Open living flows into a light kitchen — white sofa, pale wood, and quiet details. This is the villa as a house: space to gather, cook, and slow down between days by the water.',
    points: [
      'Open-plan living and dining',
      'Fully equipped kitchen',
      'Calm interiors in white and natural wood',
    ],
  },
] as const

function StoryBlock({
  image,
  alt,
  eyebrow,
  title,
  body,
  points,
}: (typeof sections)[number]) {
  return (
    <article className="max-w-3xl py-10">
      <div className="overflow-hidden rounded-xl">
        <ZoomableImage
          src={image}
          alt={alt}
          className="aspect-video w-full"
          loading="lazy"
        />
      </div>
      <p className="type-label mt-5 text-sand-dark">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-ink">{body}</p>
      <ul className="mt-5 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-base leading-relaxed text-ink">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
    </article>
  )
}

export function VillaVideo() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-navy">
        <video
          className="h-full w-full object-cover object-center"
          src="/villa/limiria-villa.mp4"
          poster="/villa/villa-poolside.jpg"
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
        >
          Your browser does not support the video.
        </video>
      </div>
    </div>
  )
}

export default function VillaStory() {
  return (
    <section aria-label={`About ${VILLA_DISPLAY_NAME}`}>
      {sections.map((block) => (
        <StoryBlock key={block.image} {...block} />
      ))}
    </section>
  )
}
