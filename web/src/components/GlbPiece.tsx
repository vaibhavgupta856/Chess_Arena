import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { PIECE_MODELS } from '../lib/models'
import {
  applySideMaterials,
  centerModelXZ,
  normalizeToSize,
  pieceFacingRotation,
} from '../lib/modelUtils'

type GlbPieceProps = {
  pieceType: string
  color: 'white' | 'black'
}

export function GlbPiece({ pieceType, color }: GlbPieceProps) {
  const kind = pieceType.slice(1)
  const path = PIECE_MODELS[kind]
  const { scene } = useGLTF(path)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    applySideMaterials(clone, color)
    normalizeToSize(clone, 0.9)
    centerModelXZ(clone)
    return clone
  }, [scene, color])

  return (
    <group rotation={[0, pieceFacingRotation(color), 0]}>
      <primitive object={model} castShadow receiveShadow />
    </group>
  )
}
