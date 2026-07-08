import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export type CameraMode = 'fixed' | 'free'
export type CameraAngleId =
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

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'corner-ne', label: 'Corner NE', position: [7.5, 9.5, -7.5] },
  { id: 'corner-nw', label: 'Corner NW', position: [-7.5, 9.5, -7.5] },
  { id: 'corner-se', label: 'Corner SE', position: [7.5, 9.5, 7.5] },
  { id: 'corner-sw', label: 'Corner SW', position: [-7.5, 9.5, 7.5] },
  { id: 'white', label: 'White side', position: [0, 10, -11] },
  { id: 'black', label: 'Black side', position: [0, 10, 11] },
  { id: 'side', label: 'Side', position: [12, 9, 0] },
  { id: 'top', label: 'Top', position: [0, 16, 0.01] },
]

type Props = {
  cameraMode: CameraMode
  cameraAngle: CameraAngleId
}

export function BoardCameraControls({ cameraMode, cameraAngle }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const free = cameraMode === 'free'

  useEffect(() => {
    if (cameraMode !== 'fixed') return
    const preset = CAMERA_PRESETS.find((p) => p.id === cameraAngle) ?? CAMERA_PRESETS[0]
    camera.position.set(...preset.position)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    const controls = controlsRef.current
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }, [cameraMode, cameraAngle, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={free}
      enableRotate={free}
      enableZoom={free}
      enablePan={false}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={9}
      maxDistance={18}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  )
}
