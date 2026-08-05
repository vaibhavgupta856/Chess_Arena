import type { GameState } from '../types'
import { formatClockMs, useLiveClocks } from '../hooks/useLiveClocks'

type Props = {
  game: GameState
  compact?: boolean
}

function clockClass(ms: number, active: boolean) {
  const parts = ['game-clock']
  if (active) parts.push('is-active')
  if (ms <= 10_000) parts.push('is-critical')
  else if (ms <= 30_000) parts.push('is-low')
  return parts.join(' ')
}

export function GameClocks({ game, compact = false }: Props) {
  const { enabled, whiteMs, blackMs, whiteActive, blackActive } = useLiveClocks(game)

  if (!enabled) {
    return (
      <div className={`game-clocks${compact ? ' game-clocks--compact' : ''}`}>
        <div className="game-clock is-unlimited">
          <span className="game-clock-label">White</span>
          <span className="game-clock-time">∞</span>
        </div>
        <div className="game-clock is-unlimited">
          <span className="game-clock-label">Black</span>
          <span className="game-clock-time">∞</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`game-clocks${compact ? ' game-clocks--compact' : ''}`} aria-label="Player clocks">
      <div className={clockClass(whiteMs, whiteActive)}>
        <span className="game-clock-label">White</span>
        <span className="game-clock-time">{formatClockMs(whiteMs)}</span>
      </div>
      <div className={clockClass(blackMs, blackActive)}>
        <span className="game-clock-label">Black</span>
        <span className="game-clock-time">{formatClockMs(blackMs)}</span>
      </div>
      {game.timeControl && (
        <p className="game-clocks-meta">
          {game.timeControl}
          {(game.incrementMs ?? 0) > 0 ? ` · +${Math.round((game.incrementMs ?? 0) / 1000)}s` : ''}
        </p>
      )}
    </div>
  )
}
