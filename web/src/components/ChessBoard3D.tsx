import { Canvas, useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePreload3DAssets } from '../hooks/usePreload3DAssets'
import type { ThreeEvent } from '@react-three/fiber'
import type { MeshStandardMaterial } from 'three'
import type { GameState, BoardPiece } from '../types'
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
import { valhallaSlotPosition } from '../lib/valhalla'
import { AnimatedPiece, type PieceVisual } from './AnimatedPiece'
import { BoardCameraControls, CAMERA_PRESETS, type CameraAngleId, type CameraMode } from './BoardCameraControls'
import { TileBoard } from './TileBoard'
import { ValhallaPlatforms } from './ValhallaPlatforms'

type Props = {
  game: GameState
  onMove: (uci: string) => void
  onSwitchTo2D?: () => void
}

const SELECT_COLOR = '#5ce1ff'
const HOVER_COLOR = '#ff9f43'

function rebuildSquareMap(pieces: Map<string, PieceVisual> | PieceVisual[]) {
  const values = pieces instanceof Map ? [...pieces.values()] : pieces
  const squareToId = new Map<string, string>()
  for (const piece of values) {
    if (piece.captured || !piece.square) continue
    squareToId.set(piece.square, piece.id)
  }
  return squareToId
}

function reconcileVisualPieces(
  byId: Map<string, PieceVisual>,
  nextBoard: ReturnType<typeof fenToPieces>,
) {
  const nextBySq = new Map(nextBoard.map((p) => [p.square, p]))

  for (const [id, piece] of [...byId.entries()]) {
    if (piece.captured) continue
    if (!piece.done) continue
    if (!piece.square) {
      byId.delete(id)
      continue
    }
    const expected = nextBySq.get(piece.square)
    if (
      !expected ||
      expected.pieceType !== piece.pieceType ||
      expected.color !== piece.color
    ) {
      byId.delete(id)
    }
  }

  const winners = new Map<string, PieceVisual>()
  for (const piece of byId.values()) {
    if (piece.captured || !piece.square) continue
    const existing = winners.get(piece.square)
    if (!existing) {
      winners.set(piece.square, piece)
      continue
    }
    const keep = !existing.done ? existing : !piece.done ? piece : existing
    const drop = keep.id === existing.id ? piece : existing
    byId.delete(drop.id)
    winners.set(piece.square, keep)
  }

  return rebuildSquareMap(byId)
}

