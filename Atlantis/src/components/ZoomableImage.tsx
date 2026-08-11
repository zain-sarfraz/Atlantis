import { useState } from 'react'
import ImageLightbox, { type LightboxImage } from './ImageLightbox'

interface ZoomableImageProps {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  zoomable?: boolean
  /** Full gallery for prev/next when opened. Defaults to this image only. */
  gallery?: LightboxImage[]
}

/** Room image — click opens a larger lightbox with optional gallery nav. */
export default function ZoomableImage({
  src,
  alt,
  className = 'h-full w-full',
  loading = 'lazy',
  zoomable = true,
  gallery,
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false)
  const images = gallery?.length ? gallery : [{ src, alt }]
  const startIndex = Math.max(
    0,
    images.findIndex((img) => img.src === src),
  )
  const [index, setIndex] = useState(startIndex)

  if (!zoomable) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img
          src={src}
          alt={alt}
          className="block h-full w-full object-cover object-center"
          loading={loading}
          referrerPolicy="no-referrer"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(startIndex >= 0 ? startIndex : 0)
          setOpen(true)
        }}
        className={`block cursor-zoom-in overflow-hidden p-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sand ${className}`}
        aria-label={`View ${alt} larger`}
      >
        <img
          src={src}
          alt={alt}
          className="block h-full w-full object-cover object-center"
          loading={loading}
          referrerPolicy="no-referrer"
          draggable={false}
        />
      </button>
      {open && (
        <ImageLightbox
          images={images}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
