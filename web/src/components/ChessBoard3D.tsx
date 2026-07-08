import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, useGLTF } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { MeshStandardMaterial } from 'three'
import type { GameState } from '../types'
import {
  allSquares,
  getBoardLayout,
  getSquareHitSize,
  SQUARE_HIGHLIGHT_SCALE,
  squareToWorld,
  type BoardLayout,
} from '../lib/boardLayout'
import { buildUCI, diffBoardTransition, fenToPieces } from '../lib/fen'
import { ALL_MODEL_URLS } from '../lib/models'
import { AnimatedPiece, type PieceVisual } from './AnimatedPiece'
import { TileBoard } from './TileBoard'

type Props = {
  game: GameState
  onMove: (uci: string) => void
}

const SELECT_COLOR = '#5ce1ff'
const HOVER_COLOR = '#ff9f43'

function capturePosition(
  color: 'white' | 'black',
  index: number,
  layout: BoardLayout,
): [number, number, number] {
  const a1 = layout.squares.get('a1')!
  const h1 = layout.squares.get('h1')!
  const sideX = color === 'white' ? a1.x - layout.cellSize * 2.2 : h1.x + layout.cellSize * 2.2
  const baseZ = a1.z + index * layout.cellSize * 0.72
  return [sideX, layout.surfaceY * 0.55, baseZ]
}

