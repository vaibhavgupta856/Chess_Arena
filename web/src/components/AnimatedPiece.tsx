import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { BoardPiece } from '../types'
import { useTheme } from '../hooks/useTheme'
import { ProceduralPiece } from './ProceduralPiece'

export type PieceVisual = Omit<BoardPiece, 'square'> & {
  id: string
  square: string | null
  x: number
  y: number
  z: number
  targetX: number
  targetY: number
  targetZ: number
  captured: boolean
  valhallaIndex: number | null
  done: boolean
}

type AnimatedPieceProps = {
  piece: PieceVisual
  onDone: (id: string) => void
  onClick: (square: string) => void
  onHover: (square: string | null) => void
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function isKnightType(pieceType: string) {
  return pieceType.endsWith('N')
}

export function AnimatedPiece({ piece, onDone, onClick, onHover }: AnimatedPieceProps) {
  const { theme } = useTheme()
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Group>(null)
  const progress = useRef(piece.done ? 1 : 0)
  const start = useRef(new THREE.Vector3(piece.x, piece.y, piece.z))
  const target = useRef(new THREE.Vector3(piece.targetX, piece.targetY, piece.targetZ))
  const reported = useRef(piece.done)
  const shouldJump = isKnightType(piece.pieceType) || piece.captured

  useEffect(() => {
    if (!groupRef.current) return
    const pos = piece.done
      ? new THREE.Vector3(piece.targetX, piece.targetY, piece.targetZ)
      : new THREE.Vector3(piece.x, piece.y, piece.z)
    groupRef.current.position.copy(pos)
  }, [piece.done, piece.x, piece.y, piece.z, piece.targetX, piece.targetY, piece.targetZ])

  useEffect(() => {
    if (!piece.done) {
      progress.current = 0
      start.current.set(piece.x, piece.y, piece.z)
      target.current.set(piece.targetX, piece.targetY, piece.targetZ)
      reported.current = false
      return
    }
    progress.current = 1
    reported.current = true
    if (meshRef.current) {
      meshRef.current.position.set(0, 0, 0)
      meshRef.current.rotation.set(0, 0, 0)
      meshRef.current.scale.setScalar(1)
    }
  }, [
    piece.done,
    piece.x,
    piece.y,
    piece.z,
    piece.targetX,
    piece.targetY,
    piece.targetZ,
    piece.id,
  ])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (piece.done) {
      groupRef.current.position.set(piece.targetX, piece.targetY, piece.targetZ)
      return
    }

    progress.current = Math.min(1, progress.current + delta * (piece.captured ? 1.35 : 1.55))
    const t = easeInOutCubic(progress.current)
    const jumpH = piece.captured ? 0.55 : shouldJump ? 0.48 : 0.12
    const jumpArc = Math.sin(t * Math.PI) * jumpH
    const spin = piece.captured
      ? t * Math.PI * 1.5
      : isKnightType(piece.pieceType)
        ? t * 0.35
        : t * 0.12

    groupRef.current.position.set(
      THREE.MathUtils.lerp(start.current.x, target.current.x, t),
      THREE.MathUtils.lerp(start.current.y, target.current.y, t) + jumpArc,
      THREE.MathUtils.lerp(start.current.z, target.current.z, t),
    )

    if (meshRef.current) {
      meshRef.current.rotation.y = spin
      meshRef.current.scale.setScalar(
        piece.captured ? 1 - t * 0.08 : 1 + Math.sin(t * Math.PI) * 0.04,
      )
    }

    if (progress.current >= 1 && !reported.current) {
      reported.current = true
      if (meshRef.current) {
        meshRef.current.scale.setScalar(1)
        meshRef.current.rotation.set(0, 0, 0)
        meshRef.current.position.set(0, 0, 0)
      }
      onDone(piece.id)
    }
  })

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        if (piece.captured || !piece.square) return
        e.stopPropagation()
        onClick(piece.square)
      }}
      onPointerEnter={(e) => {
        if (piece.captured || !piece.square) return
        e.stopPropagation()
        onHover(piece.square)
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        onHover(null)
      }}
    >
      <group ref={meshRef}>
        <ProceduralPiece pieceType={piece.pieceType} color={piece.color} theme={theme} />
      </group>
    </group>
  )
}
