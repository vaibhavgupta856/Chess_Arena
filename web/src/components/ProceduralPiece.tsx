import { useMemo } from 'react'
import * as THREE from 'three'
import { pieceFacingRotation } from '../lib/modelUtils'
import { PieceBase, pieceBaseRadius } from './PieceBase'

type ProceduralPieceProps = {
  pieceType: string
  color: 'white' | 'black'
}

function bodyMaterial(color: 'white' | 'black') {
  return new THREE.MeshStandardMaterial({
    color: color === 'white' ? '#f8f8ff' : '#d48a3a',
    emissive: color === 'white' ? '#e8ecff' : '#a85f20',
    emissiveIntensity: color === 'white' ? 0.08 : 0.14,
    metalness: color === 'white' ? 0.15 : 0.06,
    roughness: color === 'white' ? 0.35 : 0.48,
  })
}

function PieceBody({ kind, color }: { kind: string; color: 'white' | 'black' }) {
  const mat = useMemo(() => bodyMaterial(color), [color])

  switch (kind) {
    case 'P':
      return (
        <group>
          <mesh material={mat} position={[0, 0.14, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.2, 0.22, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.36, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.16, 20, 16]} />
          </mesh>
        </group>
      )
    case 'R':
      return (
        <group>
          <mesh material={mat} position={[0, 0.18, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.3, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.22, 0.38]} />
          </mesh>
          {[-0.14, 0, 0.14].map((x) => (
            <mesh key={x} material={mat} position={[x, 0.56, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.08, 0.1]} />
            </mesh>
          ))}
        </group>
      )
    case 'N':
      return (
        <group>
          <mesh material={mat} position={[0, 0.16, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.24, 0.26, 20]} />
          </mesh>
          <mesh
            material={mat}
            position={[0.06, 0.38, 0.04]}
            rotation={[0, 0.35, 0.2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.28, 0.3, 0.18]} />
          </mesh>
          <mesh material={mat} position={[-0.08, 0.48, -0.06]} castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.14, 0.12]} />
          </mesh>
        </group>
      )
    case 'B':
      return (
        <group>
          <mesh material={mat} position={[0, 0.16, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.24, 0.24, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.4, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.16, 0.34, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.6, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.1, 16, 12]} />
          </mesh>
        </group>
      )
    case 'Q':
      return (
        <group>
          <mesh material={mat} position={[0, 0.18, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.28, 0.28, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.42, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.2, 20, 16]} />
          </mesh>
          {[
            [0, 0.58, 0],
            [0.14, 0.52, 0],
            [-0.14, 0.52, 0],
            [0, 0.52, 0.14],
            [0, 0.52, -0.14],
          ].map(([x, y, z], i) => (
            <mesh key={i} material={mat} position={[x, y, z]} castShadow receiveShadow>
              <sphereGeometry args={[0.06, 12, 10]} />
            </mesh>
          ))}
        </group>
      )
    case 'K':
      return (
        <group>
          <mesh material={mat} position={[0, 0.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.3, 0.32, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.44, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.18, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.62, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.22, 0.06]} />
          </mesh>
          <mesh material={mat} position={[0, 0.62, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.06, 0.06]} />
          </mesh>
        </group>
      )
    default:
      return (
        <mesh material={mat} position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.4, 16]} />
        </mesh>
      )
  }
}

export function ProceduralPiece({ pieceType, color }: ProceduralPieceProps) {
  const kind = pieceType.slice(1)
  const radius = pieceBaseRadius(kind)

  return (
    <group>
      <PieceBase kind={kind} color={color} radius={radius} />
      <group rotation={[0, pieceFacingRotation(color), 0]}>
        <PieceBody kind={kind} color={color} />
      </group>
    </group>
  )
}
