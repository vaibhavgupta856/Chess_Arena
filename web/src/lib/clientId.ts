const STORAGE_KEY = 'chessarena-client-id'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function getClientId(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const id = randomId()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}
