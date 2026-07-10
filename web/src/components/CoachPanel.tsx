import { useCoach } from '../hooks/useSocial'
import type { GameState } from '../types'

type Props = {
  game: GameState
}

export function CoachPanel({ game }: Props) {
  const coachEnabled = game.mode === 'bot' || game.mode === 'local'
  const { hint, analysis, loading, fetchHint, analyzeLastMove, fetchThreats } = useCoach(
    coachEnabled ? game.id : undefined,
  )

  if (!coachEnabled) return null

  return (
    <div className="sidebar-section coach-panel">
      <h3>Coach</h3>
      <p className="lobby-hint">Get hints and learn from your moves.</p>
      <div className="coach-actions">
        <button type="button" className="sidebar-btn" disabled={loading || game.botThinking} onClick={fetchHint}>
          Hint
        </button>
        <button type="button" className="sidebar-btn" disabled={loading} onClick={analyzeLastMove}>
          Review last move
        </button>
        <button type="button" className="sidebar-btn" disabled={loading} onClick={fetchThreats}>
          Position advice
        </button>
      </div>
      {hint && (
        <div className="coach-message coach-message--hint">
          <strong>{hint.san}</strong>
          <p>{hint.explanation}</p>
        </div>
      )}
      {analysis && (
        <div className={`coach-message coach-message--${analysis.label}`}>
          <strong className="coach-label">{analysis.label}</strong>
          <p>{analysis.explanation}</p>
          {analysis.bestSan && <p className="lobby-hint">Best: {analysis.bestSan}</p>}
        </div>
      )}
    </div>
  )
}
