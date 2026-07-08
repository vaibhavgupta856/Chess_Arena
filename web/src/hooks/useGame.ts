import { useCallback, useEffect, useState } from 'react'
import type { GameState } from '../types'

const API_BASE =
  import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.length > 0
    ? import.meta.env.VITE_API_BASE
    : 'http://localhost:8080'

export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshGame = useCallback(async (id: string) => {
    const res = await fetch(`${API_BASE}/games/${id}`)
    if (!res.ok) {
      throw new Error(await res.text())
    }
    return (await res.json()) as GameState
  }, [])

  const submitMove = useCallback(
    async (uci: string) => {
      if (!game) return
      const res = await fetch(`${API_BASE}/games/${game.id}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uci }),
      })
      if (!res.ok) {
        const msg = await res.text()
        const latest = await refreshGame(game.id)
        setGame(latest)
        setError(msg)
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [game, refreshGame],
  )

  useEffect(() => {
    let socket: WebSocket | null = null
    let cancelled = false

    async function createGame() {
      try {
        const res = await fetch(`${API_BASE}/games`, { method: 'POST' })
        if (!res.ok) {
          throw new Error(await res.text())
        }
        const data = (await res.json()) as GameState
        if (cancelled) return
        setGame(data)

        const wsUrl =
          API_BASE.replace(/^http/, 'ws').replace(/\/+$/, '') +
          `/ws/games/${data.id}`
        socket = new WebSocket(wsUrl)
        socket.onmessage = (event) => {
          const updated = JSON.parse(event.data) as GameState
          setGame(updated)
        }
        socket.onerror = () => {
          setError('WebSocket connection failed')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to create game')
        }
      }
    }

    createGame()
    return () => {
      cancelled = true
      socket?.close()
    }
  }, [])

  return { game, error, submitMove }
}
