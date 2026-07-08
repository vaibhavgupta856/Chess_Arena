import type { BoardLayout } from './boardLayout'

export const VALHALLA_LABEL = 'VALHALLA'

export function valhallaPlatformX(color: 'white' | 'black'): number {
  // White fallen pieces rest on the left; black on the right.
  return color === 'white' ? -6.6 : 6.6
}

export function valhallaSlotPosition(
  color: 'white' | 'black',
  index: number,
  layout: BoardLayout,
): [number, number, number] {
  const cols = 3
  const col = index % cols
  const row = Math.floor(index / cols)
  const spacing = layout.cellSize * 0.82
  const x = valhallaPlatformX(color) + (col - 1) * spacing
  const z = (row - 1.5) * spacing
  const y = layout.surfaceY + 0.02
  return [x, y, z]
}
