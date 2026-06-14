import { auth } from "@/auth"
import Link from "next/link"

export default async function Home() {
  const session = await auth()

  return (
    <div>
      <h1>Welcome to the Society App</h1>
      <p>This is the public home page. Everyone can see this content.</p>

      {session ? (
        <p>
          You are signed in as <strong>{session.user?.email ?? session.user?.name}</strong>.{" "}
          <Link href="/dashboard">Go to Dashboard</Link>
        </p>
      ) : (
        <p>
          <Link href="/login">Sign in</Link> to access your dashboard.
        </p>
      )}
    </div>
  )
}
