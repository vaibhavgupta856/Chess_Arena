const TOKEN_KEY = 'chessarena-auth-token'

export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE?.trim()
  if (env) return env.replace(/\/+$/, '')
  if (import.meta.env.DEV) return '/api'
  return ''
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return { ...headers, ...(extra as Record<string, string>) }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getApiBase()
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: apiHeaders(init?.headers),
  })
  return res
}

export async function checkServerHealth(apiBase: string): Promise<boolean> {
  if (!apiBase) return false
  try {
    const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(8000) })
    if (res.ok) return true
  } catch {
    // fall through
  }
  try {
    const res = await fetch(`${apiBase}/games`, { signal: AbortSignal.timeout(8000) })
    return res.status === 405 || res.ok
  } catch {
    return false
  }
}
