import type { BoardLayout } from './boardLayout'

export const VALHALLA_LABEL = 'VALHALLA'

export const VALHALLA_PLATFORM_WIDTH = 4.6
export const VALHALLA_PLATFORM_DEPTH = 5.4

export function valhallaPlatformX(color: 'white' | 'black'): number {
  // White fallen pieces rest on the left; black on the right.
  return color === 'white' ? -7.4 : 7.4
}

export function valhallaSlotPosition(
  color: 'white' | 'black',
  index: number,
  layout: BoardLayout,
): [number, number, number] {
  const cols = 4
  const col = index % cols
  const row = Math.floor(index / cols)
  const spacing = layout.cellSize * 0.72
  const x = valhallaPlatformX(color) + (col - (cols - 1) / 2) * spacing
  const z = (row - 2) * spacing * 0.92
  const y = layout.surfaceY + 0.02
  return [x, y, z]
}
