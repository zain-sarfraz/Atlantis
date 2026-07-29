import { Link } from 'react-router-dom'

interface LogoProps {
  to?: string
  className?: string
}

export default function Logo({ to = '/', className = '' }: LogoProps) {
  const content = (
    <img
      src="/logo-limiria.png?v=3"
      alt="Limiria Villa"
      className={`h-14 w-auto max-w-[11rem] object-contain object-left sm:h-16 sm:max-w-[13rem] ${className}`}
    />
  )

  if (to) {
    return (
      <Link
        to={to}
        className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-sand"
        aria-label="Limiria Villa home"
      >
        {content}
      </Link>
    )
  }

  return content
}
