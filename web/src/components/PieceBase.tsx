import type { BoardTheme } from '../lib/themes'

type PieceBaseProps = {
  kind: string
  color: 'white' | 'black'
  radius: number
  theme: BoardTheme
}

export function PieceBase({ kind, color, radius, theme }: PieceBaseProps) {
  const fill = color === 'white' ? theme.pieceBaseLight : theme.pieceBaseDark
  const edge = color === 'white' ? theme.pieceRingLight : theme.pieceRingDark
  const scale = kind === 'B' ? 1.35 : 1

  return (
    <group position={[0, 0.003, 0]} scale={[scale, scale, 1]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.58, 12]} />
        <meshBasicMaterial color={fill} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.56, radius, 16]} />
        <meshBasicMaterial color={edge} />
      </mesh>
    </group>
  )
}

export function pieceBaseRadius(kind: string) {
  switch (kind) {
    case 'P':
      return 0.28
    case 'N':
    case 'B':
    case 'R':
      return 0.34
    case 'Q':
      return 0.38
    case 'K':
      return 0.4
    default:
      return 0.32
  }
}
