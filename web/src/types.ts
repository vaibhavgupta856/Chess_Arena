export type GameMode = 'local' | 'bot' | 'online'

export type BotLevel = 'beginner' | 'casual' | 'club' | 'strong'

export type TimeControlId = 'unlimited' | '1+0' | '3+2' | '5+0' | '10+0'

export const BOT_LEVELS: { id: BotLevel; label: string; elo: number }[] = [
  { id: 'beginner', label: 'Beginner', elo: 400 },
  { id: 'casual', label: 'Casual', elo: 800 },
  { id: 'club', label: 'Club', elo: 1200 },
  { id: 'strong', label: 'Strong', elo: 1600 },
]

export const TIME_CONTROLS: {
  id: TimeControlId
  label: string
  detail: string
}[] = [
  { id: 'unlimited', label: 'Unlimited', detail: 'No clock' },
  { id: '1+0', label: '1+0', detail: 'Bullet' },
  { id: '3+2', label: '3+2', detail: 'Blitz' },
  { id: '5+0', label: '5+0', detail: 'Blitz' },
  { id: '10+0', label: '10+0', detail: 'Rapid' },
]

export const DEFAULT_TIME_CONTROL: TimeControlId = '10+0'

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
  timeControl?: TimeControlId | string
  initialTimeMs?: number
  incrementMs?: number
  whiteTimeMs?: number
  blackTimeMs?: number
  clockRunning?: boolean
  clockUpdatedAt?: number
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
  timeControl?: TimeControlId
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
