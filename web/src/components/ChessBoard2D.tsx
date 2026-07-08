import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs } from 'react-chessboard'
import { useCallback, useMemo } from 'react'
import type { GameState } from '../types'

type Props = {
  game: GameState
  displayFen: string
  canMove: boolean
  onMove: (uci: string) => void
}

export function ChessBoard2D({ game, displayFen, canMove, onMove }: Props) {
  const turn = displayFen.split(' ')[1] === 'w' ? 'white' : 'black'
  const boardOrientation: 'white' | 'black' =
    game.yourColor === 'black' ? 'black' : 'white'

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare || game.over || !canMove) {
        return false
      }

      let uci = `${sourceSquare}${targetSquare}`
      const promoRank = turn === 'white' ? '8' : '1'
      const pawnRank = turn === 'white' ? '7' : '2'
      if (sourceSquare[1] === pawnRank && targetSquare[1] === promoRank) {
        uci += 'q'
      }

      onMove(uci)
      return true
    },
    [game.over, canMove, onMove, turn],
  )

  const options = useMemo(
    () => ({
      id: game.id,
      position: displayFen,
      boardOrientation,
      allowDragging: canMove && !game.over,
      boardStyle: {
        width: 'min(520px, 90vw)',
        aspectRatio: '1',
      },
      onPieceDrop,
    }),
    [boardOrientation, game.id, displayFen, canMove, game.over, onPieceDrop],
  )

  return <Chessboard options={options} />
}
