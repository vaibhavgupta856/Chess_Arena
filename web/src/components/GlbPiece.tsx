import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { PIECE_MODELS } from '../lib/models'
import {
  applySideMaterials,
  centerModelXZ,
  normalizeToSize,
  pieceFacingRotation,
} from '../lib/modelUtils'

const templateCache = new Map<string, THREE.Object3D>()
const MATERIAL_VERSION = 'contrast-v6'

type GlbPieceProps = {
  pieceType: string
  color: 'white' | 'black'
}

function pieceBaseRadius(kind: string) {
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

function PieceBase({
  kind,
  color,
  radius,
}: {
  kind: string
  color: 'white' | 'black'
  radius: number
}) {
  const fill = color === 'white' ? '#ececec' : '#d48a3a'
  const edge = color === 'white' ? '#1a2430' : '#3a1f0a'

  // Bishops (elephants) have a narrow foot — use a wide elliptical footprint.
  if (kind === 'B') {
    return (
      <group position={[0, 0.003, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 1.35, 1]}>
          <circleGeometry args={[radius * 0.62, 32]} />
          <meshStandardMaterial color={fill} roughness={0.7} metalness={0.04} />
        </mesh>
        <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.4, 1.4, 1]}>
          <ringGeometry args={[radius * 0.58, radius * 1.02, 48]} />
          <meshStandardMaterial color={edge} roughness={0.75} metalness={0.05} />
        </mesh>
        {/* Side markers so the base stays visible under the elephant body */}
        {(
          [
            [radius * 0.85, radius * 0.85],
            [radius * 0.85, -radius * 0.85],
            [-radius * 0.85, radius * 0.85],
            [-radius * 0.85, -radius * 0.85],
          ] as const
        ).map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.002, dz]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius * 0.14, 16]} />
            <meshStandardMaterial color={edge} roughness={0.75} metalness={0.05} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group position={[0, 0.003, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.58, 32]} />
        <meshStandardMaterial color={fill} roughness={0.7} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.56, radius, 48]} />
        <meshStandardMaterial color={edge} roughness={0.75} metalness={0.05} />
      </mesh>
    </group>
  )
}

export function GlbPiece({ pieceType, color }: GlbPieceProps) {
  const kind = pieceType.slice(1)
  const path = PIECE_MODELS[kind]
  const { scene } = useGLTF(path)

  const template = useMemo(() => {
    const key = `${kind}-${color}-${MATERIAL_VERSION}`
    const cached = templateCache.get(key)
    if (cached) return cached

    const processed = scene.clone(true)
    applySideMaterials(processed, color)

    let targetSize = 0.9
    switch (kind) {
      case 'P':
        targetSize = 0.8
        break
      case 'N':
      case 'B':
      case 'R':
        targetSize = 0.92
        break
      case 'Q':
        targetSize = 1.02
        break
      case 'K':
        targetSize = 1.08
        break
      default:
        targetSize = 0.9
    }

    normalizeToSize(processed, targetSize)
    centerModelXZ(processed)
    templateCache.set(key, processed)
    return processed
  }, [kind, scene, color])

  const model = useMemo(() => template.clone(true), [template])
  const radius = pieceBaseRadius(kind)

  return (
    <group>
      <PieceBase kind={kind} color={color} radius={radius} />
      <group rotation={[0, pieceFacingRotation(color), 0]}>
        <primitive object={model} castShadow receiveShadow />
      </group>
    </group>
  )
}
