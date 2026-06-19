"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

type Profile = {
  id: number
  name: string
  email: string
  phone: string | null
  flat_number: string | null
  floor_number: string | null
  resident_type: string | null
  family_members: number | null
  vehicle_details: string | null
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const roles = (session?.user as { roles?: string[] })?.roles ?? []
  const isAdmin = roles.includes("admin")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && !isAdmin) router.push("/dashboard")
  }, [status, isAdmin, router])

  if (status === "loading") return <p className="text-center py-5" style={{ color: "#9ca3af" }}>Loading...</p>
  if (!isAdmin) return null

  return <AdminPanel token={session!.accessToken!} />
}

function AdminPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null)
  const [addMsg, setAddMsg] = useState("")
  const [addErr, setAddErr] = useState("")
  const [editMsg, setEditMsg] = useState("")
  const [editErr, setEditErr] = useState("")
  const [deleteMsg, setDeleteMsg] = useState("")
  const [deleteErr, setDeleteErr] = useState("")

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setErr("")
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to load")
      setUsers(data.users)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadUsers() }, [loadUsers])

  return (
    <div className="container py-4">
      <div className="card shadow-sm p-3 mb-4 border-0 d-flex flex-row align-items-center justify-content-between" style={{ background: "#f8f9ff", borderRadius: 16 }}>
        <div>
          <h2 className="mb-0" style={{ color: "#1e1b4b" }}>Admin Panel</h2>
          <p className="mb-0" style={{ color: "#6b7280", fontSize: "0.9rem" }}>Manage all residents</p>
        </div>
        <button className="btn btn-glow-success" onClick={() => { setShowAdd(true); setAddMsg(""); setAddErr("") }}>
          + Add User
        </button>
      </div>

      {err && <div className="alert alert-danger py-2">{err}</div>}

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : users.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No users found.</p>
      ) : (
        <div className="table-container">
          <table className="table-custom table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Flat</th>
                <th>Floor</th>
                <th>Type</th>
                <th>Family</th>
                <th>Vehicle</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone ?? "-"}</td>
                  <td>{u.flat_number ?? "-"}</td>
                  <td>{u.floor_number ?? "-"}</td>
                  <td>{u.resident_type === "self" ? "Self" : u.resident_type === "tenant" ? "Tenant" : "-"}</td>
                  <td>{u.family_members != null ? u.family_members : "-"}</td>
                  <td>{u.vehicle_details ?? "-"}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-glow btn-sm" onClick={() => { setEditUser(u); setEditMsg(""); setEditErr("") }}>
                        Edit
                      </button>
                      <button className="btn btn-glow-danger btn-sm" onClick={() => { setDeleteUser(u); setDeleteMsg(""); setDeleteErr("") }}>
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ───── Add Modal ───── */}
      {showAdd && (
        <AddUserModal
          token={token}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); loadUsers() }}
          setMsg={setAddMsg}
          setErr={setAddErr}
          msg={addMsg}
          err={addErr}
        />
      )}

      {/* ───── Edit Modal ───── */}
      {editUser && (
        <EditUserModal
          token={token}
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={() => { setEditUser(null); loadUsers() }}
          setMsg={setEditMsg}
          setErr={setEditErr}
          msg={editMsg}
          err={editErr}
        />
      )}

      {/* ───── Delete Modal ───── */}
      {deleteUser && (
        <DeleteUserModal
          token={token}
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={() => { setDeleteUser(null); loadUsers() }}
          setMsg={setDeleteMsg}
          setErr={setDeleteErr}
          msg={deleteMsg}
          err={deleteErr}
        />
      )}
    </div>
  )
}

/* ───── Add User Modal ───── */

