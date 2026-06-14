import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) redirect("/login")

  const user = session.user as { name?: string; email?: string; roles?: string[] }

  return (
    <div>
      <h1>User Dashboard</h1>
      <p>Welcome, {user.name ?? user.email}!</p>
      <h2>Your Session</h2>
      <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px", overflow: "auto" }}>
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  )
}
