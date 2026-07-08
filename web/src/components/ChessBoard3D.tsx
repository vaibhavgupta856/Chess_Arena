import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, useGLTF } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePreload3DAssets } from '../hooks/usePreload3DAssets'
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
import { valhallaSlotPosition } from '../lib/valhalla'
import { AnimatedPiece, type PieceVisual } from './AnimatedPiece'
import { TileBoard } from './TileBoard'
import { ValhallaPlatforms } from './ValhallaPlatforms'

type Props = {
  game: GameState
  onMove: (uci: string) => void
  onSwitchTo2D?: () => void
}

type CameraMode = 'fixed' | 'free'
type CameraAngleId =
  | 'corner-ne'
  | 'corner-nw'
  | 'corner-se'
  | 'corner-sw'
  | 'white'
  | 'black'
  | 'side'
  | 'top'

type CameraPreset = {
  id: CameraAngleId
  label: string
  position: [number, number, number]
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'corner-ne', label: 'Corner NE', position: [7.5, 9.5, -7.5] },
  { id: 'corner-nw', label: 'Corner NW', position: [-7.5, 9.5, -7.5] },
  { id: 'corner-se', label: 'Corner SE', position: [7.5, 9.5, 7.5] },
  { id: 'corner-sw', label: 'Corner SW', position: [-7.5, 9.5, 7.5] },
  { id: 'white', label: 'White side', position: [0, 10, -11] },
  { id: 'black', label: 'Black side', position: [0, 10, 11] },
  { id: 'side', label: 'Side', position: [12, 9, 0] },
  { id: 'top', label: 'Top', position: [0, 16, 0.01] },
]

const SELECT_COLOR = '#5ce1ff'
const HOVER_COLOR = '#ff9f43'

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
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()

  const pieces = useMemo(() => fenToPieces(game.fen), [game.fen])
  const layout = useMemo(() => getBoardLayout(boardSurfaceY), [boardSurfaceY])

  useEffect(() => {
    if (cameraMode !== 'fixed') return
    const preset = CAMERA_PRESETS.find((p) => p.id === cameraAngle) ?? CAMERA_PRESETS[0]
    camera.position.set(...preset.position)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [cameraMode, cameraAngle, camera])

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

        for (const captured of captures) {
          const id = squareToId.get(captured.square)
          if (!id) continue
          const piece = byId.get(id)
          if (!piece) continue

          const idx = captureCountRef.current[captured.color]
          captureCountRef.current[captured.color] += 1
          const [tx, ty, tz] = valhallaSlotPosition(captured.color, idx, layout)

          piece.captured = true
          piece.valhallaIndex = idx
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
            valhallaIndex: null,
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
    setVisualPieces((current) =>
      current.map((p) => {
        if (p.id !== id) return p
        return {
          ...p,
          x: p.targetX,
          y: p.targetY,
          z: p.targetZ,
          done: true,
        }
      }),
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
        color="#eef6ff"
        anchorX="center"
      >
        click piece, then destination
      </Text>

      <OrbitControls
        ref={controlsRef}
        enabled={cameraMode === 'free'}
        enableRotate={cameraMode === 'free'}
        enableZoom={cameraMode === 'free'}
        enablePan={false}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={9}
        maxDistance={18}
      />
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