function SquareHitbox({
  square,
  x,
  z,
  layout,
  onClick,
  onHover,
}: {
  square: string
  x: number
  z: number
  layout: BoardLayout
  onClick: (square: string) => void
  onHover: (square: string | null) => void
}) {
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onClick(square)
  }

  const hitY = layout.surfaceY + 0.04
  const [hitW, hitD] = getSquareHitSize(square, layout)

  return (
    <mesh
      position={[x, hitY, z]}
      onPointerDown={onPointerDown}
      onPointerEnter={(e) => {
        e.stopPropagation()
        onHover(square)
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        onHover(null)
      }}
    >
      <boxGeometry args={[hitW, 0.04, hitD]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function SquareHighlights({
  layout,
  selected,
  hovered,
}: {
  layout: BoardLayout
  selected: string | null
  hovered: string | null
}) {
  const selectMat = useRef<MeshStandardMaterial>(null)
  const hoverMat = useRef<MeshStandardMaterial>(null)

  const selectedPos = selected ? layout.squares.get(selected) : null
  const hoveredPos =
    hovered && hovered !== selected ? layout.squares.get(hovered) : null

  const selectedSize = selected ? getSquareHitSize(selected, layout) : null
  const hoveredSize = hovered && hovered !== selected ? getSquareHitSize(hovered, layout) : null

  const lift = layout.surfaceY + 0.08

  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 8)
    if (selectMat.current) {
      selectMat.current.opacity = 0.35 + pulse * 0.45
      selectMat.current.emissiveIntensity = 0.4 + pulse * 0.35
    }
    if (hoverMat.current) {
      const hoverPulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5.5 + 0.8)
      hoverMat.current.opacity = 0.28 + hoverPulse * 0.4
      hoverMat.current.emissiveIntensity = 0.3 + hoverPulse * 0.25
    }
  })

  return (
    <group>
      {selectedPos && selectedSize && (
        <mesh position={[selectedPos.x, lift, selectedPos.z]} renderOrder={20}>
          <boxGeometry
            args={[
              selectedSize[0] * SQUARE_HIGHLIGHT_SCALE,
              0.02,
              selectedSize[1] * SQUARE_HIGHLIGHT_SCALE,
            ]}
          />
          <meshStandardMaterial
            ref={selectMat}
            color={SELECT_COLOR}
            transparent
            opacity={0.6}
            emissive={SELECT_COLOR}
            emissiveIntensity={0.55}
            roughness={0.35}
            metalness={0.2}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      {hoveredPos && hoveredSize && (
        <mesh position={[hoveredPos.x, lift - 0.01, hoveredPos.z]} renderOrder={19}>
          <boxGeometry
            args={[
              hoveredSize[0] * SQUARE_HIGHLIGHT_SCALE,
              0.018,
              hoveredSize[1] * SQUARE_HIGHLIGHT_SCALE,
            ]}
          />
          <meshStandardMaterial
            ref={hoverMat}
            color={HOVER_COLOR}
            transparent
            opacity={0.45}
            emissive={HOVER_COLOR}
            emissiveIntensity={0.4}
            roughness={0.45}
            metalness={0.15}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

function Scene({ game, onMove }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [boardSurfaceY, setBoardSurfaceY] = useState(0.06)
  const [visualPieces, setVisualPieces] = useState<PieceVisual[]>([])
  const prevFenRef = useRef<string | null>(null)
  const squareToIdRef = useRef<Map<string, string>>(new Map())
  const idCounterRef = useRef(0)
  const captureCountRef = useRef({ white: 0, black: 0 })

  const pieces = useMemo(() => fenToPieces(game.fen), [game.fen])
  const layout = useMemo(() => getBoardLayout(boardSurfaceY), [boardSurfaceY])

  const initPieces = useCallback((fen: string) => {
    const next = fenToPieces(fen)
    const squareToId = new Map<string, string>()
    const visuals: PieceVisual[] = next.map((piece) => {
      const id = `p${idCounterRef.current++}`
      squareToId.set(piece.square, id)
      const [x, y, z] = squareToWorld(piece.square, layout)
      return {
        ...piece,
        id,
        x,
        y,
        z,
        targetX: x,
        targetY: y,
        targetZ: z,
        captured: false,
        done: true,
      }
    })
    squareToIdRef.current = squareToId
    captureCountRef.current = { white: 0, black: 0 }
    setVisualPieces(visuals)
    prevFenRef.current = fen
  }, [layout])

  const animateTransition = useCallback(
    (prevFen: string, nextFen: string) => {
      const prev = fenToPieces(prevFen)
      const next = fenToPieces(nextFen)
      const { moves, captures } = diffBoardTransition(prev, next)

      setVisualPieces((current) => {
        const byId = new Map(current.map((p) => [p.id, { ...p }]))
        const squareToId = new Map(squareToIdRef.current)

        for (const captured of captures) {
          const id = squareToId.get(captured.square)
          if (!id) continue
          const piece = byId.get(id)
          if (!piece) continue

          const idx = captureCountRef.current[captured.color]
          captureCountRef.current[captured.color] += 1
          const [tx, ty, tz] = capturePosition(captured.color, idx, layout)

          piece.captured = true
          piece.square = null
          piece.targetX = tx
          piece.targetY = ty
          piece.targetZ = tz
          piece.done = false
          squareToId.delete(captured.square)
        }

        for (const move of moves) {
          const id = squareToId.get(move.from)
          if (!id) continue
          const piece = byId.get(id)
          if (!piece) continue

          const [tx, ty, tz] = squareToWorld(move.to, layout)
          piece.square = move.to
          piece.pieceType = move.piece.pieceType
          piece.targetX = tx
          piece.targetY = ty
          piece.targetZ = tz
          piece.done = false
          squareToId.delete(move.from)
          squareToId.set(move.to, id)
        }

        for (const boardPiece of next) {
          const existingId = squareToId.get(boardPiece.square)
          if (existingId && byId.has(existingId)) continue

          const id = `p${idCounterRef.current++}`
          const [x, y, z] = squareToWorld(boardPiece.square, layout)
          byId.set(id, {
            ...boardPiece,
            id,
            x,
            y,
            z,
            targetX: x,
            targetY: y,
            targetZ: z,
            captured: false,
            done: true,
          })
          squareToId.set(boardPiece.square, id)
        }

        squareToIdRef.current = squareToId
        return [...byId.values()]
      })

      prevFenRef.current = nextFen
    },
    [layout],
  )

  useEffect(() => {
    if (!prevFenRef.current) {
      initPieces(game.fen)
      return
    }
    if (prevFenRef.current === game.fen) return
    animateTransition(prevFenRef.current, game.fen)
  }, [game.fen, initPieces, animateTransition])

  useEffect(() => {
    if (!prevFenRef.current) return
    setVisualPieces((current) =>
      current.map((p) => {
        if (p.captured || !p.square) return p
        const [x, y, z] = squareToWorld(p.square, layout)
        if (!p.done) return { ...p, targetX: x, targetY: y, targetZ: z }
        return { ...p, x, y, z, targetX: x, targetY: y, targetZ: z }
      }),
    )
  }, [layout])

  const handlePieceDone = useCallback((id: string) => {
    setVisualPieces((current) =>
      current
        .map((p) => {
          if (p.id !== id) return p
          return {
            ...p,
            x: p.targetX,
            y: p.targetY,
            z: p.targetZ,
            done: true,
          }
        })
        .filter((p) => !(p.id === id && p.captured)),
    )
  }, [])

  const handleSquareClick = (square: string) => {
    if (game.over) return

    if (!selected) {
      const piece = pieces.find((p) => p.square === square)
      if (!piece) return
      if (piece.color !== game.turn) return
      setSelected(square)
      return
    }

    if (selected === square) {
      setSelected(null)
      return
    }

    onMove(buildUCI(selected, square, game.turn))
    setSelected(null)
  }

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 14, 5]} intensity={1.4} castShadow />
      <directionalLight position={[-5, 10, -4]} intensity={0.5} />
      <pointLight position={[0, 8, 0]} intensity={0.45} />

      <Suspense fallback={null}>
        <TileBoard onSurfaceY={setBoardSurfaceY} />
      </Suspense>

      {allSquares(layout).map((sq) => (
        <SquareHitbox
          key={`hit-${sq.square}`}
          square={sq.square}
          x={sq.x}
          z={sq.z}
          layout={layout}
          onClick={handleSquareClick}
          onHover={setHovered}
        />
      ))}

      {visualPieces.map((piece) => (
        <AnimatedPiece
          key={piece.id}
          piece={piece}
          onDone={handlePieceDone}
          onClick={handleSquareClick}
          onHover={setHovered}
        />
      ))}

      <SquareHighlights layout={layout} selected={selected} hovered={hovered} />

      <Text
        position={[0, layout.surfaceY - layout.cellSize, -layout.cellSize * 5]}
        fontSize={layout.cellSize * 0.3}
        color="#ccc"
        anchorX="center"
      >
        click piece, then destination
      </Text>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={9}
        maxDistance={18}
      />
    </>
  )
}

export function ChessBoard3D({ game, onMove }: Props) {
  useEffect(() => {
    ALL_MODEL_URLS.forEach((url) => useGLTF.preload(url))
  }, [])

  return (
    <div className="board-3d">
      <Canvas shadows camera={{ position: [0, 10, 10], fov: 48 }}>
        <color attach="background" args={['#12151c']} />
        <fog attach="fog" args={['#12151c', 14, 28]} />
        <Scene game={game} onMove={onMove} />
      </Canvas>
    </div>
  )
}
