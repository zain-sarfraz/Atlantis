import { useEffect, useState } from 'react'
import { alertsApi, type HotelAlert } from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { Plus, Edit2, Trash2, Bell } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<HotelAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editAlert, setEditAlert] = useState<HotelAlert | null>(null)

  async function load() {
    try { const data = await alertsApi.list(); setAlerts(data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function deleteAlert(id: string) {
    if (!confirm('Delete this alert?')) return
    await alertsApi.delete(id)
    await load()
  }

  function AlertForm() {
    const [title, setTitle] = useState(editAlert?.title ?? '')
    const [message, setMessage] = useState(editAlert?.message ?? '')
    const [isActive, setIsActive] = useState(editAlert?.isActive ?? true)
    const [sortOrder, setSortOrder] = useState(editAlert?.sortOrder ?? 0)
    const [saving, setSaving] = useState(false)

    async function save() {
      setSaving(true)
      try {
        if (editAlert) await alertsApi.update(editAlert.id, { title, message, isActive, sortOrder })
        else await alertsApi.create({ title, message, isActive, sortOrder })
        setShowModal(false); setEditAlert(null)
        await load()
      } finally { setSaving(false) }
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Title *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Message *</label>
          <textarea className={inputCls} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Sort Order</label>
            <input type="number" className={`${inputCls} w-24`} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="alertActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
            <label htmlFor="alertActive" className="text-sm font-medium text-slate-700">Active (visible to guests)</label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition" onClick={() => { setShowModal(false); setEditAlert(null) }}>Cancel</button>
          <button className="rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] transition" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Hotel Alerts"
        subtitle="Manage announcements shown to guests on the booking page"
        action={
          <button
            className="flex items-center gap-2 rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] transition"
            onClick={() => { setEditAlert(null); setShowModal(true) }}
          >
            <Plus size={15} /> New Alert
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="rounded-lg bg-amber-50 p-2 shrink-0 mt-0.5">
                    <Bell size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800">{alert.title}</p>
                      <Badge value={alert.isActive ? 'active' : 'inactive'} />
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{alert.message}</p>
                    <p className="mt-2 text-xs text-slate-400">Sort order: {alert.sortOrder}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    onClick={() => { setEditAlert(alert); setShowModal(true) }}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              No alerts yet. Create one to notify guests of important information.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal
          title={editAlert ? 'Edit Alert' : 'New Alert'}
          onClose={() => { setShowModal(false); setEditAlert(null) }}
        >
          <AlertForm />
        </Modal>
      )}
    </div>
  )
}
