import { useState } from 'react'
import type { CreateGameOptions, GameMode } from '../types'

type Props = {
  onCreate: (options: CreateGameOptions) => Promise<void>
  onJoin: (gameId: string) => Promise<void>
  error: string | null
}

export function GameLobby({ onCreate, onJoin, error }: Props) {
  const [joinId, setJoinId] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const modeCard = (mode: GameMode, title: string, desc: string, playAs?: 'white' | 'black') => (
    <button
      type="button"
      className="lobby-card"
      disabled={busy}
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
        <p>Bot, online rooms, local hot-seat — 2D and 3D boards with sound.</p>
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
          />
          <button
            type="button"
            disabled={busy || !joinId}
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
        <p className="lobby-hint">
          Coming later: puzzles, analysis, clocks, ratings, chat, and more chess.com-style modes.
        </p>
      </div>
    </div>
  )
}