function SquareHitbox({
  square,
  x,
  z,
  layout,
  cameraMode,
  onClick,
  onHover,
}: {
  square: string
  x: number
  z: number
  layout: BoardLayout
  cameraMode: CameraMode
  onClick: (square: string) => void
  onHover: (square: string | null) => void
}) {
  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick(square)
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onClick(square)
  }

  const hitY = layout.surfaceY + 0.04
  const [hitW, hitD] = getSquareHitSize(square, layout)
  const freeCamera = cameraMode === 'free'

  return (
    <mesh
      position={[x, hitY, z]}
      onClick={freeCamera ? handleSelect : undefined}
      onPointerDown={freeCamera ? undefined : onPointerDown}
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

  const lift = layout.surfaceY + 0.0035
  const highlightThickness = 0.006

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
              highlightThickness,
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
        <mesh position={[hoveredPos.x, lift, hoveredPos.z]} renderOrder={19}>
          <boxGeometry
            args={[
              hoveredSize[0] * SQUARE_HIGHLIGHT_SCALE,
              highlightThickness * 0.9,
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

function Scene({
  game,
  onMove,
  cameraMode,
  cameraAngle,
}: Props & { cameraMode: CameraMode; cameraAngle: CameraAngleId }) {
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
        valhallaIndex: null,
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

        const findAtSquare = (square: string) => {
          const onSquare = [...byId.values()].find(
            (p) => !p.captured && p.square === square,
          )
          if (onSquare) return onSquare

          const mappedId = squareToId.get(square)
          if (!mappedId) return undefined
          const mapped = byId.get(mappedId)
          if (mapped && !mapped.captured && mapped.square === square) return mapped
          return undefined
        }

        const findMover = (from: string, boardPiece: BoardPiece) => {
          const atFrom = findAtSquare(from)
          if (atFrom) return atFrom

          const candidates = [...byId.values()].filter(
            (p) =>
              !p.captured &&
              p.color === boardPiece.color &&
              (p.pieceType === boardPiece.pieceType ||
                (p.pieceType.endsWith('P') && boardPiece.pieceType.endsWith('Q'))),
          )
          if (candidates.length !== 1) return undefined
          return candidates[0]
        }

        const sendToValhalla = (piece: PieceVisual, fromSquare: string) => {
          if (piece.captured) return
          const idx = captureCountRef.current[piece.color]
          captureCountRef.current[piece.color] += 1
          const [tx, ty, tz] = valhallaSlotPosition(piece.color, idx, layout)
          piece.captured = true
          piece.valhallaIndex = idx
          piece.square = null
          piece.targetX = tx
          piece.targetY = ty
          piece.targetZ = tz
          piece.done = false
          squareToId.delete(fromSquare)
        }

        for (const captured of captures) {
          const piece = findAtSquare(captured.square)
          if (!piece) continue
          sendToValhalla(piece, captured.square)
        }

        for (const move of moves) {
          const victim = findAtSquare(move.to)
          if (victim && victim.color !== move.piece.color) {
            sendToValhalla(victim, move.to)
          }

          const piece = findMover(move.from, move.piece)
          if (!piece || piece.captured) continue

          const [tx, ty, tz] = squareToWorld(move.to, layout)
          if (piece.square && piece.square !== move.from) {
            squareToId.delete(piece.square)
          }
          squareToId.delete(move.from)
          piece.square = move.to
          piece.pieceType = move.piece.pieceType
          piece.targetX = tx
          piece.targetY = ty
          piece.targetZ = tz
          piece.done = false
          squareToId.set(move.to, piece.id)
        }

        for (const boardPiece of next) {
          const alreadyThere = [...byId.values()].some(
            (p) =>
              !p.captured &&
              p.square === boardPiece.square &&
              p.pieceType === boardPiece.pieceType &&
              p.color === boardPiece.color,
          )
          if (alreadyThere) continue

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
            valhallaIndex: null,
            done: true,
          })
          squareToId.set(boardPiece.square, id)
        }

        squareToIdRef.current = reconcileVisualPieces(byId, next)
        return [...byId.values()]
      })

      prevFenRef.current = nextFen
    },
    [layout],
  )

  const gameIdRef = useRef(game.id)

  useEffect(() => {
    if (gameIdRef.current !== game.id) {
      gameIdRef.current = game.id
      prevFenRef.current = null
      idCounterRef.current = 0
      captureCountRef.current = { white: 0, black: 0 }
      initPieces(game.fen)
      return
    }
    if (!prevFenRef.current) {
      initPieces(game.fen)
      return
    }
    if (prevFenRef.current === game.fen) return
    animateTransition(prevFenRef.current, game.fen)
  }, [game.id, game.fen, initPieces, animateTransition])

  useEffect(() => {
    if (!prevFenRef.current) return
    setVisualPieces((current) =>
      current.map((p) => {
        if (p.captured) {
          const idx = p.valhallaIndex ?? 0
          const [tx, ty, tz] = valhallaSlotPosition(p.color, idx, layout)
          if (!p.done) return { ...p, targetX: tx, targetY: ty, targetZ: tz }
          return { ...p, x: tx, y: ty, z: tz, targetX: tx, targetY: ty, targetZ: tz }
        }
        if (!p.square) return p
        const [x, y, z] = squareToWorld(p.square, layout)
        if (!p.done) return { ...p, targetX: x, targetY: y, targetZ: z }
        return { ...p, x, y, z, targetX: x, targetY: y, targetZ: z }
      }),
    )
  }, [layout])

  const handlePieceDone = useCallback((id: string) => {
    setVisualPieces((current) => {
      const next = current.map((p) => {
        if (p.id !== id) return p
        return {
          ...p,
          x: p.targetX,
          y: p.targetY,
          z: p.targetZ,
          done: true,
        }
      })
      const byId = new Map(next.map((p) => [p.id, p]))
      squareToIdRef.current = reconcileVisualPieces(byId, fenToPieces(game.fen))
      return [...byId.values()]
    })
  }, [game.fen])

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
      <ambientLight intensity={1.05} />
      <hemisphereLight args={['#d4ecff', '#2a5240', 0.55]} />
      <directionalLight position={[6, 14, 5]} intensity={1.25} castShadow />
      <directionalLight position={[-4, 8, 6]} intensity={0.65} />
      <directionalLight position={[0, 5, -8]} intensity={0.35} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#fff8ee" />

      {/* Dark ground plane under the board so pieces (white + brown) stay easy to read */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]} receiveShadow>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color="#1b2430" roughness={0.92} metalness={0.02} />
      </mesh>

      <Suspense fallback={null}>
        <TileBoard onSurfaceY={setBoardSurfaceY} />
        <ValhallaPlatforms layout={layout} />
      </Suspense>

      {allSquares(layout).map((sq) => (
        <SquareHitbox
          key={`hit-${sq.square}`}
          square={sq.square}
          x={sq.x}
          z={sq.z}
          layout={layout}
          cameraMode={cameraMode}
          onClick={handleSquareClick}
          onHover={setHovered}
        />
      ))}

      {visualPieces.map((piece) => (
        <AnimatedPiece
          key={piece.id}
          piece={piece}
          cameraMode={cameraMode}
          onDone={handlePieceDone}
          onClick={handleSquareClick}
          onHover={setHovered}
        />
      ))}

      <SquareHighlights layout={layout} selected={selected} hovered={hovered} />

      <Text
        position={[0, layout.surfaceY - layout.cellSize, -layout.cellSize * 5]}
        fontSize={layout.cellSize * 0.3}
        color="#eef6ff"
        anchorX="center"
      >
        click piece, then destination
      </Text>

      <BoardCameraControls cameraMode={cameraMode} cameraAngle={cameraAngle} />
    </>
  )
}

