import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const session = await auth()
  const roles = (session?.user as { roles?: string[] })?.roles ?? []

  if (!session?.user) redirect("/login")
  if (!roles.includes("admin")) redirect("/dashboard")

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, administrator!</p>
      <p>This page is only accessible to users with the <strong>admin</strong> role.</p>
      <h2>Your Session</h2>
      <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px", overflow: "auto" }}>
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  )
}
