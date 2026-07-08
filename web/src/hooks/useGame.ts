import { useCallback, useEffect, useRef, useState } from 'react'
import { diffBoardTransition, fenToPieces } from '../lib/fen'
import { getClientId } from '../lib/clientId'
import {
  playCaptureSound,
  playGameEndSound,
  playMoveSound,
} from '../lib/chessSounds'
import type { CreateGameOptions, GameMode, GameState } from '../types'

const API_BASE =
  import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.length > 0
    ? import.meta.env.VITE_API_BASE
    : import.meta.env.DEV
      ? '/api'
      : 'http://localhost:8080'

function normalizeGameState(data: GameState): GameState {
  const mode = data.mode ?? 'local'
  const positionFens =
    data.positionFens && data.positionFens.length > 0 ? data.positionFens : [data.fen]
  const ply = data.ply ?? positionFens.length - 1
  let yourColor = data.yourColor
  if (!yourColor && mode === 'local') {
    yourColor = 'both'
  }
  return {
    ...data,
    mode,
    positionFens,
    ply,
    yourColor,
  }
}

function wsUrl(gameId: string, clientId: string) {
  if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/api/ws/games/${gameId}?clientId=${encodeURIComponent(clientId)}`
  }
  return (
    API_BASE.replace(/^http/, 'ws').replace(/\/+$/, '') +
    `/ws/games/${gameId}?clientId=${encodeURIComponent(clientId)}`
  )
}

function gameUrl(gameId: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('game', gameId)
  return url.toString()
}

export function useGame() {
  const clientId = useRef(getClientId()).current
  const [game, setGame] = useState<GameState | null>(null)
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby')
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [viewPly, setViewPly] = useState(0)
  const prevFenRef = useRef<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const playMoveFeedback = useCallback((prevFen: string | null, next: GameState) => {
    if (!prevFen || prevFen === next.fen) return
    const { captures } = diffBoardTransition(fenToPieces(prevFen), fenToPieces(next.fen))
    if (next.over) {
      playGameEndSound()
    } else if (captures.length > 0) {
      playCaptureSound()
    } else {
      playMoveSound()
    }
  }, [])

  const connectSocket = useCallback(
    (gameId: string) => {
      socketRef.current?.close()
      const socket = new WebSocket(wsUrl(gameId, clientId))
      socket.onmessage = (event) => {
        const updated = normalizeGameState(JSON.parse(event.data) as GameState)
        setViewPly(updated.ply ?? 0)
        setGame((current) => {
          playMoveFeedback(current?.fen ?? null, updated)
          prevFenRef.current = updated.fen
          return updated
        })
      }
      socket.onerror = () => {
        setError('Live connection lost — moves still work via server')
      }
      socketRef.current = socket
    },
    [clientId, playMoveFeedback],
  )

  const applyGame = useCallback(
    (data: GameState, openSocket = true) => {
      const normalized = normalizeGameState(data)
      prevFenRef.current = normalized.fen
      setGame(normalized)
      setViewPly(normalized.ply ?? 0)
      setScreen('game')
      setInviteLink(normalized.mode === 'online' ? gameUrl(normalized.id) : null)
      if (openSocket) connectSocket(normalized.id)
    },
    [connectSocket],
  )

  const refreshGame = useCallback(async (id: string) => {
    const res = await fetch(`${API_BASE}/games/${id}?clientId=${encodeURIComponent(clientId)}`)
    if (!res.ok) throw new Error(await res.text())
    return normalizeGameState((await res.json()) as GameState)
  }, [clientId])

  const createGame = useCallback(
    async (options: CreateGameOptions) => {
      try {
        setError(null)
        const playAs =
          options.playAs === 'random'
            ? Math.random() < 0.5
              ? 'white'
              : 'black'
            : options.playAs ?? 'white'
        const res = await fetch(`${API_BASE}/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: options.mode,
            playAs,
            clientId,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as GameState
        applyGame(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create game'
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError(
            'Cannot reach the chess server. Start it with: go run ./cmd/server (port 8080), then refresh.',
          )
        } else {
          setError(msg)
        }
      }
    },
    [applyGame, clientId],
  )

  const joinGame = useCallback(
    async (gameId: string) => {
      try {
        setError(null)
        const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as GameState
        applyGame(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join game')
      }
    },
    [applyGame, clientId],
  )

  const loadGame = useCallback(
    async (gameId: string) => {
      setError(null)
      const data = await refreshGame(gameId)
      if (data.mode === 'online' && !data.yourColor) {
        await joinGame(gameId)
        return
      }
      applyGame(data)
    },
    [applyGame, joinGame, refreshGame],
  )

  const submitMove = useCallback(
    async (uci: string) => {
      if (!game) return
      const livePly = game.ply ?? 0
      if (viewPly < livePly) {
        setError('Go to the latest move before playing.')
        return
      }
      const res = await fetch(`${API_BASE}/games/${game.id}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uci, clientId }),
      })
      if (!res.ok) {
        const msg = await res.text()
        const latest = await refreshGame(game.id)
        setGame(latest)
        setViewPly(latest.ply ?? 0)
        setError(msg)
        return
      }
      const data = normalizeGameState((await res.json()) as GameState)
      playMoveFeedback(game.fen, data)
      prevFenRef.current = data.fen
      setViewPly(data.ply ?? 0)
      setGame(data)
      setError(null)
    },
    [clientId, game, playMoveFeedback, refreshGame, viewPly],
  )

  const resign = useCallback(
    async (color?: 'white' | 'black') => {
      if (!game) return
      const res = await fetch(`${API_BASE}/games/${game.id}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, color }),
      })
      if (!res.ok) {
        setError(await res.text())
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [clientId, game],
  )

  const offerDraw = useCallback(async (color?: 'white' | 'black') => {
    if (!game) return
    const res = await fetch(`${API_BASE}/games/${game.id}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'draw_offer', clientId, color }),
    })
    if (!res.ok) {
      setError(await res.text())
      return
    }
    const data = (await res.json()) as GameState
    setGame(data)
    setError(null)
  }, [clientId, game])

  const respondDraw = useCallback(
    async (accept: boolean, color?: 'white' | 'black') => {
      if (!game) return
      const res = await fetch(`${API_BASE}/games/${game.id}/draw/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, accept, color }),
      })
      if (!res.ok) {
        setError(await res.text())
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [clientId, game],
  )

  const claimDraw = useCallback(
    async (type: 'threefold_repetition' | 'fifty_move_rule') => {
      if (!game) return
      const res = await fetch(`${API_BASE}/games/${game.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, clientId }),
      })
      if (!res.ok) {
        setError(await res.text())
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [clientId, game],
  )

  const undoView = useCallback(() => {
    setViewPly((p) => Math.max(0, p - 1))
  }, [])

  const redoView = useCallback(() => {
    if (!game) return
    const max = game.ply ?? 0
    setViewPly((p) => Math.min(max, p + 1))
  }, [game])

  const displayFen =
    (game?.positionFens?.[viewPly] && game.positionFens[viewPly].includes('/')
      ? game.positionFens[viewPly]
      : game?.fen) ?? ''

  const livePly = game?.ply ?? 0
  const atLivePosition = !game || viewPly >= livePly

  const leaveToLobby = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
    setGame(null)
    setScreen('lobby')
    setInviteLink(null)
    setError(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('game')
    window.history.replaceState({}, '', url.toString())
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gameId = params.get('game')
    if (!gameId) return
    loadGame(gameId).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    })
    return () => {
      socketRef.current?.close()
    }
  }, [loadGame])

  return {
    game,
    screen,
    error,
    inviteLink,
    clientId,
    createGame,
    joinGame,
    loadGame,
    submitMove,
    resign,
    offerDraw,
    respondDraw,
    claimDraw,
    leaveToLobby,
    viewPly,
    undoView,
    redoView,
    displayFen,
    atLivePosition,
  }
}

export function canPlayerMove(game: GameState, atLive = true): boolean {
  if (!atLive || game.over) return false
  const mode = game.mode ?? 'local'
  if (mode === 'local' || game.yourColor === 'both') return true
  if (mode === 'online' && game.waitingFor) return false
  if (!game.yourColor) {
    // Legacy API responses without role metadata — allow play; server validates moves.
    return mode !== 'online'
  }
  return game.yourColor === game.turn
}

export type { GameMode }
