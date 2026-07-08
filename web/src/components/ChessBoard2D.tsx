import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs } from 'react-chessboard'
import { useCallback, useMemo } from 'react'
import type { GameState } from '../types'

type Props = {
  game: GameState
  onMove: (uci: string) => void
}

export function ChessBoard2D({ game, onMove }: Props) {
  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare || game.over) {
        return false
      }

      let uci = `${sourceSquare}${targetSquare}`
      const promoRank = game.turn === 'white' ? '8' : '1'
      const pawnRank = game.turn === 'white' ? '7' : '2'
      if (sourceSquare[1] === pawnRank && targetSquare[1] === promoRank) {
        uci += 'q'
      }

      onMove(uci)
      return true
    },
    [game, onMove],
  )

  const options = useMemo(
    () => ({
      id: game.id,
      position: game.fen,
      allowDragging: !game.over,
      boardStyle: {
        width: 'min(520px, 90vw)',
        aspectRatio: '1',
      },
      onPieceDrop,
    }),
    [game, onPieceDrop],
  )

  return <Chessboard options={options} />
}
