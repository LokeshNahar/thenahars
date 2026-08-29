import { useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Magnetic pointer-follow effect: the element eases toward the cursor within
 * its own bounds and snaps back on leave. Spring physics stand in for GSAP's
 * elastic.out easing so this stays inside the existing Framer Motion stack.
 */
export function useMagnetic(strength = 0.3) {
  const ref = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 })

  function onPointerMove(e: React.PointerEvent) {
    if (prefersReducedMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * strength)
    y.set((e.clientY - rect.top - rect.height / 2) * strength)
  }

  function onPointerLeave() {
    x.set(0)
    y.set(0)
  }

  return { ref, x: springX, y: springY, onPointerMove, onPointerLeave }
}
