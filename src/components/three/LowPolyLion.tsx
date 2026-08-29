import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface LowPolyLionProps {
  scrollProgress: React.RefObject<number>
  reducedMotion: boolean
}

const GOLD = '#c88a1a'
const GOLD_LIGHT = '#e2a53a'
const DARK = '#1c1917'

/** Deterministic pseudo-random so the mane looks hand-placed, not jittery on rerender. */
function seeded(seed: number) {
  const x = Math.sin(seed * 999) * 10000
  return x - Math.floor(x)
}

/**
 * A stylized, faceted (low-poly) lion built entirely from primitive
 * geometries — icosahedra, cones, cylinders — no external model file.
 * Reads as a geometric "gem lion" rather than a photoreal sculpt, which
 * fits the flat/premium heritage aesthetic instead of fighting it.
 */
function ManeSpikes() {
  const count = 28
  const spikes = useMemo(() => {
    const arr: { position: [number, number, number]; rotation: [number, number, number]; scale: number }[] =
      []
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2
      const jitter = (seeded(i) - 0.5) * 0.15
      const radius = 1.55 + (seeded(i + 50) - 0.5) * 0.2
      const x = Math.cos(theta) * radius
      const y = Math.sin(theta) * radius * 0.92
      arr.push({
        position: [x, y, -0.15 + seeded(i + 100) * 0.3],
        rotation: [0, 0, theta + Math.PI / 2 + jitter],
        scale: 0.75 + seeded(i + 20) * 0.5,
      })
    }
    return arr
  }, [])

  return (
    <group>
      {spikes.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation} scale={s.scale} castShadow>
          <coneGeometry args={[0.22, 0.85, 5]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? GOLD : GOLD_LIGHT}
            flatShading
            roughness={0.45}
            metalness={0.35}
          />
        </mesh>
      ))}
    </group>
  )
}

function Head() {
  return (
    <group>
      {/* Skull */}
      <mesh castShadow position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color={GOLD_LIGHT} flatShading roughness={0.5} metalness={0.25} />
      </mesh>
      {/* Muzzle */}
      <mesh castShadow position={[0, -0.35, 1.05]} scale={[0.62, 0.5, 0.75]}>
        <icosahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color="#f2d9a8" flatShading roughness={0.6} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, -0.28, 1.68]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.16, 0.28, 4]} />
        <meshStandardMaterial color={DARK} flatShading roughness={0.4} />
      </mesh>
      {/* Eyes */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.18, 0.9]}>
          <icosahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial color={DARK} flatShading emissive={GOLD} emissiveIntensity={0.15} />
        </mesh>
      ))}
      {/* Ears */}
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.95, 0.15]} rotation={[0.2, 0, x > 0 ? -0.3 : 0.3]} castShadow>
          <coneGeometry args={[0.3, 0.4, 4]} />
          <meshStandardMaterial color={GOLD} flatShading roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function Body() {
  return (
    <group position={[0, -1.7, -0.6]}>
      <mesh castShadow scale={[0.95, 0.85, 1.6]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={GOLD_LIGHT} flatShading roughness={0.55} metalness={0.2} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.1, -1.7]} rotation={[0.9, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 1.3, 6]} />
        <meshStandardMaterial color={GOLD} flatShading roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.55, -2.25]} castShadow>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={DARK} flatShading />
      </mesh>
      {/* Legs */}
      {[
        [-0.55, -0.75, 0.7],
        [0.55, -0.75, 0.7],
        [-0.55, -0.75, -0.7],
        [0.55, -0.75, -0.7],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.16, 0.13, 1, 5]} />
          <meshStandardMaterial color={GOLD} flatShading roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

export function LowPolyLion({ scrollProgress, reducedMotion }: LowPolyLionProps) {
  const groupRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)

  const BASE_SCALE = 0.75

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const progress = scrollProgress.current ?? 0

    if (groupRef.current) {
      // Gentle idle bob + scroll-driven rotation and rise.
      const idleBob = reducedMotion ? 0 : Math.sin(t * 0.8) * 0.04
      groupRef.current.position.y = -3.1 + idleBob - progress * 0.6
      groupRef.current.rotation.y = progress * Math.PI * 1.15
      groupRef.current.position.z = -progress * 1.8
      const targetScale = BASE_SCALE * (1 - progress * 0.2)
      groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 4, delta))
    }
    if (headRef.current && !reducedMotion) {
      headRef.current.rotation.x = Math.sin(t * 0.6) * 0.03
    }
  })

  return (
    <group ref={groupRef} scale={BASE_SCALE} dispose={null}>
      <group ref={headRef} position={[0, 1.3, 0]}>
        <ManeSpikes />
        <Head />
      </group>
      <Body />
    </group>
  )
}
