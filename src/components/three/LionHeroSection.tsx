import { useMotionValueEvent, useScroll } from 'framer-motion'
import { useRef, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { LionScene } from './LionScene'

interface LionHeroSectionProps {
  children: ReactNode
}

/**
 * Wraps the hero in a tall scroll track. The 3D canvas is pinned (sticky)
 * for the height of that track while the lion rotates/rises/recedes in
 * response to scroll progress, then normal page content continues below.
 * scrollProgress is a ref, not React state — useFrame reads it directly so
 * scrolling never triggers a React re-render.
 *
 * With prefers-reduced-motion, the scroll-pin track collapses to a single
 * screen height (no scroll-jacking) and the lion just idles in place —
 * LowPolyLion itself skips its own motion when reducedMotion is true.
 */
export function LionHeroSection({ children }: LionHeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollProgress = useRef(0)

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end start'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (!reducedMotion) scrollProgress.current = v
  })

  return (
    <div ref={trackRef} className={reducedMotion ? 'relative' : 'relative h-[160vh]'}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <LionScene scrollProgress={scrollProgress} />
        <div className="relative z-10 flex h-full items-center justify-center">{children}</div>
      </div>
    </div>
  )
}
