import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

const API_URL = process.env.API_BASE_URL ?? "http://localhost:8000"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Sync user to app database on every dashboard visit
  const token = (session as any).accessToken
  if (token) {
    try {
      await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
    } catch {
      // Silently ignore — user will still see the dashboard
    }
  }

  const roles = (session?.user as { roles?: string[] })?.roles ?? []
  const isAdmin = roles.includes("admin")

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm p-4 mb-4 text-center border-0" style={{ background: "#f8f9ff", borderRadius: 16 }}>
            <h2 className="mb-1" style={{ color: "#1e1b4b" }}>Welcome, {session.user.name ?? "User"}</h2>
            <p style={{ color: "#6b7280", margin: 0 }}>{session.user.email}</p>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
                <div className="card shadow-sm p-4 text-center border-0 h-100" style={{ background: "#f8f9ff", borderRadius: 16, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}>
                  <h5 style={{ color: "#4f46e5" }}>My Profile</h5>
                  <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
                    View and edit your personal details, flat info, and more.
                  </p>
                </div>
              </Link>
            </div>

            {isAdmin && (
              <div className="col-md-6">
                <Link href="/admin" style={{ textDecoration: "none" }}>
                  <div className="card shadow-sm p-4 text-center border-0 h-100" style={{ background: "#f8f9ff", borderRadius: 16, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}>
                    <h5 style={{ color: "#4f46e5" }}>Admin Panel</h5>
                    <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
                      Manage users, edit details, add or remove residents.
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
