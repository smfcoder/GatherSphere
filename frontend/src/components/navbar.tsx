"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { signIn, signOut } from "next-auth/react"

export default function Navbar() {
  const { data: session, status } = useSession()
  const roles = (session?.user as { roles?: string[] })?.roles ?? []
  const isAdmin = roles.includes("admin")

  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #ccc", alignItems: "center" }}>
      <Link href="/" style={{ fontWeight: "bold" }}>Home</Link>

      {status === "authenticated" && (
        <Link href="/dashboard">Dashboard</Link>
      )}

      {isAdmin && (
        <Link href="/admin">Admin</Link>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {status === "authenticated" ? (
          <>
            <span style={{ fontSize: "0.875rem", color: "#555" }}>
              {session?.user?.email ?? session?.user?.name}
            </span>
            <button onClick={() => signOut()} style={{ cursor: "pointer" }}>
              Sign Out
            </button>
          </>
        ) : status === "unauthenticated" ? (
          <button onClick={() => signIn("keycloak")} style={{ cursor: "pointer" }}>
            Sign In
          </button>
        ) : (
          <span>Loading...</span>
        )}
      </div>
    </nav>
  )
}
