import { useEffect, useState } from 'react'
import { staffApi, type AdminUser } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20'
const ROLES = ['SUPER_ADMIN', 'RESERVATIONS_MANAGER', 'CONTENT_EDITOR']
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  RESERVATIONS_MANAGER: 'Reservations Manager',
  CONTENT_EDITOR: 'Content Editor',
}

function fmtDate(d?: string) {
  if (!d) return 'Never'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StaffPage() {
  const { admin: currentAdmin } = useAuth()
  const [staff, setStaff] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editStaff, setEditStaff] = useState<AdminUser | null>(null)

  if (currentAdmin?.role !== 'SUPER_ADMIN') {
    return (
      <div>
        <PageHeader title="Staff Management" />
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Shield size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Only Super Admins can manage staff accounts.</p>
        </div>
      </div>
    )
  }

  async function load() {
    try { const data = await staffApi.list(); setStaff(data) }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { load() }, [])

  async function deleteStaff(id: string) {
    if (!confirm('Delete this staff account?')) return
    await staffApi.delete(id)
    await load()
  }

  function StaffForm() {
    const [email, setEmail] = useState(editStaff?.email ?? '')
    const [firstName, setFirstName] = useState(editStaff?.firstName ?? '')
    const [lastName, setLastName] = useState(editStaff?.lastName ?? '')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState(editStaff?.role ?? 'CONTENT_EDITOR')
    const [isActive, setIsActive] = useState(editStaff?.isActive ?? true)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function save() {
      setSaving(true); setErr('')
      try {
        if (editStaff) {
          await staffApi.update(editStaff.id, { firstName, lastName, role, isActive, ...(password ? { password } : {}) })
        } else {
          await staffApi.create({ email, firstName, lastName, password, role, isActive })
        }
        setShowModal(false); setEditStaff(null)
        await load()
      } catch (e: unknown) { setErr((e as Error).message) }
      finally { setSaving(false) }
    }

    return (
      <div className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">First Name *</label>
            <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Last Name *</label>
            <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        {!editStaff && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email *</label>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Password {editStaff ? '(leave blank to keep)' : '*'}</label>
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input type="checkbox" id="staffActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
            <label htmlFor="staffActive" className="text-sm font-medium text-slate-700">Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition" onClick={() => { setShowModal(false); setEditStaff(null) }}>Cancel</button>
          <button className="rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] transition" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage admin user accounts and roles"
        action={
          <button
            className="flex items-center gap-2 rounded-lg bg-[#5e544b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4238] transition"
            onClick={() => { setEditStaff(null); setShowModal(true) }}
          >
            <Plus size={15} /> Add Staff
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Last Login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading…</td></tr>}
            {!loading && staff.map((s: AdminUser) => (
              <tr key={s.id} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3.5 font-medium text-slate-800">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3.5 text-slate-600">{s.email}</td>
                <td className="px-4 py-3.5"><Badge value={s.role} /></td>
                <td className="px-4 py-3.5"><Badge value={s.isActive ? 'active' : 'inactive'} /></td>
                <td className="px-4 py-3.5 text-slate-500 text-xs">{fmtDate(s.lastLogin)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition"
                      onClick={() => { setEditStaff(s); setShowModal(true) }}>
                      <Edit2 size={11} /> Edit
                    </button>
                    {s.id !== currentAdmin?.id && (
                      <button className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 transition"
                        onClick={() => deleteStaff(s.id)}>
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editStaff ? 'Edit Staff' : 'Add Staff'} onClose={() => { setShowModal(false); setEditStaff(null) }}>
          <StaffForm />
        </Modal>
      )}
    </div>
  )
}
