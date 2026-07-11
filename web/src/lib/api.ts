const LEGACY_TOKEN_KEY = 'chessarena-auth-token'
const TAB_AUTH_ID_KEY = 'chessarena-tab-auth-id'
const AUTH_CHANNEL = 'chessarena-tab-auth'
const AUTH_RESET_EVENT = 'chessarena-auth-reset'

/** Unique to this JS context — never written to storage. */
const instanceId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `inst-${Math.random().toString(36).slice(2)}`

/** In-memory token for this tab only (cannot leak to other tabs). */
let memoryToken: string | null = null
let isolationReady = false

export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE?.trim()
  if (env) return env.replace(/\/+$/, '')
  if (import.meta.env.DEV) return '/api'
  return ''
}

function wipeSharedAuthKeys() {
  try {
    const localKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(LEGACY_TOKEN_KEY)) localKeys.push(k)
    }
    for (const k of localKeys) localStorage.removeItem(k)
  } catch {
    // ignore
  }
}

function tabId(): string {
  let id = sessionStorage.getItem(TAB_AUTH_ID_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tab-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(TAB_AUTH_ID_KEY, id)
  }
  return id
}

function tokenStorageKey(id: string = tabId()) {
  return `${LEGACY_TOKEN_KEY}:${id}`
}

function rotateTabIdentity() {
  const old = sessionStorage.getItem(TAB_AUTH_ID_KEY)
  if (old) sessionStorage.removeItem(tokenStorageKey(old))
  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2)}`
  sessionStorage.setItem(TAB_AUTH_ID_KEY, next)
  memoryToken = null
  window.dispatchEvent(new CustomEvent(AUTH_RESET_EVENT))
}

/**
 * Isolate this tab from duplicates (Chrome "Duplicate tab" copies sessionStorage).
 * Call once at app startup.
 */
export function initTabAuthIsolation() {
  if (isolationReady || typeof window === 'undefined') return
  isolationReady = true
  wipeSharedAuthKeys()

  // Drop any bare legacy session key
  try {
    sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // ignore
  }

  const id = tabId()
  // Hydrate memory from this tab's session only (for refresh), never from localStorage
  memoryToken = sessionStorage.getItem(tokenStorageKey(id))

  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL)
    channel.onmessage = (event) => {
      const msg = event.data as { type?: string; tabId?: string; instanceId?: string } | null
      if (!msg || msg.instanceId === instanceId) return
      const mine = sessionStorage.getItem(TAB_AUTH_ID_KEY)
      if (!mine || msg.tabId !== mine) return
      if (msg.type === 'claim') {
        // Another context opened with our copied tab id — tell it this id is taken.
        channel.postMessage({ type: 'taken', tabId: mine, instanceId })
      }
      if (msg.type === 'taken') {
        // We are the duplicate tab; split onto a fresh logged-out identity.
        rotateTabIdentity()
        channel.postMessage({ type: 'claim', tabId: sessionStorage.getItem(TAB_AUTH_ID_KEY), instanceId })
      }
    }
    channel.postMessage({ type: 'claim', tabId: id, instanceId })
  } catch {
    // BroadcastChannel unavailable — memory token still prevents cross-tab login sync
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  if (!isolationReady) initTabAuthIsolation()
  wipeSharedAuthKeys()
  if (memoryToken) return memoryToken
  const stored = sessionStorage.getItem(tokenStorageKey())
  memoryToken = stored
  return memoryToken
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (!isolationReady) initTabAuthIsolation()
  wipeSharedAuthKeys()
  memoryToken = token
  const key = tokenStorageKey()
  if (token) sessionStorage.setItem(key, token)
  else sessionStorage.removeItem(key)
}

/** Short id for UI so you can confirm two tabs are different sessions. */
export function getTabAuthLabel(): string {
  if (typeof window === 'undefined') return ''
  if (!isolationReady) initTabAuthIsolation()
  return tabId().slice(0, 8)
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

export { AUTH_RESET_EVENT }
