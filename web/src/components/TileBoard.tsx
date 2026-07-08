import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { allSquares, isLightSquare, setBoardSurfaceY } from '../lib/boardLayout'
import { BOARD_EDGE, BOARD_THICKNESS, TILE_GREEN, TILE_SAND } from '../lib/modelUtils'

type TileBoardProps = {
  onSurfaceY?: (y: number) => void
}

export function TileBoard({ onSurfaceY }: TileBoardProps) {
  useEffect(() => {
    setBoardSurfaceY(0)
    onSurfaceY?.(0)
  }, [onSurfaceY])

  const board = useMemo(() => {
    const group = new THREE.Group()

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(8, BOARD_THICKNESS, 8),
      new THREE.MeshStandardMaterial({
        color: BOARD_EDGE,
        roughness: 0.88,
        metalness: 0.04,
      }),
    )
    slab.position.y = -BOARD_THICKNESS / 2
    slab.castShadow = true
    slab.receiveShadow = true
    group.add(slab)

    const tileY = 0.002
    for (const sq of allSquares()) {
      const geom = new THREE.PlaneGeometry(1, 1)
      const isLight = isLightSquare(sq.square)
      const mat = new THREE.MeshStandardMaterial({
        color: isLight ? TILE_SAND : TILE_GREEN,
        roughness: 0.6,
        metalness: 0.05,
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(sq.x, tileY, sq.z)
      mesh.receiveShadow = true
      group.add(mesh)
    }

    return group
  }, [])

  return <primitive object={board} receiveShadow />
}
