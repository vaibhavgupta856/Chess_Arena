import { useEffect, useState } from 'react'
import type { CreateGameOptions, GameMode } from '../types'

type Props = {
  onCreate: (options: CreateGameOptions) => Promise<void>
  onJoin: (gameId: string) => Promise<void>
  error: string | null
  apiBase: string
  checkServerHealth: () => Promise<boolean>
}

export function GameLobby({ onCreate, onJoin, error, apiBase, checkServerHealth }: Props) {
  const [joinId, setJoinId] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverOk, setServerOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!apiBase) {
        setServerOk(false)
        return
      }
      const ok = await checkServerHealth()
      if (!cancelled) setServerOk(ok)
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase, checkServerHealth])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const canPlay = serverOk === true

  const modeCard = (mode: GameMode, title: string, desc: string, playAs?: 'white' | 'black') => (
    <button
      type="button"
      className="lobby-card"
      disabled={busy || !canPlay}
      onClick={() => run(() => onCreate({ mode, playAs }))}
    >
      <strong>{title}</strong>
      <span>{desc}</span>
    </button>
  )

  return (
    <div className="lobby">
      <div className="lobby-hero">
        <h2>Play Chess</h2>
        <p>Choose a mode below. Use <strong>2D</strong> for instant pieces, or <strong>3D</strong> after models finish loading (~180MB first visit).</p>
      </div>

      <div className={`server-status${serverOk === true ? ' server-status--ok' : serverOk === false ? ' server-status--bad' : ''}`}>
        {serverOk === null && <p>Checking chess server…</p>}
        {serverOk === true && <p>✓ Chess server connected — pick a mode to start.</p>}
        {serverOk === false && (
          <p>
            ✗ Chess server not reachable.
            {!apiBase
              ? ' Production needs the Go API deployed and VITE_API_BASE set on Vercel.'
              : ' The API may be starting up (free tier) — wait 30s and refresh.'}
          </p>
        )}
      </div>

      <div className="lobby-grid">
        {modeCard('bot', 'Play vs Bot', 'Practice against the built-in engine.', 'white')}
        {modeCard('bot', 'Bot as White', 'You play black; bot moves first.', 'black')}
        {modeCard('online', 'Create Online Room', 'Share a link — friend joins as black on another device.')}
        {modeCard('local', 'Local / Hot Seat', 'Two players on this device, both colors.')}
      </div>

      <div className="lobby-join">
        <h3>Join room</h3>
        <div className="lobby-join-row">
          <input
            type="text"
            placeholder="Room code (game id)"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value.trim())}
            disabled={!canPlay}
          />
          <button
            type="button"
            disabled={busy || !joinId || !canPlay}
            onClick={() => run(() => onJoin(joinId))}
          >
            Join
          </button>
        </div>
        <p className="lobby-hint">Open a shared link from a friend, or paste the room code here.</p>
      </div>

      {error && <p className="error lobby-error">{error}</p>}

      <div className="lobby-features">
        <h3>Included features</h3>
        <ul>
          <li>Legal moves, check, checkmate, stalemate</li>
          <li>Castling, en passant, promotion (queen)</li>
          <li>Resign, draw offers, threefold &amp; fifty-move claims</li>
          <li>Move history, live sync, 2D / 3D views</li>
          <li>Captured pieces on Valhalla (3D)</li>
        </ul>
      </div>
    </div>
  )
}
