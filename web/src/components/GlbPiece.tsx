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
const MATERIAL_VERSION = 'contrast-v4'

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
  const fill = color === 'white' ? '#f2f2f2' : '#d48a3a'
  const edge = color === 'white' ? '#101820' : '#3a1f0a'

  return (
    <group>
      {/* Base markers sit outside piece rotation so every type shows a clear ring */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={12}>
        <ringGeometry args={[radius * 0.62, radius, 48]} />
        <meshBasicMaterial color={edge} transparent opacity={0.95} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={11}>
        <circleGeometry args={[radius * 0.6, 32]} />
        <meshBasicMaterial color={fill} transparent opacity={0.55} depthWrite={false} depthTest={false} />
      </mesh>

      <group rotation={[0, pieceFacingRotation(color), 0]}>
        <primitive object={model} castShadow receiveShadow />
      </group>
    </group>
  )
}
