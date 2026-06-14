import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import SessionWrapper from "@/components/session-wrapper"
import Navbar from "@/components/navbar"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Society App",
  description: "Next.js frontend with Keycloak OIDC auth",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SessionWrapper>
          <Navbar />
          <main style={{ padding: "2rem" }}>{children}</main>
        </SessionWrapper>
      </body>
    </html>
  )
}
