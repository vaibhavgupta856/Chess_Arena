import { useCallback, useEffect, useRef, useState } from 'react'
import { diffBoardTransition, fenToPieces } from '../lib/fen'
import { getGameClientId, getHostClientId, getTabClientId, getActiveClientForGame, setActiveClientForGame, clearActiveClientForGame, markGameHostedInTab, isGameHostedInTab } from '../lib/clientId'
import {
  playCaptureSound,
  playGameEndSound,
  playMoveSound,
} from '../lib/chessSounds'
import { checkServerHealth, getApiBase, apiHeaders } from '../lib/api'
import type { CreateGameOptions, GameMode, GameState } from '../types'

const API_BASE = getApiBase()

function normalizeGameState(data: GameState, clientId?: string): GameState {
  const mode = data.mode ?? 'local'
  const positionFens =
    data.positionFens && data.positionFens.length > 0 ? data.positionFens : [data.fen]
  const ply = data.ply ?? positionFens.length - 1

  let waitingFor: GameState['waitingFor'] = ''
  if (mode === 'online') {
    if (!data.whitePlayer) waitingFor = 'white'
    else if (!data.blackPlayer) waitingFor = 'black'
  }

  let yourColor = data.yourColor
  if (mode === 'local') {
    yourColor = 'both'
  } else if (mode === 'bot') {
    if (data.whitePlayer === 'bot') yourColor = 'black'
    else if (data.blackPlayer === 'bot') yourColor = 'white'
    else if (clientId && clientId === data.whitePlayer) yourColor = 'white'
    else if (clientId && clientId === data.blackPlayer) yourColor = 'black'
  } else if (clientId) {
    if (clientId === data.whitePlayer) yourColor = 'white'
    else if (clientId === data.blackPlayer) yourColor = 'black'
  }

  return {
    ...data,
    mode,
    positionFens,
    ply,
    yourColor,
    waitingFor,
  }
}

