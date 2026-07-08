export type GameMode = 'local' | 'bot' | 'online'

export type MoveRecord = {
  uci: string
  san: string
}

export type GameState = {
  id: string
  fen: string
  outcome: string
  over: boolean
  turn: string
  halfMoves?: number
  fullMoves?: number
  termination?: string
  inCheck?: boolean
  history?: MoveRecord[]
  positionFens?: string[]
  ply?: number
  mode?: GameMode
  yourColor?: 'white' | 'black' | 'both' | ''
  whitePlayer?: string
  blackPlayer?: string
  waitingFor?: 'white' | 'black' | ''
  drawOfferBy?: string
  claimableDraws?: string[]
}

export type BoardPiece = {
  square: string
  pieceType: string
  color: 'white' | 'black'
}

export type CreateGameOptions = {
  mode: GameMode
  playAs?: 'white' | 'black' | 'random'
}
