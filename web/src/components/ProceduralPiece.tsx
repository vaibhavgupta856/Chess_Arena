import { useMemo } from 'react'
import * as THREE from 'three'
import { pieceFacingRotation } from '../lib/modelUtils'
import type { BoardTheme } from '../lib/themes'
import { PieceBase, pieceBaseRadius } from './PieceBase'

type ProceduralPieceProps = {
  pieceType: string
  color: 'white' | 'black'
  theme: BoardTheme
}

function bodyMaterial(color: 'white' | 'black', theme: BoardTheme) {
  return new THREE.MeshStandardMaterial({
    color: color === 'white' ? theme.whitePiece : theme.blackPiece,
    emissive: color === 'white' ? theme.whitePieceEmissive : theme.blackPieceEmissive,
    emissiveIntensity: color === 'white' ? 0.08 : 0.14,
    metalness: color === 'white' ? 0.18 : 0.08,
    roughness: color === 'white' ? 0.32 : 0.45,
  })
}

function accentMaterial(color: 'white' | 'black', theme: BoardTheme) {
  return new THREE.MeshStandardMaterial({
    color: color === 'white' ? '#dbeafe' : '#78350f',
    emissive: color === 'white' ? theme.highlightSelect : theme.blackPieceEmissive,
    emissiveIntensity: 0.12,
    metalness: 0.25,
    roughness: 0.4,
  })
}

function PieceBody({
  kind,
  color,
  theme,
}: {
  kind: string
  color: 'white' | 'black'
  theme: BoardTheme
}) {
  const mat = useMemo(() => bodyMaterial(color, theme), [color, theme])
  const accent = useMemo(() => accentMaterial(color, theme), [color, theme])

  switch (kind) {
    case 'P':
      // Classic pawn: wide foot, slim neck, round head
      return (
        <group>
          <mesh material={mat} position={[0, 0.08, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.1, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.12, 0.2, 0.18, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.34, 0]} castShadow receiveShadow>
            <torusGeometry args={[0.11, 0.035, 10, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.48, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.15, 22, 18]} />
          </mesh>
        </group>
      )
    case 'R':
      // Castle tower with battlements
      return (
        <group>
          <mesh material={mat} position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.28, 0.14, 8]} />
          </mesh>
          <mesh material={mat} position={[0, 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.36, 0.34]} />
          </mesh>
          <mesh material={mat} position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.4, 0.08, 0.4]} />
          </mesh>
          {[
            [-0.14, -0.14],
            [-0.14, 0.14],
            [0.14, -0.14],
            [0.14, 0.14],
          ].map(([x, z], i) => (
            <mesh key={i} material={mat} position={[x, 0.62, z]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.14, 0.1]} />
            </mesh>
          ))}
          <mesh material={accent} position={[0, 0.34, 0.175]} castShadow>
            <boxGeometry args={[0.1, 0.14, 0.02]} />
          </mesh>
        </group>
      )
    case 'N':
      // Horse head silhouette
      return (
        <group>
          <mesh material={mat} position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.14, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.26, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.18, 16]} />
          </mesh>
          <mesh
            material={mat}
            position={[0.08, 0.46, 0.02]}
            rotation={[0.15, 0.4, 0.35]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.34, 0.28, 0.16]} />
          </mesh>
          <mesh
            material={mat}
            position={[0.2, 0.58, 0.06]}
            rotation={[0.4, 0.2, 0.5]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.2, 0.14, 0.12]} />
          </mesh>
          <mesh material={mat} position={[-0.06, 0.62, -0.04]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.16, 0.08]} />
          </mesh>
          <mesh material={accent} position={[0.26, 0.56, 0.1]} castShadow>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
        </group>
      )
    case 'B':
      // Mitre / pointed bishop with slit
      return (
        <group>
          <mesh material={mat} position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.12, 22]} />
          </mesh>
          <mesh material={mat} position={[0, 0.26, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.2, 0.2, 20]} />
          </mesh>
          <mesh material={mat} position={[0, 0.48, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.17, 0.38, 22]} />
          </mesh>
          <mesh material={accent} position={[0.04, 0.5, 0]} rotation={[0, 0, 0.35]} castShadow>
            <boxGeometry args={[0.03, 0.22, 0.12]} />
          </mesh>
          <mesh material={mat} position={[0, 0.7, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.07, 14, 12]} />
          </mesh>
        </group>
      )
    case 'Q':
      // Coronet with points + orb
      return (
        <group>
          <mesh material={mat} position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.3, 0.14, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.16, 0.24, 0.28, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.5, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.2, 22, 18]} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <mesh
                key={i}
                material={mat}
                position={[Math.cos(a) * 0.16, 0.66, Math.sin(a) * 0.16]}
                castShadow
                receiveShadow
              >
                <coneGeometry args={[0.045, 0.14, 8]} />
              </mesh>
            )
          })}
          <mesh material={accent} position={[0, 0.78, 0]} castShadow>
            <sphereGeometry args={[0.055, 12, 10]} />
          </mesh>
        </group>
      )
    case 'K':
      // Crown + cross
      return (
        <group>
          <mesh material={mat} position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.26, 0.32, 0.14, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.32, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.26, 0.32, 24]} />
          </mesh>
          <mesh material={mat} position={[0, 0.54, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.12, 20]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4
            return (
              <mesh
                key={i}
                material={mat}
                position={[Math.cos(a) * 0.14, 0.64, Math.sin(a) * 0.14]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.07, 0.1, 0.07]} />
              </mesh>
            )
          })}
          <mesh material={accent} position={[0, 0.78, 0]} castShadow>
            <boxGeometry args={[0.055, 0.22, 0.055]} />
          </mesh>
          <mesh material={accent} position={[0, 0.82, 0]} castShadow>
            <boxGeometry args={[0.16, 0.05, 0.055]} />
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

export function ProceduralPiece({ pieceType, color, theme }: ProceduralPieceProps) {
  const kind = pieceType.slice(1)
  const radius = pieceBaseRadius(kind)

  return (
    <group>
      <PieceBase kind={kind} color={color} radius={radius} theme={theme} />
      <group rotation={[0, pieceFacingRotation(color), 0]}>
        <PieceBody kind={kind} color={color} theme={theme} />
      </group>
    </group>
  )
}
