import { useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-cream p-2 text-navy transition hover:bg-sand focus:ring-2 focus:ring-sand"
        aria-label="Close fullscreen image"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[92vh] max-w-[96vw] cursor-default rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
