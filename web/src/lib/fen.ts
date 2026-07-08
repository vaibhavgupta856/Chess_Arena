import type { BoardPiece } from '../types'

const pieceFromChar: Record<string, { pieceType: string; color: 'white' | 'black' }> = {
  P: { pieceType: 'wP', color: 'white' },
  R: { pieceType: 'wR', color: 'white' },
  N: { pieceType: 'wN', color: 'white' },
  B: { pieceType: 'wB', color: 'white' },
  Q: { pieceType: 'wQ', color: 'white' },
  K: { pieceType: 'wK', color: 'white' },
  p: { pieceType: 'bP', color: 'black' },
  r: { pieceType: 'bR', color: 'black' },
  n: { pieceType: 'bN', color: 'black' },
  b: { pieceType: 'bB', color: 'black' },
  q: { pieceType: 'bQ', color: 'black' },
  k: { pieceType: 'bK', color: 'black' },
}

export function fenToPieces(fen: string): BoardPiece[] {
  const board = fen.split(' ')[0]
  const rows = board.split('/')
  const pieces: BoardPiece[] = []

  for (let row = 0; row < rows.length; row++) {
    const rank = 8 - row
    let file = 0
    for (const ch of rows[row]) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch)
        continue
      }
      const fileChar = String.fromCharCode('a'.charCodeAt(0) + file)
      const square = `${fileChar}${rank}`
      const mapped = pieceFromChar[ch]
      if (!mapped) continue
      pieces.push({
        square,
        pieceType: mapped.pieceType,
        color: mapped.color,
      })
      file++
    }
  }

  return pieces
}

export function squareToCoord(square: string): [number, number] {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const rank = Number(square[1]) - 1
  return [file - 3, rank - 3]
}

export function coordToSquare(x: number, z: number): string | null {
  const file = Math.round(x + 3)
  const rank = Math.round(z + 3)
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1}`
}

export function buildUCI(source: string, target: string, turn: string): string {
  let uci = `${source}${target}`
  const promoRank = turn === 'white' ? '8' : '1'
  const pawnRank = turn === 'white' ? '7' : '2'
  if (source[1] === pawnRank && target[1] === promoRank) {
    uci += 'q'
  }
  return uci
}

export type BoardTransition = {
  moves: Array<{ from: string; to: string; piece: BoardPiece }>
  captures: BoardPiece[]
}

function samePiece(a: BoardPiece, b: BoardPiece) {
  return a.square === b.square && a.pieceType === b.pieceType && a.color === b.color
}

export function diffBoardTransition(prev: BoardPiece[], next: BoardPiece[]): BoardTransition {
  const prevBySq = new Map(prev.map((p) => [p.square, p]))
  const nextBySq = new Map(next.map((p) => [p.square, p]))

  const disappeared: BoardPiece[] = []
  const appeared: BoardPiece[] = []

  for (const p of prev) {
    const n = nextBySq.get(p.square)
    if (!n || n.pieceType !== p.pieceType || n.color !== p.color) {
      disappeared.push(p)
    }
  }

  for (const p of next) {
    const o = prevBySq.get(p.square)
    if (!o || o.pieceType !== p.pieceType || o.color !== p.color) {
      appeared.push(p)
    }
  }

  const moves: BoardTransition['moves'] = []
  const captures: BoardPiece[] = []
  const usedFrom = new Set<string>()
  const capturedSquares = new Set<string>()

  for (const toPiece of appeared) {
    const match = disappeared.find(
      (fromPiece) =>
        !usedFrom.has(fromPiece.square) &&
        fromPiece.color === toPiece.color &&
        (fromPiece.pieceType === toPiece.pieceType ||
          (fromPiece.pieceType.endsWith('P') && toPiece.pieceType.endsWith('Q'))),
    )
    if (!match) continue

    usedFrom.add(match.square)
    moves.push({ from: match.square, to: toPiece.square, piece: toPiece })

    const victim = prevBySq.get(toPiece.square)
    if (victim && victim.color !== toPiece.color) {
      capturedSquares.add(victim.square)
    }
  }

  for (const fromPiece of disappeared) {
    if (usedFrom.has(fromPiece.square)) continue
    captures.push(fromPiece)
  }

  for (const sq of capturedSquares) {
    const victim = prevBySq.get(sq)
    if (!victim) continue
    if (captures.some((c) => samePiece(c, victim))) continue
    captures.push(victim)
  }

  return { moves, captures }
}
