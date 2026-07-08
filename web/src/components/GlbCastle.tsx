import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { CASTLE_MODEL } from '../lib/castleModel'
import { applyCastleRecolor, normalizeToSize } from '../lib/modelUtils'

type GlbCastleProps = {
  variant: 'white' | 'black'
  position: [number, number, number]
  rotationY?: number
}

export function GlbCastle({ variant, position, rotationY = 0 }: GlbCastleProps) {
  const { scene } = useGLTF(CASTLE_MODEL)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    applyCastleRecolor(clone, variant)
    normalizeToSize(clone, 5.5, true)
    return clone
  }, [scene, variant])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={model} castShadow receiveShadow />
    </group>
  )
}
