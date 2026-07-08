export type SquarePosition = {
  square: string
  x: number
  z: number
}

export type BoardLayout = {
  surfaceY: number
  cellSize: number
  squares: Map<string, SquarePosition>
}

const BOARD_SPAN = 8
const CELL_SIZE = 1
const BOARD_MIN = -BOARD_SPAN / 2

function buildUniformSquares(): SquarePosition[] {
  const squares: SquarePosition[] = []
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = `${String.fromCharCode(97 + file)}${rank + 1}`
      squares.push({
        square,
        x: BOARD_MIN + (file + 0.5) * CELL_SIZE,
        z: BOARD_MIN + (rank + 0.5) * CELL_SIZE,
      })
    }
  }
  return squares
}

const SQUARE_DATA = buildUniformSquares()

/** Set when tile board mounts; default works for normalized 1-unit sidewalk tiles. */
let surfaceY = 0.06

export function setBoardSurfaceY(y: number) {
  surfaceY = y
}

export const SQUARE_HIGHLIGHT_SCALE = 0.92

function squareName(file: number, rank: number) {
  return `${String.fromCharCode(97 + file)}${rank + 1}`
}

export function getBoardLayout(surfaceYOverride?: number): BoardLayout {
  const squares = new Map<string, SquarePosition>()
  for (const sq of SQUARE_DATA) {
    squares.set(sq.square, sq)
  }
  return {
    surfaceY: surfaceYOverride ?? surfaceY,
    cellSize: CELL_SIZE,
    squares,
  }
}

export const BOARD_LAYOUT = getBoardLayout()

export function isLightSquare(square: string): boolean {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  return (file + rank) % 2 === 1
}

export function getSquareHitSize(
  _square: string,
  layout: BoardLayout = getBoardLayout(),
): [number, number] {
  return [layout.cellSize, layout.cellSize]
}

export function squareToWorld(
  square: string,
  layout: BoardLayout = getBoardLayout(),
): [number, number, number] {
  const pos = layout.squares.get(square)
  if (!pos) return [0, layout.surfaceY, 0]
  return [pos.x, layout.surfaceY, pos.z]
}

export function squareToCoord(square: string, layout: BoardLayout = getBoardLayout()): [number, number] {
  const [x, , z] = squareToWorld(square, layout)
  return [x, z]
}

export function coordToSquare(x: number, z: number, layout: BoardLayout = getBoardLayout()): string | null {
  const file = Math.floor((x - BOARD_MIN) / layout.cellSize)
  const rank = Math.floor((z - BOARD_MIN) / layout.cellSize)
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return squareName(file, rank)
}

export function allSquares(layout: BoardLayout = getBoardLayout()): SquarePosition[] {
  return [...layout.squares.values()]
}
