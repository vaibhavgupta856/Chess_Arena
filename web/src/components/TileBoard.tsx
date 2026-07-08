import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { allSquares, isLightSquare, setBoardSurfaceY } from '../lib/boardLayout'
import { FERN_TILE_MODEL, FOREST_TILE_MODEL } from '../lib/tileModels'
import { normalizeTileFootprint, tileTopY } from '../lib/modelUtils'

const TILE_FOOTPRINT = 1

function prepareTileNode(root: THREE.Object3D, nodeName: string | null): THREE.Object3D {
  const source = nodeName ? root.getObjectByName(nodeName) : root
  if (!source) {
    throw new Error(`Tile node "${nodeName}" not found`)
  }
  const clone = source.clone(true)
  normalizeTileFootprint(clone, TILE_FOOTPRINT, true)

  // Avoid traversing for every clone we place on the board.
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return clone
}

type TileBoardProps = {
  onSurfaceY?: (y: number) => void
}

export function TileBoard({ onSurfaceY }: TileBoardProps) {
  const fernGltf = useGLTF(FERN_TILE_MODEL)
  const forestGltf = useGLTF(FOREST_TILE_MODEL)

  const { forestTemplate, fernTemplate, surfaceY } = useMemo(() => {
    const forest = prepareTileNode(forestGltf.scene, null)
    const fern = prepareTileNode(fernGltf.scene, null)
    const topY = tileTopY(forest)
    return { forestTemplate: forest, fernTemplate: fern, surfaceY: topY }
  }, [fernGltf.scene, forestGltf.scene])

  useEffect(() => {
    setBoardSurfaceY(surfaceY)
    onSurfaceY?.(surfaceY)
  }, [surfaceY, onSurfaceY])

  const board = useMemo(() => {
    const group = new THREE.Group()
    for (const sq of allSquares()) {
      // Base ground for every cell (keeps everything perfectly on the same plane).
      const base = forestTemplate.clone(true)
      base.position.set(sq.x, 0, sq.z)
      group.add(base)

      // Light (grass) squares: add smaller fern tufts on top of the same ground tile.
      if (isLightSquare(sq.square)) {
        const file = sq.square.charCodeAt(0) - 97
        const rank = Number(sq.square[1]) - 1
        const seed = file * 31 + rank * 17
        const tuftOffsets = [
          [-0.23, -0.20],
          [0.22, -0.04],
          [-0.03, 0.23],
        ] as const

        for (let i = 0; i < tuftOffsets.length; i++) {
          const [dx, dz] = tuftOffsets[i]

          // Deterministic slight variation (no flicker between renders).
          const rotY = ((seed + i * 19) % 360) * (Math.PI / 180)
          const scale = 0.55

          const tuft = fernTemplate.clone(true)
          tuft.scale.setScalar(scale)
          tuft.position.set(sq.x + dx, 0, sq.z + dz)
          tuft.rotation.set(0, rotY, 0)
          group.add(tuft)
        }
      }
    }
    return group
  }, [fernTemplate, forestTemplate])

  return <primitive object={board} receiveShadow />
}

useGLTF.preload(FERN_TILE_MODEL)
useGLTF.preload(FOREST_TILE_MODEL)
