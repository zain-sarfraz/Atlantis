import { useEffect, useRef, useState } from 'react'
import {
  LODGIFY_CHANNELS,
  CHANNEL_BADGE_STYLES,
  normalizeLodgifyChannel,
  type LodgifyChannel,
} from '../utils/lodgifyChannels'
import { ChevronDown } from 'lucide-react'

export function ChannelBadge({ source }: { source?: string | null }) {
  const channel = normalizeLodgifyChannel(source)
  const style = CHANNEL_BADGE_STYLES[channel]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
      title={source ?? channel}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {channel}
    </span>
  )
}

type ChannelsFilterProps = {
  /** Empty / all channels selected = no filter */
  selected: LodgifyChannel[]
  onChange: (next: LodgifyChannel[]) => void
}

/** Dropdown after Status — pick All or a single channel (same UX as status select). */
export function ChannelsFilter({ selected, onChange }: ChannelsFilterProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const allSelected = selected.length === 0 || selected.length === LODGIFY_CHANNELS.length
  const active = allSelected ? null : selected[0]
  const label = allSelected ? 'All channels' : (active ?? 'All channels')

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function pickAll() {
    onChange([...LODGIFY_CHANNELS])
    setOpen(false)
  }

  function pickOne(channel: LodgifyChannel) {
    onChange([channel])
    setOpen(false)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-w-[160px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] font-medium text-slate-800 outline-none hover:bg-slate-50 focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 truncate">
          {active && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${CHANNEL_BADGE_STYLES[active].dot}`}
              aria-hidden
            />
          )}
          {label}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full min-w-[200px] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={allSelected}
              onClick={pickAll}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] font-medium hover:bg-slate-50 ${
                allSelected ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
              }`}
            >
              All channels
            </button>
          </li>
          <li className="my-1 border-t border-slate-100" aria-hidden />
          {LODGIFY_CHANNELS.map((channel) => {
            const isActive = !allSelected && selected.includes(channel)
            return (
              <li key={channel}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => pickOne(channel)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] font-medium hover:bg-slate-50 ${
                    isActive ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${CHANNEL_BADGE_STYLES[channel].dot}`}
                    aria-hidden
                  />
                  {channel}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
