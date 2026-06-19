"use client"

import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"

export default function Navbar() {
  const { data: session, status } = useSession()
  const roles = (session?.user as { roles?: string[] })?.roles ?? []
  const isAdmin = roles.includes("admin")

  return (
    <nav className="nav-glass" style={{ display: "flex", gap: "1.25rem", padding: "0.75rem 2rem", alignItems: "center" }}>
      <Link href="/" style={{ fontWeight: "bold", color: "#4f46e5", fontSize: "1.1rem" }}>
        Society App
      </Link>

      {status === "authenticated" && (
        <>
          <Link href="/dashboard" style={{ color: "#6b7280" }}>Dashboard</Link>
          <Link href="/dashboard/profile" style={{ color: "#6b7280" }}>Profile</Link>
        </>
      )}

      {isAdmin && (
        <Link href="/admin" style={{ color: "#6b7280" }}>Admin</Link>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {status === "authenticated" ? (
          <>
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              {session?.user?.email ?? session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ redirectTo: "/" })}
              className="btn btn-sm btn-glow-secondary"
              style={{ padding: "0.3rem 0.85rem", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </>
        ) : status === "unauthenticated" ? (
          <button
            onClick={() => signIn("keycloak")}
            className="btn btn-sm btn-glow"
            style={{ padding: "0.3rem 0.85rem", fontSize: "0.85rem", cursor: "pointer" }}
          >
            Sign In
          </button>
        ) : (
          <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading...</span>
        )}
      </div>
    </nav>
  )
}
