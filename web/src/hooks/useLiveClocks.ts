import { useEffect, useState } from 'react'
import type { GameState } from '../types'

export function formatClockMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function liveRemaining(
  storedMs: number | undefined,
  isActive: boolean,
  clockRunning: boolean | undefined,
  clockUpdatedAt: number | undefined,
  now: number,
): number {
  const base = storedMs ?? 0
  if (!isActive || !clockRunning || !clockUpdatedAt) return Math.max(0, base)
  const elapsed = Math.max(0, now - clockUpdatedAt)
  return Math.max(0, base - elapsed)
}

export function useLiveClocks(game: GameState | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!game || game.over || !game.clockRunning || !(game.initialTimeMs && game.initialTimeMs > 0)) {
      return
    }
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [game])

  if (!game) {
    return {
      whiteMs: 0,
      blackMs: 0,
      enabled: false,
      whiteActive: false,
      blackActive: false,
    }
  }

  const enabled = (game.initialTimeMs ?? 0) > 0
  const whiteActive = enabled && !game.over && game.turn === 'white' && !!game.clockRunning
  const blackActive = enabled && !game.over && game.turn === 'black' && !!game.clockRunning

  return {
    enabled,
    whiteActive,
    blackActive,
    whiteMs: liveRemaining(game.whiteTimeMs, whiteActive, game.clockRunning, game.clockUpdatedAt, now),
    blackMs: liveRemaining(game.blackTimeMs, blackActive, game.clockRunning, game.clockUpdatedAt, now),
  }
}
