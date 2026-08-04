import { useMemo } from 'react'
import * as THREE from 'three'
import type { RoomAtmosphere } from '../lib/themes'

type Props = {
  atmosphere: RoomAtmosphere
}

/**
 * Soft sky dome + radial arena floor so the 3D room isn't a flat void.
 * Cheap shaders; no textures.
 */
export function RoomBackdrop({ atmosphere }: Props) {
  const skyMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(atmosphere.skyTop) },
        horizonColor: { value: new THREE.Color(atmosphere.skyHorizon) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          float t = smoothstep(-0.15, 0.72, h);
          vec3 col = mix(horizonColor, topColor, t);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
    return mat
  }, [atmosphere.skyTop, atmosphere.skyHorizon])

  const floorMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        innerColor: { value: new THREE.Color(atmosphere.groundInner) },
        outerColor: { value: new THREE.Color(atmosphere.groundOuter) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 innerColor;
        uniform vec3 outerColor;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float d = length(p) * 2.0;
          float ring = smoothstep(0.35, 1.15, d);
          float soft = smoothstep(1.05, 1.45, d);
          vec3 col = mix(innerColor, outerColor, ring);
          float alpha = 1.0 - soft * 0.85;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    })
    return mat
  }, [atmosphere.groundInner, atmosphere.groundOuter])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[48, 24, 16]} />
        <primitive object={skyMat} attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Subtle under-board glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <circleGeometry args={[6.2, 48]} />
        <meshBasicMaterial
          color={atmosphere.skyHorizon}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
