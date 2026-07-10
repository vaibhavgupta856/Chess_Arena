import type { GameState } from '../types'

type Props = {
  game: GameState
  atLivePosition: boolean
  viewPly: number
  onUndo: () => void
  onRedo: () => void
  onOpenMenu: () => void
}

function shortStatus(game: GameState, atLive: boolean, viewPly: number) {
  if (!atLive) return `Move ${viewPly}`
  if (game.botThinking) return 'Bot thinking…'
  if (game.over) return game.outcome
  if (game.waitingFor) return `Waiting for ${game.waitingFor}`
  if (game.inCheck) return `${game.turn} — check!`
  return `${game.turn} to move`
}

export function MobileGameBar({
  game,
  atLivePosition,
  viewPly,
  onUndo,
  onRedo,
  onOpenMenu,
}: Props) {
  const maxPly = game.ply ?? (game.positionFens?.length ?? 1) - 1

  return (
    <div className="mobile-game-bar">
      <div className="mobile-game-bar-status">
        <span className="mobile-game-bar-turn">{shortStatus(game, atLivePosition, viewPly)}</span>
        <span className="mobile-game-bar-meta">
          {game.mode ?? 'local'} · you: {game.yourColor || '—'}
        </span>
      </div>
      <div className="mobile-game-bar-actions">
        <button
          type="button"
          className="mobile-bar-btn"
          onClick={onUndo}
          disabled={viewPly <= 0}
          aria-label="Step back"
        >
          ←
        </button>
        <button
          type="button"
          className="mobile-bar-btn"
          onClick={onRedo}
          disabled={viewPly >= maxPly}
          aria-label="Step forward"
        >
          →
        </button>
        <button type="button" className="mobile-bar-btn mobile-bar-btn--menu" onClick={onOpenMenu}>
          Menu
        </button>
      </div>
    </div>
  )
}
