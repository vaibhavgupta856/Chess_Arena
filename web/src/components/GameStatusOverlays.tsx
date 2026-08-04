import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../types'

type Props = {
  game: GameState
}

/**
 * Centered status banners:
 * - room tip (6s) on enter
 * - Check (2s) when a side is checked
 * - Checkmate (persistent until leave)
 */
export function GameStatusOverlays({ game }: Props) {
  const isCheckmate = game.over && game.termination === 'checkmate'
  const [tipVisible, setTipVisible] = useState(true)
  const [checkVisible, setCheckVisible] = useState(false)
  const [checkAnimKey, setCheckAnimKey] = useState(0)
  const prevInCheck = useRef(false)
  const prevFen = useRef(game.fen)

  useEffect(() => {
    setTipVisible(true)
    const id = window.setTimeout(() => setTipVisible(false), 6000)
    return () => window.clearTimeout(id)
  }, [game.id])

  useEffect(() => {
    if (isCheckmate) {
      setCheckVisible(false)
      prevInCheck.current = true
      prevFen.current = game.fen
      return
    }

    const inCheck = !!game.inCheck && !game.over
    const enteredCheck =
      inCheck && (!prevInCheck.current || prevFen.current !== game.fen)

    prevInCheck.current = inCheck
    prevFen.current = game.fen

    if (!enteredCheck) return

    setCheckVisible(true)
    setCheckAnimKey((k) => k + 1)
    const id = window.setTimeout(() => setCheckVisible(false), 2000)
    return () => window.clearTimeout(id)
  }, [game.fen, game.inCheck, game.over, isCheckmate])

  if (!tipVisible && !checkVisible && !isCheckmate) return null

  return (
    <div className="game-banner-overlay" aria-live="polite">
      {isCheckmate ? (
        <div className="game-banner game-banner--checkmate" role="status">
          <span className="game-banner-title">Checkmate</span>
          {game.outcome && game.outcome !== '*' && (
            <span className="game-banner-sub">{game.outcome}</span>
          )}
        </div>
      ) : checkVisible ? (
        <div
          key={`check-${checkAnimKey}`}
          className="game-banner game-banner--check"
          role="status"
        >
          <span className="game-banner-title">Check</span>
        </div>
      ) : tipVisible ? (
        <div key={`tip-${game.id}`} className="game-banner game-banner--tip" role="status">
          <span className="game-banner-title game-banner-title--tip">
            Drag the board to rotate the view
          </span>
          <span className="game-banner-sub">
            Click or drag pieces to move
          </span>
        </div>
      ) : null}
    </div>
  )
}