export function ChessBoard3D({ game, onMove, onSwitchTo2D }: Props) {
  const { isLoading, progress } = usePreload3DAssets()
  const [cameraMode, setCameraMode] = useState<CameraMode>('fixed')
  const [cameraAngle, setCameraAngle] = useState<CameraAngleId>('corner-ne')

  useEffect(() => {
    ALL_MODEL_URLS.forEach((url) => useGLTF.preload(url))
  }, [])

  return (
    <div className="board-3d">
      <div className="camera-controls">
        <div className="camera-controls-row">
          <span className="camera-controls-label">Camera</span>
          <button
            type="button"
            className={cameraMode === 'fixed' ? 'active' : ''}
            onClick={() => setCameraMode('fixed')}
          >
            Fixed angles
          </button>
          <button
            type="button"
            className={cameraMode === 'free' ? 'active' : ''}
            onClick={() => setCameraMode('free')}
            title="Left-click drag to rotate; scroll to zoom"
          >
            Free drag
          </button>
        </div>
        {cameraMode === 'fixed' && (
          <div className="camera-controls-row camera-controls-angles">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={cameraAngle === preset.id ? 'active' : ''}
                onClick={() => setCameraAngle(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading-screen" role="status" aria-live="polite">
          <div className="loading-overlay">
            <h2>3D assets are loading, please wait…</h2>
            <p>Large 3D piece models are still downloading. This can take a little while on first load.</p>
            <div className="loading-bar" aria-hidden="true">
              <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="loading-progress">{progress}% loaded</p>
            <p className="loading-hint">
              Want to play now? Use the 2D board while assets load, then switch back to 3D anytime.
            </p>
            {onSwitchTo2D && (
              <button type="button" className="loading-switch-btn" onClick={onSwitchTo2D}>
                Use 2D board while loading
              </button>
            )}
          </div>
        </div>
      )}
      <Canvas shadows camera={{ position: [7.5, 9.5, -7.5], fov: 48 }}>
        <color attach="background" args={['#9ec8e8']} />
        <fog attach="fog" args={['#9ec8e8', 16, 32]} />
        <Suspense fallback={null}>
          <Scene
            game={game}
            onMove={onMove}
            cameraMode={cameraMode}
            cameraAngle={cameraAngle}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
