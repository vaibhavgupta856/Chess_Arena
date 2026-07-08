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

type GlbPieceProps = {
  pieceType: string
  color: 'white' | 'black'
}

export function GlbPiece({ pieceType, color }: GlbPieceProps) {
  const kind = pieceType.slice(1)
  const path = PIECE_MODELS[kind]
  const { scene } = useGLTF(path)

  const template = useMemo(() => {
    const key = `${kind}-${color}`
    const cached = templateCache.get(key)
    if (cached) return cached

    const processed = scene.clone(true)
    applySideMaterials(processed, color)
    normalizeToSize(processed, 0.9)
    centerModelXZ(processed)
    templateCache.set(key, processed)
    return processed
  }, [kind, scene, color])

  // Each piece instance needs its own Object3D (so it can have a different parent).
  // We reuse the processed template to avoid recoloring/normalizing on every instance.
  const model = useMemo(() => template.clone(true), [template])

  return (
    <group rotation={[0, pieceFacingRotation(color), 0]}>
      <primitive object={model} castShadow receiveShadow />
    </group>
  )
}
