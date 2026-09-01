import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { LowPolyLion } from './LowPolyLion'

interface LionSceneProps {
  /** 0 at top of the scroll region, 1 at the bottom — updated imperatively, not via React state. */
  scrollProgress: React.RefObject<number>
}

const DPR: [number, number] = [1, 1.75]

export function LionScene({ scrollProgress }: LionSceneProps) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Canvas
      dpr={DPR}
      camera={{ position: [0, 0.1, 8.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      className="!absolute !inset-0"
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 5, 5]} intensity={1.4} color="#fff4e0" castShadow={false} />
      <pointLight position={[-4, -2, -3]} intensity={0.5} color="#c88a1a" />
      <Suspense fallback={null}>
        <LowPolyLion scrollProgress={scrollProgress} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  )
}
