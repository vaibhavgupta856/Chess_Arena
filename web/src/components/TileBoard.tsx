import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { allSquares, isLightSquare, setBoardSurfaceY } from '../lib/boardLayout'
import { TILE_GREEN, TILE_SAND } from '../lib/modelUtils'

type TileBoardProps = {
  onSurfaceY?: (y: number) => void
}

export function TileBoard({ onSurfaceY }: TileBoardProps) {
  useEffect(() => {
    // Flat procedural board at y = 0
    setBoardSurfaceY(0)
    onSurfaceY?.(0)
  }, [onSurfaceY])

  const board = useMemo(() => {
    const group = new THREE.Group()

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
      mesh.position.set(sq.x, 0, sq.z)
      mesh.receiveShadow = true
      group.add(mesh)
    }

    return group
  }, [])

  return <primitive object={board} receiveShadow />
}
