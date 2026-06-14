import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await auth()

  if (session?.user) redirect("/dashboard")

  return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h1>Sign In</h1>
      <p>Authenticate with Keycloak to continue.</p>
      <form
        action={async () => {
          "use server"
          await signIn("keycloak", { redirectTo: "/dashboard" })
        }}
      >
        <button type="submit" style={{ padding: "0.75rem 2rem", cursor: "pointer", marginTop: "1rem" }}>
          Sign in with Keycloak
        </button>
      </form>
    </div>
  )
}
