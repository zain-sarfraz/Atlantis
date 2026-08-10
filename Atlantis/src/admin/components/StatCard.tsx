import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  color?: string
  sub?: string
}

export default function StatCard({ label, value, icon: Icon, color = 'bg-blue-50 text-blue-600', sub }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-800">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
