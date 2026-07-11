import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { allSquares, isLightSquare, setBoardSurfaceY } from '../lib/boardLayout'
import type { BoardTheme } from '../lib/themes'
import { BOARD_THICKNESS } from '../lib/modelUtils'

type TileBoardProps = {
  theme: BoardTheme
  onSurfaceY?: (y: number) => void
}

export function TileBoard({ theme, onSurfaceY }: TileBoardProps) {
  useEffect(() => {
    setBoardSurfaceY(0)
    onSurfaceY?.(0)
  }, [onSurfaceY])

  const board = useMemo(() => {
    const group = new THREE.Group()

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(8, BOARD_THICKNESS, 8),
      new THREE.MeshStandardMaterial({
        color: theme.boardEdge,
        roughness: 0.9,
        metalness: 0.03,
      }),
    )
    slab.position.y = -BOARD_THICKNESS / 2
    slab.receiveShadow = true
    group.add(slab)

    // Two shared materials + one geometry → far fewer draw calls than 64 meshes.
    const tileGeom = new THREE.PlaneGeometry(1, 1)
    const lightMat = new THREE.MeshStandardMaterial({
      color: theme.tileLight,
      roughness: 0.7,
      metalness: 0.04,
    })
    const darkMat = new THREE.MeshStandardMaterial({
      color: theme.tileDark,
      roughness: 0.7,
      metalness: 0.04,
    })

    const lights: THREE.Object3D[] = []
    const darks: THREE.Object3D[] = []
    for (const sq of allSquares()) {
      const mesh = new THREE.Mesh(tileGeom, isLightSquare(sq.square) ? lightMat : darkMat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(sq.x, 0.002, sq.z)
      mesh.receiveShadow = true
      ;(isLightSquare(sq.square) ? lights : darks).push(mesh)
    }
    for (const m of lights) group.add(m)
    for (const m of darks) group.add(m)

    return group
  }, [theme])

  return <primitive object={board} receiveShadow />
}
