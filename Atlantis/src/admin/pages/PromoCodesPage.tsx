import { useEffect, useState } from 'react'
import { promosApi, type PromoCode } from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20'

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null)

  async function load() {
    try {
      const data = await promosApi.list()
      setPromos(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function deletePromo(id: string) {
    if (!confirm('Delete this promo code?')) return
    await promosApi.delete(id)
    await load()
  }

  function PromoForm() {
    const [code, setCode] = useState(editPromo?.code ?? '')
    const [description, setDescription] = useState(editPromo?.description ?? '')
    const [discountType, setDiscountType] = useState(editPromo?.discountType ?? 'PERCENTAGE')
    const [discountValue, setDiscountValue] = useState(editPromo?.discountValue ?? 10)
    const [validFrom, setValidFrom] = useState(editPromo?.validFrom?.slice(0, 10) ?? '')
    const [validTo, setValidTo] = useState(editPromo?.validTo?.slice(0, 10) ?? '')
    const [maxUses, setMaxUses] = useState(editPromo?.maxUses ?? '')
    const [isActive, setIsActive] = useState(editPromo?.isActive ?? true)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function save() {
      setSaving(true)
      setErr('')
      try {
        const payload = {
          code: code.toUpperCase(),
          description,
          discountType,
          discountValue: Number(discountValue),
          validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
          validTo: validTo ? new Date(validTo).toISOString() : undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
          isActive,
          applicableToAll: true,
        }
        if (editPromo) await promosApi.update(editPromo.id, payload)
        else await promosApi.create(payload)
        setShowModal(false)
        setEditPromo(null)
        await load()
      } catch (e: unknown) {
        setErr((e as Error).message)
      } finally { setSaving(false) }
    }

    return (
      <div className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Code *</label>
          <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER20" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Discount Type</label>
            <select className={inputCls} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AED">Fixed Amount (AED)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Value</label>
            <input type="number" min={0} className={inputCls} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Valid From</label>
            <input type="date" className={inputCls} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Valid To</label>
            <input type="date" className={inputCls} value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Max Uses (blank = unlimited)</label>
            <input type="number" min={1} className={inputCls} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input type="checkbox" id="promoActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
            <label htmlFor="promoActive" className="text-sm font-medium text-slate-700">Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition" onClick={() => { setShowModal(false); setEditPromo(null) }}>Cancel</button>
          <button className="rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] transition" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Promo Codes"
        subtitle="Manage discount codes and special rates"
        action={
          <button
            className="flex items-center gap-2 rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] transition"
            onClick={() => { setEditPromo(null); setShowModal(true) }}
          >
            <Plus size={15} /> New Promo Code
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((promo) => (
            <div key={promo.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#5e544b]/10 p-2">
                    <Tag size={16} className="text-[#5e544b]" />
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-lg">{promo.code}</span>
                </div>
                <Badge value={promo.isActive ? 'active' : 'inactive'} />
              </div>

              {promo.description && <p className="text-sm text-slate-500 mb-3">{promo.description}</p>}

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-semibold text-slate-800">
                    {promo.discountType === 'PERCENTAGE'
                      ? `${promo.discountValue}%`
                      : `AED ${promo.discountValue}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Used / Max</span>
                  <span className="font-medium text-slate-700">
                    {promo.usedCount} / {promo.maxUses ?? '∞'}
                  </span>
                </div>
                {promo.validFrom && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valid</span>
                    <span className="text-slate-700">
                      {promo.validFrom.slice(0, 10)} → {promo.validTo?.slice(0, 10) ?? 'no expiry'}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  onClick={() => { setEditPromo(promo); setShowModal(true) }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                  onClick={() => deletePromo(promo.id)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}

          {promos.length === 0 && (
            <div className="col-span-3 rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              No promo codes yet. Create your first one.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal
          title={editPromo ? 'Edit Promo Code' : 'New Promo Code'}
          onClose={() => { setShowModal(false); setEditPromo(null) }}
        >
          <PromoForm />
        </Modal>
      )}
    </div>
  )
}
