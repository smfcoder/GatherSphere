import { auth } from "@/auth"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000"

export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await auth()
  const accessToken = session?.accessToken

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers })
}
