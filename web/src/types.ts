export type GameMode = 'local' | 'bot' | 'online'

export type BotLevel = 'beginner' | 'casual' | 'club' | 'strong'

export const BOT_LEVELS: { id: BotLevel; label: string; elo: number }[] = [
  { id: 'beginner', label: 'Beginner', elo: 400 },
  { id: 'casual', label: 'Casual', elo: 800 },
  { id: 'club', label: 'Club', elo: 1200 },
  { id: 'strong', label: 'Strong', elo: 1600 },
]

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
  botThinking?: boolean
  botLevel?: BotLevel
  botElo?: number
  whiteEloDelta?: number
  blackEloDelta?: number
}

export type BoardPiece = {
  square: string
  pieceType: string
  color: 'white' | 'black'
}

export type CreateGameOptions = {
  mode: GameMode
  playAs?: 'white' | 'black' | 'random'
  botLevel?: BotLevel
}

export type UserProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  eloRating: number
  createdAt?: string
}

export type Friend = {
  id: string
  username: string
  displayName: string
  eloRating: number
}

export type FriendRequest = {
  id: string
  fromId: string
  fromUsername: string
  toId: string
  toUsername: string
  status: string
}

export type FriendChallenge = {
  id: string
  challengerId: string
  challengerUsername?: string
  challengerDisplayName?: string
  opponentId: string
  gameId: string
  status: string
}

export type CoachHint = {
  uci: string
  san: string
  explanation: string
}

export type CoachAnalysis = {
  label: string
  explanation: string
  bestUci?: string
  bestSan?: string
}
