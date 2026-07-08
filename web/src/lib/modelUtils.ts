import * as THREE from 'three'

export const DEFAULT_BOARD_SURFACE_Y = 0.614

const SAND_TILE = '#b8ad92'
const GREEN_TILE = '#2a5240'

function isDarkMaterial(color: THREE.Color): boolean {
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b
  return luminance < 0.28
}

function isAccentColor(color: THREE.Color): boolean {
  const { r, g, b } = color
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 0.12) return false
  if (r > 0.3 && r > g * 1.35 && r > b * 1.35) return true
  if (g > 0.3 && g > r * 1.35 && g > b * 1.35) return true
  if (b > 0.3 && b > r * 1.35 && b > g * 1.35) return true
  return max > 0.45 && max - min > 0.2
}

export function applySideMaterials(root: THREE.Object3D, side: 'white' | 'black') {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const source = child.material
    const materials = Array.isArray(source) ? source : [source]
    const next = materials.map((mat) => {
      const cloned = mat.clone()

      cloned.map = null
      cloned.normalMap = null
      cloned.aoMap = null
      cloned.emissiveMap = null
      if (
        cloned instanceof THREE.MeshStandardMaterial ||
        cloned instanceof THREE.MeshPhysicalMaterial
      ) {
        cloned.metalnessMap = null
        cloned.roughnessMap = null
      }

      if (side === 'white') {
        cloned.color.set('#f8f8ff')
        cloned.emissive = new THREE.Color('#e8ecff')
        cloned.emissiveIntensity = 0.08
        if (
          cloned instanceof THREE.MeshStandardMaterial ||
          cloned instanceof THREE.MeshPhysicalMaterial
        ) {
          cloned.metalness = 0.15
          cloned.roughness = 0.35
        }
      } else {
        // Bright caramel wood — high contrast against green/sand tiles and white pieces.
        cloned.color.set('#d48a3a')
        cloned.emissive = new THREE.Color('#a85f20')
        cloned.emissiveIntensity = 0.14
        if (
          cloned instanceof THREE.MeshStandardMaterial ||
          cloned instanceof THREE.MeshPhysicalMaterial
        ) {
          cloned.metalness = 0.06
          cloned.roughness = 0.48
        }
      }

      return cloned
    })

    child.material = Array.isArray(source) ? next : next[0]
  })
}

export function applyCastleRecolor(root: THREE.Object3D, variant: 'white' | 'black') {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const source = child.material
    const materials = Array.isArray(source) ? source : [source]
    const next = materials.map((mat) => {
      const cloned = mat.clone()
      if (
        cloned instanceof THREE.MeshStandardMaterial ||
        cloned instanceof THREE.MeshPhysicalMaterial
      ) {
        if (isAccentColor(cloned.color)) return cloned
        if (isDarkMaterial(cloned.color)) {
          cloned.color.set(variant === 'white' ? '#ffffff' : '#000000')
        }
      }
      return cloned
    })

    child.material = Array.isArray(source) ? next : next[0]
  })
}

export function applyBoardTileColors(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const source = child.material
    const materials = Array.isArray(source) ? source : [source]
    const next = materials.map((mat) => {
      const cloned = mat.clone()
      if (
        cloned instanceof THREE.MeshStandardMaterial ||
        cloned instanceof THREE.MeshPhysicalMaterial
      ) {
        const lum = 0.299 * cloned.color.r + 0.587 * cloned.color.g + 0.114 * cloned.color.b
        if (lum < 0.45) {
          cloned.color.set(GREEN_TILE)
          cloned.roughness = 0.62
          cloned.metalness = 0.08
        } else {
          cloned.color.set(SAND_TILE)
          cloned.roughness = 0.58
          cloned.metalness = 0.06
        }
      }
      return cloned
    })

    child.material = Array.isArray(source) ? next : next[0]
  })
}

export function normalizeTileFootprint(
  scene: THREE.Object3D,
  footprint: number,
  sitOnGround = true,
) {
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const foot = Math.max(size.x, size.z)
  const scale = foot > 0 ? footprint / foot : 1

  scene.position.sub(center)
  if (sitOnGround) {
    scene.position.y += (size.y * scale) / 2
  }
  scene.scale.setScalar(scale)
}

export function tileTopY(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene)
  return box.max.y
}

export function normalizeToSize(scene: THREE.Object3D, targetSize: number, sitOnGround = true) {
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? targetSize / maxDim : 1

  scene.position.sub(center)
  if (sitOnGround) {
    scene.position.y += (size.y * scale) / 2
  }
  scene.scale.setScalar(scale)
}

export function centerModelXZ(scene: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  scene.position.x -= center.x
  scene.position.z -= center.z
}

export function computeBoardSurfaceY(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3())
  return box.min.y + size.y * 0.98
}

export function pieceFacingRotation(color: 'white' | 'black'): number {
  return color === 'white' ? -Math.PI / 2 : Math.PI / 2
}

export const TILE_SAND = SAND_TILE
export const TILE_GREEN = GREEN_TILE
