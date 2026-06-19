"use client"

import { FormEvent, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

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

export default function UserRegistrationForm() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [flatNumber, setFlatNumber] = useState("")
  const [floorNumber, setFloorNumber] = useState("")
  const [residentType, setResidentType] = useState("")
  const [familyMembers, setFamilyMembers] = useState("")
  const [vehicleDetails, setVehicleDetails] = useState("")

  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(false)

  const roles = (session?.user as { roles?: string[] })?.roles ?? []
  const isAdmin = roles.includes("admin")

  function applyProfile(p: Profile) {
    setName(p.name ?? "")
    setEmail(p.email ?? "")
    setPhone(p.phone ?? "")
    setFlatNumber(p.flat_number ?? "")
    setFloorNumber(p.floor_number ?? "")
    setResidentType(p.resident_type ?? "")
    setFamilyMembers(p.family_members != null ? String(p.family_members) : "")
    setVehicleDetails(p.vehicle_details ?? "")
    setProfile(p)
  }

  async function loadProfile() {
    if (status !== "authenticated" || !session?.accessToken) return
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to load profile")
      if (data.user) applyProfile(data.user)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not connect to backend.")
    }
  }

  useEffect(() => { loadProfile() }, [status])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    setErr("")

    const body: Record<string, unknown> = {
      name: name.trim(),
      phone: phone.trim() || null,
      flat_number: flatNumber.trim() || null,
      floor_number: floorNumber.trim() || null,
      resident_type: residentType.trim() || null,
      family_members: familyMembers ? parseInt(familyMembers, 10) : null,
      vehicle_details: vehicleDetails.trim() || null,
    }

    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Failed to save")
      setProfile(data.user)
      setMsg("Profile saved successfully.")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") return <p className="text-center py-5" style={{ color: "#aaa" }}>Loading...</p>
  if (status === "unauthenticated") return <p className="text-center py-5" style={{ color: "#aaa" }}>Please sign in.</p>

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="glass-card">
            <h2 className="mb-4" style={{ color: "#f0f0f0" }}>My Profile</h2>

            {profile && (
              <div className="mb-3 p-3" style={{ background: "rgba(167,139,250,0.1)", borderRadius: 8, border: "1px solid rgba(167,139,250,0.2)" }}>
                <strong style={{ color: "#a78bfa" }}>Email:</strong> {profile.email}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Name</label>
                  <input className="glass-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Phone</label>
                  <input className="glass-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Flat Number</label>
                  <input className="glass-input" placeholder="e.g. A-101" value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Floor Number</label>
                  <input className="glass-input" placeholder="e.g. 3" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Resident Type</label>
                  <select className="glass-select" value={residentType} onChange={(e) => setResidentType(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="self">Self Resident</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Family Members</label>
                  <input className="glass-input" type="number" min="1" placeholder="e.g. 4" value={familyMembers} onChange={(e) => setFamilyMembers(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ color: "#c0c0c0", fontSize: "0.875rem" }}>Vehicle Details</label>
                  <input className="glass-input" placeholder="Car/Bike numbers" value={vehicleDetails} onChange={(e) => setVehicleDetails(e.target.value)} />
                </div>
              </div>

              <div className="d-flex gap-3 mt-4">
                <button type="submit" className="btn btn-glow" disabled={loading}>
                  {loading ? "Saving..." : "Save Profile"}
                </button>

                {isAdmin && (
                  <Link href="/admin" className="btn btn-glow-secondary">
                    Admin Panel
                  </Link>
                )}
              </div>
            </form>

            {msg && <div className="alert alert-success mt-3 mb-0 py-2" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac", borderRadius: 8 }}>{msg}</div>}
            {err && <div className="alert alert-danger mt-3 mb-0 py-2" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 8 }}>{err}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
