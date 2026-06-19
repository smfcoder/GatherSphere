import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

type KeycloakJwtPayload = {
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
  email?: string
  preferred_username?: string
  name?: string
  picture?: string
}

function decodeJwtPayload(accessToken: string): KeycloakJwtPayload {
  const [, payload] = accessToken.split(".")

  if (!payload) return {}

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  const json = Buffer.from(padded, "base64").toString("utf-8")

  return JSON.parse(json)
}

function extractRoles(payload: KeycloakJwtPayload): string[] {
  const realmRoles = payload.realm_access?.roles ?? []
  const resourceRoles = Object.values(payload.resource_access ?? {}).flatMap(
    (client) => client.roles ?? []
  )

  return Array.from(new Set([...realmRoles, ...resourceRoles])).filter((role) =>
    ["admin", "user"].includes(role)
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token

      if (token.accessToken) {
        const payload = decodeJwtPayload(token.accessToken as string)
        token.roles = extractRoles(payload)
      }

      return token
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.roles = Array.isArray(token.roles) ? token.roles : []
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnLogin = nextUrl.pathname.startsWith("/login")

      if (isOnLogin) return true

      if (isOnAdmin) {
        const roles = (auth?.user as { roles?: string[] })?.roles ?? []
        if (!isLoggedIn) return false
        if (!roles.includes("admin")) return Response.redirect(new URL("/", nextUrl))
        return true
      }

      if (isOnDashboard) return isLoggedIn

      return true
    },
  },
  pages: {
    signIn: "/login",
  },
})
