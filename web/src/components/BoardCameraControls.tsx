import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
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

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarse(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return coarse
}

export function BoardCameraControls({ cameraMode, cameraAngle }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera, gl } = useThree()
  const free = cameraMode === 'free'
  const coarsePointer = useCoarsePointer()

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

  // On phones, one-finger drag must not steal piece taps — rotate/zoom with two fingers.
  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = coarsePointer ? 'manipulation' : 'none'
  }, [gl, coarsePointer])

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
      rotateSpeed={0.85}
      zoomSpeed={0.9}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={
        coarsePointer
          ? {
              // enablePan is false → one finger is ignored by controls → taps reach pieces
              ONE: THREE.TOUCH.PAN,
              TWO: THREE.TOUCH.DOLLY_ROTATE,
            }
          : {
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }
      }
    />
  )
}
