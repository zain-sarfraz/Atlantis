import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { roomsApi, assetUrl, type RoomCategory, type RoomType, type RatePlan } from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Upload, X, DollarSign } from 'lucide-react'

const BED_TYPES = ['KING', 'QUEEN', 'TWIN', 'SOFA_BED'] as const
const VIEW_TYPES = ['OCEAN', 'PALM', 'GARDEN', 'CITY', 'POOL'] as const
const BOARD_TYPES = ['ROOM_ONLY', 'BED_AND_BREAKFAST', 'HALF_BOARD', 'FULL_BOARD'] as const

const BOARD_LABELS: Record<string, string> = {
  ROOM_ONLY: 'Room Only',
  BED_AND_BREAKFAST: 'Bed & Breakfast',
  HALF_BOARD: 'Half Board',
  FULL_BOARD: 'Full Board',
}

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20'
const btnPrimary = 'rounded-lg bg-[#bca37f] px-4 py-2 text-sm font-medium text-[#5e544b] hover:bg-[#a89068] transition disabled:opacity-60'
const btnDanger = 'rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition'
const btnGhost = 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition'

function plansFromRooms(rms: RoomType[]): Record<string, RatePlan[]> {
  const map: Record<string, RatePlan[]> = {}
  for (const r of rms) {
    if (r.ratePlans) map[r.id] = r.ratePlans
  }
  return map
}

// ─── Forms (stable components — not redefined inside the page) ────────────────

function CatForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: RoomCategory | null
  onSave: (data: { name: string; description: string; displayOrder: number }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [order, setOrder] = useState(initial?.displayOrder ?? 0)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      await onSave({ name: name.trim(), description: desc, displayOrder: order })
    } catch (err: unknown) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Name *</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
        <textarea className={inputCls} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Display Order</label>
        <input type="number" className={inputCls} value={order} onChange={(e) => setOrder(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

type RoomFormData = {
  name: string
  categoryId: string
  bedType: string
  viewType: string
  maxOccupancy: number
  sizeSqm: number
  description: string
  displayOrder: number
  isActive: boolean
  lodgifyPropertyId: number | null
  lodgifyRoomTypeId: number | null
  /** When creating, optional starting Room Only rate so the room appears on the guest site */
  initialRate?: { name: string; description: string; basePrice: number }
}

function RoomForm({
  initial,
  categories,
  defaultCategoryId,
  onSave,
  onCancel,
}: {
  initial: RoomType | null
  categories: RoomCategory[]
  defaultCategoryId: string
  onSave: (data: RoomFormData) => Promise<void>
  onCancel: () => void
}) {
  const isCreate = !initial
  const [name, setName] = useState(initial?.name ?? '')
  const [catId, setCatId] = useState(initial?.categoryId ?? defaultCategoryId)
  const [bedType, setBedType] = useState(initial?.bedType ?? 'KING')
  const [viewType, setViewType] = useState(initial?.viewType ?? 'OCEAN')
  const [maxOcc, setMaxOcc] = useState(initial?.maxOccupancy ?? 2)
  const [size, setSize] = useState(Number(initial?.sizeSqm ?? 40))
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [order, setOrder] = useState(initial?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [lodgifyPropertyId, setLodgifyPropertyId] = useState(
    initial?.lodgifyPropertyId != null ? String(initial.lodgifyPropertyId) : '',
  )
  const [lodgifyRoomTypeId, setLodgifyRoomTypeId] = useState(
    initial?.lodgifyRoomTypeId != null ? String(initial.lodgifyRoomTypeId) : '',
  )
  const [rateName, setRateName] = useState('ROOM_ONLY')
  const [ratePrice, setRatePrice] = useState(800)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setFormError('Name is required'); return }
    if (!catId) { setFormError('Category is required — create a category first'); return }
    if (!size || size <= 0) { setFormError('Size must be greater than 0'); return }
    if (isCreate && (!ratePrice || ratePrice <= 0)) {
      setFormError('Starting price must be greater than 0 so guests can book this room')
      return
    }
    const parsedLodgifyPropertyId =
      lodgifyPropertyId.trim() !== '' ? Number(lodgifyPropertyId) : null
    const parsedLodgifyRoomTypeId =
      lodgifyRoomTypeId.trim() !== '' ? Number(lodgifyRoomTypeId) : null
    if (parsedLodgifyPropertyId != null && (!Number.isInteger(parsedLodgifyPropertyId) || parsedLodgifyPropertyId <= 0)) {
      setFormError('Lodgify Property ID must be a positive whole number')
      return
    }
    if (parsedLodgifyRoomTypeId != null && (!Number.isInteger(parsedLodgifyRoomTypeId) || parsedLodgifyRoomTypeId <= 0)) {
      setFormError('Lodgify Room Type ID must be a positive whole number')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await onSave({
        name: name.trim(),
        categoryId: catId,
        bedType,
        viewType,
        maxOccupancy: maxOcc,
        sizeSqm: size,
        description: desc.trim(),
        displayOrder: order,
        isActive,
        lodgifyPropertyId: parsedLodgifyPropertyId,
        lodgifyRoomTypeId: parsedLodgifyRoomTypeId,
        ...(isCreate
          ? {
              initialRate: {
                name: rateName,
                description: BOARD_LABELS[rateName] ?? rateName,
                basePrice: ratePrice,
              },
            }
          : {}),
      })
    } catch (err: unknown) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
      {categories.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Create a category first, then add a room type under it.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Name *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Category *</label>
          <select className={inputCls} value={catId} onChange={(e) => setCatId(e.target.value)} disabled={categories.length === 0}>
            <option value="">— select —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Bed Type</label>
          <select className={inputCls} value={bedType} onChange={(e) => setBedType(e.target.value)}>
            {BED_TYPES.map((b) => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">View</label>
          <select className={inputCls} value={viewType} onChange={(e) => setViewType(e.target.value)}>
            {VIEW_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Max Occupancy</label>
          <input type="number" min={1} className={inputCls} value={maxOcc} onChange={(e) => setMaxOcc(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Size (sqm)</label>
          <input type="number" min={1} className={inputCls} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
        <textarea className={inputCls} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lodgify (optional)</p>
        <p className="text-xs text-slate-500">
          Map this room to Lodgify so channel bookings sync to the dashboard.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Lodgify Property ID</label>
            <input
              type="number"
              min={1}
              step={1}
              className={inputCls}
              placeholder="e.g. 123456"
              value={lodgifyPropertyId}
              onChange={(e) => setLodgifyPropertyId(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Lodgify Room Type ID</label>
            <input
              type="number"
              min={1}
              step={1}
              className={inputCls}
              placeholder="e.g. 789012"
              value={lodgifyRoomTypeId}
              onChange={(e) => setLodgifyRoomTypeId(e.target.value)}
            />
          </div>
        </div>
      </div>
      {isCreate && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Starting rate *</p>
          <p className="text-xs text-slate-500">Required so this room appears on the guest booking site.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Board Type</label>
              <select className={inputCls} value={rateName} onChange={(e) => setRateName(e.target.value)}>
                {BOARD_TYPES.map((b) => <option key={b} value={b}>{BOARD_LABELS[b]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Base Price (AED / night)</label>
              <input
                type="number"
                min={1}
                step={50}
                className={inputCls}
                value={ratePrice}
                onChange={(e) => setRatePrice(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Display Order</label>
          <input type="number" className={`${inputCls} w-24`} value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input type="checkbox" id="roomIsActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
          <label htmlFor="roomIsActive" className="text-xs font-medium text-slate-600">Active</label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={saving || categories.length === 0}>
          {saving ? 'Saving…' : isCreate ? 'Create Room Type' : 'Save Room'}
        </button>
      </div>
    </form>
  )
}

function RateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: RatePlan | null
  onSave: (data: { name: string; description: string; basePrice: number }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? 'ROOM_ONLY')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(Number(initial?.basePrice ?? 0))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!price || price <= 0) { setFormError('Base price must be greater than 0'); return }
    setSaving(true)
    setFormError('')
    try {
      await onSave({ name, description: desc, basePrice: price })
    } catch (err: unknown) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Board Type</label>
        <select className={inputCls} value={name} onChange={(e) => setName(e.target.value)}>
          {BOARD_TYPES.map((b) => <option key={b} value={b}>{BOARD_LABELS[b]}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
        <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Base Price (AED / night)</label>
        <input type="number" min={0} step={50} className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save Rate Plan'}</button>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const [categories, setCategories] = useState<RoomCategory[]>([])
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [ratePlans, setRatePlans] = useState<Record<string, RatePlan[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const [showCatModal, setShowCatModal] = useState(false)
  const [editCat, setEditCat] = useState<RoomCategory | null>(null)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [editRoom, setEditRoom] = useState<RoomType | null>(null)
  const [selectedCatId, setSelectedCatId] = useState('')
  const [showRateModal, setShowRateModal] = useState(false)
  const [editRate, setEditRate] = useState<RatePlan | null>(null)
  const [rateRoomId, setRateRoomId] = useState('')

  const load = useCallback(async () => {
    try {
      const [cats, rms] = await Promise.all([roomsApi.listCategories(), roomsApi.listRooms()])
      setCategories(cats)
      setRooms(rms)
      setRatePlans(plansFromRooms(rms))
      setOpenCats((prev) => {
        if (prev.size === 0) return new Set(cats.map((c) => c.id))
        const next = new Set<string>()
        for (const c of cats) {
          if (prev.has(c.id)) next.add(c.id)
        }
        if (next.size === 0) return new Set(cats.map((c) => c.id))
        return next
      })
      setError('')
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function toggleCat(id: string) {
    setOpenCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function refreshRatePlans(roomId: string) {
    const plans = await roomsApi.listRatePlans(roomId)
    setRatePlans((prev) => ({ ...prev, [roomId]: plans }))
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Delete this category and all its rooms?')) return
    setActionError('')
    try {
      await roomsApi.deleteCategory(id)
      await load()
    } catch (e: unknown) {
      setActionError((e as Error).message)
    }
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm('Delete this room type?')) return
    setActionError('')
    try {
      await roomsApi.deleteRoom(id)
      await load()
    } catch (e: unknown) {
      setActionError((e as Error).message)
    }
  }

  async function handleDeleteRatePlan(id: string, roomId: string) {
    if (!confirm('Delete this rate plan?')) return
    setActionError('')
    try {
      await roomsApi.deleteRatePlan(id)
      await refreshRatePlans(roomId)
    } catch (e: unknown) {
      setActionError((e as Error).message)
    }
  }

  async function handleUploadImage(roomId: string, file: File) {
    setActionError('')
    try {
      const form = new FormData()
      form.append('image', file)
      await roomsApi.uploadImage(roomId, form)
      await load()
    } catch (e: unknown) {
      setActionError((e as Error).message)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading…</div>
  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-red-600">{error}</div>

  const roomsByCategory = (catId: string) => rooms.filter((r) => r.categoryId === catId)

  return (
    <div>
      <PageHeader
        title="Rooms & Rates"
        subtitle="Manage room categories, types, and rate plans"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className={btnGhost}
              onClick={() => { setEditCat(null); setShowCatModal(true) }}
            >
              <Plus size={14} className="inline mr-1" /> Category
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={categories.length === 0}
              title={categories.length === 0 ? 'Create a category first' : 'Add a new room type'}
              onClick={() => {
                if (categories.length === 0) {
                  setActionError('Create a category first, then add a room type.')
                  setEditCat(null)
                  setShowCatModal(true)
                  return
                }
                setActionError('')
                setEditRoom(null)
                setSelectedCatId(categories[0]?.id ?? '')
                setShowRoomModal(true)
              }}
            >
              <Plus size={14} className="inline mr-1" /> Room Type
            </button>
          </div>
        }
      />

      {actionError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{actionError}</span>
          <button type="button" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => setActionError('')}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="space-y-4">
        {categories.map((cat) => {
          const catRooms = roomsByCategory(cat.id)
          const isOpen = openCats.has(cat.id)

          return (
            <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => toggleCat(cat.id)}
                >
                  {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  <div>
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {catRooms.length} room{catRooms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Badge value={cat.isActive ? 'active' : 'inactive'} />
                </button>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => { setEditCat(cat); setShowCatModal(true) }}
                  >
                    <Edit2 size={13} className="mr-1 inline" /> Edit
                  </button>
                  <button type="button" className={btnDanger} onClick={() => void handleDeleteCategory(cat.id)}>
                    <Trash2 size={13} className="mr-1 inline" /> Delete
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="divide-y divide-slate-100">
                  {catRooms.length === 0 && (
                    <p className="px-6 py-4 text-sm text-slate-400">No rooms in this category.</p>
                  )}
                  {catRooms.map((room) => (
                    <div key={room.id}>
                      <div className="flex items-center gap-4 px-6 py-4">
                        {room.mainImage && (
                          <img
                            src={assetUrl(room.mainImage)}
                            alt={room.name}
                            className="h-14 w-20 shrink-0 rounded-lg border border-slate-100 object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800">{room.name}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            <span>{room.bedType.replace(/_/g, ' ')}</span>
                            <span>·</span>
                            <span>{room.viewType} View</span>
                            <span>·</span>
                            <span>Max {room.maxOccupancy}</span>
                            <span>·</span>
                            <span>{room.sizeSqm} sqm</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
                            <Upload size={12} />
                            Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) void handleUploadImage(room.id, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => { setEditRoom(room); setShowRoomModal(true) }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button type="button" className={btnDanger} onClick={() => void handleDeleteRoom(room.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Rate plans always visible under each room */}
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rate Plans</p>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-medium text-[#bca37f] hover:underline"
                            onClick={() => {
                              setRateRoomId(room.id)
                              setEditRate(null)
                              setShowRateModal(true)
                            }}
                          >
                            <Plus size={12} /> Add Rate Plan
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(ratePlans[room.id] ?? []).map((plan) => (
                            <div
                              key={plan.id}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-700">{BOARD_LABELS[plan.name] ?? plan.name}</p>
                                <p className="text-xs text-slate-500">{plan.description}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-800">
                                  <DollarSign size={12} className="inline text-[#bca37f]" />
                                  AED {Number(plan.basePrice).toLocaleString()}/night
                                </span>
                                <Badge value={plan.isActive ? 'active' : 'inactive'} />
                                <button
                                  type="button"
                                  className={btnGhost}
                                  onClick={() => {
                                    setRateRoomId(room.id)
                                    setEditRate(plan)
                                    setShowRateModal(true)
                                  }}
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  className={btnDanger}
                                  onClick={() => void handleDeleteRatePlan(plan.id, room.id)}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(ratePlans[room.id] ?? []).length === 0 && (
                            <p className="py-2 text-xs text-slate-400">No rate plans. Add one above.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="px-6 py-3">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium text-[#bca37f] hover:underline"
                      onClick={() => {
                        setEditRoom(null)
                        setSelectedCatId(cat.id)
                        setShowRoomModal(true)
                      }}
                    >
                      <Plus size={12} /> Add room to {cat.name}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">No categories yet. Create your first room category.</p>
            <button type="button" className={`${btnPrimary} mt-4`} onClick={() => { setEditCat(null); setShowCatModal(true) }}>
              <Plus size={14} className="mr-1 inline" /> Add Category
            </button>
          </div>
        )}
      </div>

      {showCatModal && (
        <Modal
          title={editCat ? 'Edit Category' : 'New Category'}
          onClose={() => { setShowCatModal(false); setEditCat(null) }}
        >
          <CatForm
            key={editCat?.id ?? 'new-cat'}
            initial={editCat}
            onCancel={() => { setShowCatModal(false); setEditCat(null) }}
            onSave={async (data) => {
              if (editCat) await roomsApi.updateCategory(editCat.id, data)
              else await roomsApi.createCategory(data)
              setShowCatModal(false)
              setEditCat(null)
              await load()
            }}
          />
        </Modal>
      )}

      {showRoomModal && (
        <Modal
          title={editRoom ? 'Edit Room Type' : 'New Room Type'}
          onClose={() => { setShowRoomModal(false); setEditRoom(null) }}
          size="lg"
        >
          <RoomForm
            key={editRoom?.id ?? `new-room-${selectedCatId}`}
            initial={editRoom}
            categories={categories}
            defaultCategoryId={selectedCatId}
            onCancel={() => { setShowRoomModal(false); setEditRoom(null) }}
            onSave={async (data) => {
              const { initialRate, ...roomData } = data
              if (editRoom) {
                await roomsApi.updateRoom(editRoom.id, roomData)
              } else {
                const created = await roomsApi.createRoom(roomData)
                if (initialRate) {
                  await roomsApi.createRatePlan(created.id, {
                    ...initialRate,
                    isActive: true,
                  })
                }
                setOpenCats((prev) => new Set(prev).add(roomData.categoryId))
              }
              setShowRoomModal(false)
              setEditRoom(null)
              await load()
            }}
          />
        </Modal>
      )}

      {showRateModal && (
        <Modal
          title={editRate ? 'Edit Rate Plan' : 'New Rate Plan'}
          onClose={() => { setShowRateModal(false); setEditRate(null) }}
        >
          <RateForm
            key={editRate?.id ?? `new-rate-${rateRoomId}`}
            initial={editRate}
            onCancel={() => { setShowRateModal(false); setEditRate(null) }}
            onSave={async (data) => {
              if (editRate) await roomsApi.updateRatePlan(editRate.id, data)
              else await roomsApi.createRatePlan(rateRoomId, data)
              setShowRateModal(false)
              setEditRate(null)
              await refreshRatePlans(rateRoomId)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
