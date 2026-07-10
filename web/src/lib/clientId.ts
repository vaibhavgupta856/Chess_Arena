const PLAYER_KEY = 'chessarena-player-id'
const TAB_KEY = 'chessarena-tab-id'
const ACTIVE_PREFIX = 'chessarena-active-'
const HOSTED_TAB_KEY = 'chessarena-hosted-tab-games'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function getOrCreate(storage: Storage, key: string): string {
  const existing = storage.getItem(key)
  if (existing) return existing
  const id = randomId()
  storage.setItem(key, id)
  return id
}

/** Persistent identity — used when creating online rooms (you are White). */
export function getHostClientId(): string {
  return getOrCreate(localStorage, PLAYER_KEY)
}

/** Per-browser-tab identity — used when joining a room (you become Black). */
export function getTabClientId(): string {
  return getOrCreate(sessionStorage, TAB_KEY)
}

export function setActiveClientForGame(gameId: string, clientId: string) {
  sessionStorage.setItem(`${ACTIVE_PREFIX}${gameId}`, clientId)
}

export function getActiveClientForGame(gameId: string): string | null {
  return sessionStorage.getItem(`${ACTIVE_PREFIX}${gameId}`)
}

export function clearActiveClientForGame(gameId: string) {
  sessionStorage.removeItem(`${ACTIVE_PREFIX}${gameId}`)
}

/** Games created in this tab — creator rejoins as White via invite URL. */
export function markGameHostedInTab(gameId: string) {
  const hosted = JSON.parse(sessionStorage.getItem(HOSTED_TAB_KEY) ?? '[]') as string[]
  if (!hosted.includes(gameId)) {
    hosted.push(gameId)
    sessionStorage.setItem(HOSTED_TAB_KEY, JSON.stringify(hosted))
  }
}

export function isGameHostedInTab(gameId: string): boolean {
  const hosted = JSON.parse(sessionStorage.getItem(HOSTED_TAB_KEY) ?? '[]') as string[]
  return hosted.includes(gameId)
}

/** Client id to use for API calls in an active game. */
export function getGameClientId(gameId: string): string {
  return getActiveClientForGame(gameId) ?? getHostClientId()
}

// Back-compat for any legacy imports
export function getClientId(): string {
  return getHostClientId()
}
