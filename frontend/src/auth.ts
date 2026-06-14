import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token
      if (profile) {
        const keycloakProfile = profile as { realm_access?: { roles: string[] } }
        token.roles = keycloakProfile.realm_access?.roles ?? []
      }
      return token
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.roles = (token.roles as string[]) ?? []
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
        if (!roles.includes("admin")) return Response.redirect(new URL("/dashboard", nextUrl))
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
