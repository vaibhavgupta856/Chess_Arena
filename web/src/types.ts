export type GameState = {
  id: string
  fen: string
  outcome: string
  over: boolean
  turn: string
  halfMoves?: number
  fullMoves?: number
}

export type BoardPiece = {
  square: string
  pieceType: string
  color: 'white' | 'black'
}
