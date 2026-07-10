export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE?.trim()
  if (env) return env.replace(/\/+$/, '')
  if (import.meta.env.DEV) return '/api'
  return ''
}

export async function checkServerHealth(apiBase: string): Promise<boolean> {
  if (!apiBase) return false
  try {
    const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(8000) })
    if (res.ok) return true
  } catch {
    // fall through — legacy backends may not expose /health yet
  }
  try {
    const res = await fetch(`${apiBase}/games`, { signal: AbortSignal.timeout(8000) })
    // Go server returns 405 for GET /games when alive but route is POST-only
    return res.status === 405 || res.ok
  } catch {
    return false
  }
}
