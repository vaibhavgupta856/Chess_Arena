import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { BoardPiece } from '../types'
import type { CameraMode } from './BoardCameraControls'
import { GlbPiece } from './GlbPiece'

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
  cameraMode: CameraMode
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

export function AnimatedPiece({ piece, cameraMode, onDone, onClick, onHover }: AnimatedPieceProps) {
  const groupRef = useRef<THREE.Group>(null)
  const progress = useRef(piece.done ? 1 : 0)
  const start = useRef(new THREE.Vector3(piece.x, piece.y, piece.z))
  const target = useRef(new THREE.Vector3(piece.targetX, piece.targetY, piece.targetZ))
  const reported = useRef(piece.done)
  const shouldJump = isKnightType(piece.pieceType) && !piece.captured

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

    progress.current = Math.min(1, progress.current + delta * 1.6)
    const t = easeInOutCubic(progress.current)
    const jumpArc = shouldJump ? Math.sin(t * Math.PI) * 0.35 : 0

    groupRef.current.position.set(
      THREE.MathUtils.lerp(start.current.x, target.current.x, t),
      THREE.MathUtils.lerp(start.current.y, target.current.y, t) + jumpArc,
      THREE.MathUtils.lerp(start.current.z, target.current.z, t),
    )

    if (progress.current >= 1 && !reported.current) {
      reported.current = true
      onDone(piece.id)
    }
  })

  const freeCamera = cameraMode === 'free'

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    if (piece.captured || !piece.square) return
    e.stopPropagation()
    onClick(piece.square)
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    if (piece.captured || !piece.square) return
    e.stopPropagation()
    onClick(piece.square)
  }

  return (
    <group
      ref={groupRef}
      onClick={freeCamera && !piece.captured ? handleSelect : undefined}
      onPointerDown={freeCamera || piece.captured ? undefined : onPointerDown}
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
      <Suspense fallback={null}>
        <GlbPiece pieceType={piece.pieceType} color={piece.color} />
      </Suspense>
    </group>
  )
}
