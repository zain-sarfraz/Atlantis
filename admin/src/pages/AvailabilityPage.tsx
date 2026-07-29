import { useEffect, useState } from 'react'
import { roomsApi, availabilityApi, type RoomType, type AvailabilityDay } from '../api/client'
import PageHeader from '../components/PageHeader'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(Date.UTC(year, month - 1, 1))
  while (d.getUTCMonth() === month - 1) {
    days.push(new Date(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

export default function AvailabilityPage() {
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [calendar, setCalendar] = useState<AvailabilityDay[]>([])
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkCount, setBulkCount] = useState(1)
  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')
  const [bulkMsg, setBulkMsg] = useState('')

  useEffect(() => {
    roomsApi.listRooms().then((rms) => {
      setRooms(rms)
      if (rms.length) setSelectedRoomId(rms[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedRoomId) return
    setLoading(true)
    const month = `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}`
    availabilityApi.getCalendar(selectedRoomId, month)
      .then(setCalendar)
      .finally(() => setLoading(false))
  }, [selectedRoomId, currentDate])

  const availMap = new Map(calendar.map((d) => [d.date, d.available]))

  async function setDay(date: string, available: number) {
    setSaving(true)
    try {
      await availabilityApi.set(selectedRoomId, { date, available })
      setCalendar((prev) => {
        const existing = prev.find((d) => d.date === date)
        if (existing) return prev.map((d) => d.date === date ? { ...d, available } : d)
        return [...prev, { date, available }]
      })
    } finally { setSaving(false) }
  }

  async function bulkSet() {
    if (!bulkFrom || !bulkTo) return
    setSaving(true)
    setBulkMsg('')
    try {
      const res = await availabilityApi.bulkSet(selectedRoomId, { from: bulkFrom, to: bulkTo, available: bulkCount }) as { updated: number }
      setBulkMsg(`✓ Updated ${res.updated} dates`)
      const month = `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}`
      const updated = await availabilityApi.getCalendar(selectedRoomId, month)
      setCalendar(updated)
    } catch (e: unknown) {
      setBulkMsg(`Error: ${(e as Error).message}`)
    } finally { setSaving(false) }
  }

  function prevMonth() {
    setCurrentDate(({ year, month }) => month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 })
  }
  function nextMonth() {
    setCurrentDate(({ year, month }) => month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 })
  }

  const days = getMonthDays(currentDate.year, currentDate.month)
  const firstDow = days[0]?.getUTCDay() ?? 0

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  return (
    <div>
      <PageHeader title="Availability Calendar" subtitle="Manage room inventory per day" />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Room Selector */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Select Room</p>
          <div className="space-y-1">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  selectedRoomId === r.id
                    ? 'bg-[#5e544b] text-white font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.name}
                <span className="block text-xs opacity-60">{r.category?.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Calendar */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                {selectedRoom?.name} — {new Date(currentDate.year, currentDate.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={nextMonth} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading calendar…</div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for first week */}
                  {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}
                  {days.map((d) => {
                    const dateStr = d.toISOString().slice(0, 10)
                    const avail = availMap.get(dateStr) ?? 1
                    const color = avail === 0 ? 'bg-red-100 text-red-700' : avail >= 3 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    return (
                      <div key={dateStr} className={`rounded-lg p-1.5 text-center cursor-pointer transition hover:opacity-80 ${color}`}>
                        <div className="text-xs font-medium">{d.getUTCDate()}</div>
                        <input
                          type="number"
                          min={0}
                          value={avail}
                          onChange={(e) => setDay(dateStr, parseInt(e.target.value, 10))}
                          className="w-full bg-transparent text-center text-xs font-bold outline-none"
                          disabled={saving}
                          title={`${dateStr}: ${avail} available`}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100 inline-block" /> Unavailable (0)</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-100 inline-block" /> Low (1–2)</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-100 inline-block" /> Available (3+)</span>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Update */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800">Bulk Update Availability</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
                <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f]"
                  value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
                <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f]"
                  value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Rooms Available</label>
                <input type="number" min={0} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f]"
                  value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))} />
              </div>
              <button
                onClick={bulkSet}
                disabled={saving || !bulkFrom || !bulkTo}
                className="rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] disabled:opacity-50 transition"
              >
                Apply
              </button>
              {bulkMsg && <span className="text-sm text-slate-600">{bulkMsg}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
