import bishopModel from '../../../assets/bishop__alfil.glb?url'
import kingModel from '../../../assets/chess_king_2.glb?url'
import knightModel from '../../../assets/chess_knight.glb?url'
import pawnModel from '../../../assets/chess_pawn.glb?url'
import rookModel from '../../../assets/chess_rook.glb?url'
import queenModel from '../../../assets/queen_2.glb?url'
import { FERN_TILE_MODEL, FOREST_TILE_MODEL } from './tileModels'

export const PIECE_MODELS: Record<string, string> = {
  P: pawnModel,
  R: rookModel,
  N: knightModel,
  B: bishopModel,
  Q: queenModel,
  K: kingModel,
}

export const ALL_MODEL_URLS = [
  ...Object.values(PIECE_MODELS),
  FERN_TILE_MODEL,
  FOREST_TILE_MODEL,
]
