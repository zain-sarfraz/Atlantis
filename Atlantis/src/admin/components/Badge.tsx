const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  CHECKED_OUT: 'bg-slate-100 text-slate-600',
  NO_SHOW: 'bg-orange-100 text-orange-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  RESERVATIONS_MANAGER: 'bg-blue-100 text-blue-700',
  CONTENT_EDITOR: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
}

export default function Badge({ value }: { value: string }) {
  const cls = statusColors[value] ?? 'bg-slate-100 text-slate-600'
  const label = value.replace(/_/g, ' ')
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