function wsUrl(gameId: string, clientId: string) {
  if (!API_BASE) return ''
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
  const hostId = useRef(getHostClientId()).current
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
      if (!API_BASE) return
      socketRef.current?.close()
      const socket = new WebSocket(wsUrl(gameId, getGameClientId(gameId)))
      socket.onmessage = (event) => {
        const cid = getGameClientId(gameId)
        const updated = normalizeGameState(JSON.parse(event.data) as GameState, cid)
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
    [playMoveFeedback],
  )

  const applyGame = useCallback(
    (data: GameState, gameClientId: string, openSocket = true, hostedInTab = false) => {
      const normalized = normalizeGameState(data, gameClientId)
      setActiveClientForGame(normalized.id, gameClientId)
      if (hostedInTab) markGameHostedInTab(normalized.id)
      prevFenRef.current = normalized.fen
      setGame(normalized)
      setViewPly(normalized.ply ?? 0)
      setScreen('game')
      setInviteLink(normalized.mode === 'online' ? gameUrl(normalized.id) : null)
      if (openSocket) connectSocket(normalized.id)
    },
    [connectSocket],
  )

  const refreshGame = useCallback(async (id: string, clientId?: string) => {
    const cid = clientId ?? getGameClientId(id)
    const res = await fetch(`${API_BASE}/games/${id}?clientId=${encodeURIComponent(cid)}`)
    if (!res.ok) throw new Error(await res.text())
    return normalizeGameState((await res.json()) as GameState, cid)
  }, [])

  const createGame = useCallback(
    async (options: CreateGameOptions) => {
      try {
        setError(null)
        if (!API_BASE) {
          setError(
            'Chess server is not connected. The live site needs the Go API deployed (see render.yaml in the repo).',
          )
          return
        }
        const playAs =
          options.playAs === 'random'
            ? Math.random() < 0.5
              ? 'white'
              : 'black'
            : options.playAs ?? 'white'
        const res = await fetch(`${API_BASE}/games`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({
            mode: options.mode,
            playAs,
            clientId: hostId,
            botLevel: options.botLevel ?? 'casual',
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as GameState
        applyGame(data, hostId, true, true)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create game'
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError(
            API_BASE
              ? 'Cannot reach the chess server. If you are the site owner, check that the API is running and VITE_API_BASE is set on Vercel.'
              : 'Chess server is not configured for this deployment.',
          )
        } else {
          setError(msg)
        }
      }
    },
    [applyGame, hostId],
  )

  const joinGame = useCallback(
    async (gameId: string) => {
      try {
        setError(null)
        const tabId = getTabClientId()
        const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ clientId: tabId }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as GameState
        applyGame(data, tabId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join game')
      }
    },
    [applyGame],
  )

  const loadGame = useCallback(
    async (gameId: string) => {
      setError(null)

      const active = getActiveClientForGame(gameId)
      if (active) {
        applyGame(await refreshGame(gameId, active), active)
        return
      }

      if (isGameHostedInTab(gameId)) {
        applyGame(await refreshGame(gameId, hostId), hostId)
        return
      }

      const peek = await refreshGame(gameId, hostId)
      if (peek.mode === 'online' && !peek.blackPlayer) {
        const tabId = getTabClientId()
        const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ clientId: tabId }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = (await res.json()) as GameState
        applyGame(data, tabId)
        return
      }

      if (peek.whitePlayer === hostId || peek.blackPlayer === hostId) {
        applyGame(peek, hostId)
        return
      }

      const tabId = getTabClientId()
      if (peek.whitePlayer === tabId || peek.blackPlayer === tabId) {
        applyGame(await refreshGame(gameId, tabId), tabId)
        return
      }

      const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ clientId: tabId }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as GameState
      applyGame(data, tabId)
    },
    [applyGame, hostId, refreshGame],
  )

  const submitMove = useCallback(
    async (uci: string) => {
      if (!game) return
      const livePly = game.ply ?? 0
      if (viewPly < livePly) {
        setError('Go to the latest move before playing.')
        return
      }
      const cid = getGameClientId(game.id)
      const res = await fetch(`${API_BASE}/games/${game.id}/moves`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ uci, clientId: cid }),
      })
      if (!res.ok) {
        const msg = await res.text()
        const latest = await refreshGame(game.id, cid)
        setGame(latest)
        setViewPly(latest.ply ?? 0)
        setError(msg)
        return
      }
      const data = normalizeGameState((await res.json()) as GameState, cid)
      playMoveFeedback(game.fen, data)
      prevFenRef.current = data.fen
      setViewPly(data.ply ?? 0)
      setGame(data)
      setError(null)
    },
    [game, playMoveFeedback, refreshGame, viewPly],
  )


  const resign = useCallback(
    async (color?: 'white' | 'black') => {
      if (!game) return
      const cid = getGameClientId(game.id)
      const res = await fetch(`${API_BASE}/games/${game.id}/resign`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ clientId: cid, color }),
      })
      if (!res.ok) {
        setError(await res.text())
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [game],
  )

  const offerDraw = useCallback(async (color?: 'white' | 'black') => {
    if (!game) return
    const cid = getGameClientId(game.id)
    const res = await fetch(`${API_BASE}/games/${game.id}/draw`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ type: 'draw_offer', clientId: cid, color }),
    })
    if (!res.ok) {
      setError(await res.text())
      return
    }
    const data = (await res.json()) as GameState
    setGame(data)
    setError(null)
  }, [game])

  const respondDraw = useCallback(
    async (accept: boolean, color?: 'white' | 'black') => {
      if (!game) return
      const cid = getGameClientId(game.id)
      const res = await fetch(`${API_BASE}/games/${game.id}/draw/respond`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ clientId: cid, accept, color }),
      })
      if (!res.ok) {
        setError(await res.text())
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [game],
  )

  const claimDraw = useCallback(
    async (type: 'threefold_repetition' | 'fifty_move_rule') => {
      if (!game) return
      const cid = getGameClientId(game.id)
      const res = await fetch(`${API_BASE}/games/${game.id}/draw`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ type, clientId: cid }),
      })
      if (!res.ok) {
        setError(await res.text())
        return
      }
      const data = (await res.json()) as GameState
      setGame(data)
      setError(null)
    },
    [game],
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
    if (game) clearActiveClientForGame(game.id)
    socketRef.current?.close()
    socketRef.current = null
    setGame(null)
    setScreen('lobby')
    setInviteLink(null)
    setError(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('game')
    window.history.replaceState({}, '', url.toString())
  }, [game])

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
    clientId: hostId,
    createGame,
    joinGame,
    loadGame,
    enterGame: applyGame,
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
    apiBase: API_BASE,
    checkServerHealth: () => checkServerHealth(API_BASE),
  }
}

export function canPlayerMove(game: GameState, atLive = true): boolean {
  if (game.botThinking) return false
  if (!atLive || game.over) return false
  const mode = game.mode ?? 'local'
  if (mode === 'local' || game.yourColor === 'both') return true
  if (mode === 'online' && game.waitingFor) return false
  if (mode === 'bot') {
    if (!game.yourColor) return false
    return game.yourColor === game.turn
  }
  if (!game.yourColor) {
    return false
  }
  return game.yourColor === game.turn
}

export type { GameMode }
