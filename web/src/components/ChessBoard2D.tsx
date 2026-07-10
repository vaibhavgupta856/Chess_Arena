import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs } from 'react-chessboard'
import { useCallback, useMemo } from 'react'
import { useTheme } from '../hooks/useTheme'
import { buildUCI, fenToPieces } from '../lib/fen'
import type { GameState } from '../types'

type Props = {
  game: GameState
  displayFen: string
  canMove: boolean
  onMove: (uci: string) => void
}

export function ChessBoard2D({ game, displayFen, canMove, onMove }: Props) {
  const { theme } = useTheme()
  const turn = displayFen.split(' ')[1] === 'w' ? 'white' : 'black'
  const boardOrientation: 'white' | 'black' =
    game.yourColor === 'black' ? 'black' : 'white'

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare || game.over || !canMove) {
        return false
      }

      const moving = fenToPieces(displayFen).find((p) => p.square === sourceSquare)
      onMove(buildUCI(sourceSquare, targetSquare, turn, moving?.pieceType))
      return true
    },
    [game.over, canMove, onMove, turn, displayFen],
  )

  const options = useMemo(
    () => ({
      id: game.id,
      position: displayFen,
      boardOrientation,
      allowDragging: canMove && !game.over,
      boardStyle: {
        width: '100%',
        maxWidth: 'min(100vw - 1rem, 520px)',
        aspectRatio: '1',
      },
      darkSquareStyle: { backgroundColor: theme.squareDark2d },
      lightSquareStyle: { backgroundColor: theme.squareLight2d },
      onPieceDrop,
    }),
    [
      boardOrientation,
      game.id,
      displayFen,
      canMove,
      game.over,
      onPieceDrop,
      theme.squareDark2d,
      theme.squareLight2d,
    ],
  )

  return <Chessboard options={options} />
}
