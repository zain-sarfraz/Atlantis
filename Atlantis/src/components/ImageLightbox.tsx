import { useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { createPortal } from 'react-dom'

export type LightboxImage = {
  src: string
  alt: string
  /** Optional sharp landscape source for enlarged view */
  fullSrc?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

/** Large landscape image viewer with margin + prev/next. */
export default function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: ImageLightboxProps) {
  const current = images[index] ?? images[0]
  const hasMany = images.length > 1
  const displaySrc = current?.fullSrc || current?.src

  const goPrev = useCallback(() => {
    if (!hasMany) return
    onIndexChange((index - 1 + images.length) % images.length)
  }, [hasMany, index, images.length, onIndexChange])

  const goNext = useCallback(() => {
    if (!hasMany) return
    onIndexChange((index + 1) % images.length)
  }, [hasMany, index, images.length, onIndexChange])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, goPrev, goNext])

  if (!current || !displaySrc) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/80 p-5 sm:p-8 md:p-12"
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-10 rounded-full bg-cream p-2 text-navy shadow transition hover:bg-sand sm:top-8 sm:right-8"
        aria-label="Close image"
      >
        <X size={22} />
      </button>

      {hasMany && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          className="absolute left-3 z-10 rounded-full bg-cream/95 p-2.5 text-navy shadow transition hover:bg-sand sm:left-6"
          aria-label="Previous image"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {hasMany && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          className="absolute right-3 z-10 rounded-full bg-cream/95 p-2.5 text-navy shadow transition hover:bg-sand sm:right-6"
          aria-label="Next image"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div
        className="flex max-h-[min(82vh,900px)] w-full max-w-[min(88vw,1100px)] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={displaySrc}
          alt={current.alt}
          className="max-h-[min(82vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
          decoding="sync"
          referrerPolicy="no-referrer"
        />
      </div>

      {hasMany && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          {index + 1} / {images.length}
        </p>
      )}
    </div>,
    document.body,
  )
}