function AddUserModal({
  token, onClose, onCreated, msg, err, setMsg, setErr,
}: {
  token: string; onClose: () => void; onCreated: () => void
  msg: string; err: string; setMsg: (v: string) => void; setErr: (v: string) => void
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    setLoading(true); setMsg(""); setErr("")
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to create user")
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong")
    } finally { setLoading(false) }
  }

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content modal-glass" style={{ borderRadius: 16 }}>
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#1e1b4b" }}>Add New User</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input className="glass-input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input className="glass-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="glass-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Password (for Keycloak)</label>
                <input className="glass-input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            </div>
            {err && <div className="alert alert-danger mt-3 py-2 mb-0">{err}</div>}
            {msg && <div className="alert alert-success mt-3 py-2 mb-0">{msg}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-glow-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-glow-success" disabled={loading} onClick={handleAdd}>
              {loading ? "Creating..." : "Add User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───── Edit User Modal ───── */

function EditUserModal({
  token, user, onClose, onUpdated, msg, err, setMsg, setErr,
}: {
  token: string; user: Profile; onClose: () => void; onUpdated: () => void
  msg: string; err: string; setMsg: (v: string) => void; setErr: (v: string) => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? "",
    flat_number: user.flat_number ?? "",
    floor_number: user.floor_number ?? "",
    resident_type: user.resident_type ?? "",
    family_members: user.family_members != null ? String(user.family_members) : "",
    vehicle_details: user.vehicle_details ?? "",
  })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true); setMsg(""); setErr("")
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          flat_number: form.flat_number.trim() || null,
          floor_number: form.floor_number.trim() || null,
          resident_type: form.resident_type.trim() || null,
          family_members: form.family_members ? parseInt(form.family_members, 10) : null,
          vehicle_details: form.vehicle_details.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to update")
      onUpdated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong")
    } finally { setLoading(false) }
  }

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content modal-glass" style={{ borderRadius: 16 }}>
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#1e1b4b" }}>Edit User: {user.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3 p-2" style={{ background: "#eef2ff", borderRadius: 8, border: "1px solid #c7d2fe" }}>
              <strong style={{ color: "#4f46e5" }}>Email:</strong> {user.email}
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="glass-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="glass-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Flat Number</label>
                <input className="glass-input" value={form.flat_number} onChange={(e) => setForm({ ...form, flat_number: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Floor Number</label>
                <input className="glass-input" value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Resident Type</label>
                <select className="glass-select" value={form.resident_type} onChange={(e) => setForm({ ...form, resident_type: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="self">Self Resident</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Family Members</label>
                <input className="glass-input" type="number" min="1" value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Vehicle Details</label>
                <input className="glass-input" value={form.vehicle_details} onChange={(e) => setForm({ ...form, vehicle_details: e.target.value })} />
              </div>
            </div>
            {err && <div className="alert alert-danger mt-3 py-2 mb-0">{err}</div>}
            {msg && <div className="alert alert-success mt-3 py-2 mb-0">{msg}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-glow-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-glow" disabled={loading} onClick={handleSave}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───── Delete User Modal ───── */

function DeleteUserModal({
  token, user, onClose, onDeleted, msg, err, setMsg, setErr,
}: {
  token: string; user: Profile; onClose: () => void; onDeleted: () => void
  msg: string; err: string; setMsg: (v: string) => void; setErr: (v: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true); setMsg(""); setErr("")
    try {
      const res = await fetch(`${API_URL}/users/${user.id}/keycloak`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to delete")
      onDeleted()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong")
    } finally { setLoading(false) }
  }

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 450 }}>
        <div className="modal-content modal-glass" style={{ borderRadius: 16 }}>
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#dc2626" }}>Confirm Delete</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?</p>
            <p style={{ color: "#dc2626", fontSize: "0.9rem" }}>This will permanently remove the user from both Keycloak and the database.</p>
            {err && <div className="alert alert-danger py-2 mb-0">{err}</div>}
            {msg && <div className="alert alert-success py-2 mb-0">{msg}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-glow-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-glow-danger" disabled={loading} onClick={handleDelete}>
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
