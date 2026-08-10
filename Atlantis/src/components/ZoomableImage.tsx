import { useState } from 'react'
import ImageLightbox from './ImageLightbox'

interface ZoomableImageProps {
  src: string
  alt: string
  /** Sizing / rounding on the wrapper (img always fills with object-cover). */
  className?: string
  loading?: 'lazy' | 'eager'
}

/** Room image with pointer cursor + click to fullscreen. */
export default function ZoomableImage({
  src,
  alt,
  className = 'h-full w-full',
  loading = 'lazy',
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block cursor-pointer overflow-hidden p-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sand ${className}`}
        aria-label={`View ${alt} fullscreen`}
      >
        <img
          src={src}
          alt={alt}
          className="block h-full w-full object-cover object-center"
          loading={loading}
          referrerPolicy="no-referrer"
        />
      </button>
      {open && (
        <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
