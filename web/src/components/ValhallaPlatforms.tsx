import { Text } from '@react-three/drei'
import type { BoardLayout } from '../lib/boardLayout'
import { BOARD_THICKNESS } from '../lib/modelUtils'
import {
  VALHALLA_LABEL,
  VALHALLA_PLATFORM_DEPTH,
  VALHALLA_PLATFORM_WIDTH,
  valhallaPlatformX,
} from '../lib/valhalla'

type ValhallaPlatformsProps = {
  layout: BoardLayout
}

function Platform({ color, layout }: { color: 'white' | 'black'; layout: BoardLayout }) {
  const x = valhallaPlatformX(color)
  const slabY = -BOARD_THICKNESS / 2 - 0.06
  const facesWhiteSide = color === 'white'
  const labelZ = facesWhiteSide ? VALHALLA_PLATFORM_DEPTH / 2 + 0.15 : -(VALHALLA_PLATFORM_DEPTH / 2 + 0.15)
  const labelRotation: [number, number, number] = facesWhiteSide ? [0, Math.PI, 0] : [0, 0, 0]

  return (
    <group position={[x, layout.surfaceY, 0]}>
      <mesh position={[0, slabY, 0]} castShadow receiveShadow>
        <boxGeometry args={[VALHALLA_PLATFORM_WIDTH, 0.22, VALHALLA_PLATFORM_DEPTH]} />
        <meshStandardMaterial color="#3d2817" roughness={0.92} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[VALHALLA_PLATFORM_WIDTH - 0.2, VALHALLA_PLATFORM_DEPTH - 0.2]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.88} metalness={0.05} />
      </mesh>
      <Text
        position={[0, 0.52, labelZ]}
        rotation={labelRotation}
        fontSize={0.55}
        color="#e8d4a8"
        anchorX="center"
        anchorY="middle"
      >
        {VALHALLA_LABEL}
      </Text>
      <Text
        position={[0, 0.22, labelZ]}
        rotation={labelRotation}
        fontSize={0.16}
        color="#c9b08a"
        anchorX="center"
        anchorY="middle"
      >
        {color === 'white' ? 'White fallen' : 'Black fallen'}
      </Text>
    </group>
  )
}

export function ValhallaPlatforms({ layout }: ValhallaPlatformsProps) {
  return (
    <group>
      <Platform color="white" layout={layout} />
      <Platform color="black" layout={layout} />
    </group>
  )
}
