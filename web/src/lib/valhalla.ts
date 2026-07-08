import type { BoardLayout } from './boardLayout'

export const VALHALLA_LABEL = 'VALHALLA'

export const VALHALLA_PLATFORM_WIDTH = 8.2
export const VALHALLA_PLATFORM_DEPTH = 10.4

export function valhallaPlatformX(color: 'white' | 'black'): number {
  // White fallen pieces rest on the left; black on the right.
  return color === 'white' ? -10.2 : 10.2
}

export function valhallaSlotPosition(
  color: 'white' | 'black',
  index: number,
  layout: BoardLayout,
): [number, number, number] {
  const cols = 4
  const col = index % cols
  const row = Math.floor(index / cols)
  const spacing = layout.cellSize * 0.98
  const x = valhallaPlatformX(color) + (col - (cols - 1) / 2) * spacing
  const z = (row - 2.5) * spacing
  const y = layout.surfaceY + 0.02
  return [x, y, z]
}
