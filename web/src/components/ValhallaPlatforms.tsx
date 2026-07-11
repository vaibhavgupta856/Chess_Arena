import type { BoardLayout } from '../lib/boardLayout'
import { BOARD_THICKNESS } from '../lib/modelUtils'
import {
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

  return (
    <group position={[x, layout.surfaceY, 0]}>
      <mesh position={[0, slabY, 0]} receiveShadow>
        <boxGeometry args={[VALHALLA_PLATFORM_WIDTH, 0.22, VALHALLA_PLATFORM_DEPTH]} />
        <meshStandardMaterial color="#3d2817" roughness={0.92} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[VALHALLA_PLATFORM_WIDTH - 0.2, VALHALLA_PLATFORM_DEPTH - 0.2]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.88} metalness={0.05} />
      </mesh>
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
