import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

interface TiltCardProps {
  children: ReactNode
  className?: string
  maxTilt?: number
  glare?: boolean
}

/** Cursor-following 3D tilt with an optional light-reflection glare, respecting reduced motion. */
export function TiltCard({ children, className = '', maxTilt = 10, glare = true }: TiltCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [hovering, setHovering] = useState(false)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const glareX = useMotionValue(50)
  const glareY = useMotionValue(50)

  const springRotateX = useSpring(rotateX, { stiffness: 260, damping: 20 })
  const springRotateY = useSpring(rotateY, { stiffness: 260, damping: 20 })
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, var(--glass-highlight), transparent 60%)`

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    rotateY.set((px - 0.5) * maxTilt * 2)
    rotateX.set((0.5 - py) * maxTilt * 2)
    glareX.set(px * 100)
    glareY.set(py * 100)
    setHovering(true)
  }

  function onPointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
    setHovering(false)
  }

  return (
    <motion.div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        rotateX: prefersReducedMotion ? 0 : springRotateX,
        rotateY: prefersReducedMotion ? 0 : springRotateY,
        transformStyle: 'preserve-3d',
        transformPerspective: 800,
      }}
      className={`relative ${className}`}
    >
      {children}
      {glare && !prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          style={{ background: glareBackground }}
          animate={{ opacity: hovering ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      )}
    </motion.div>
  )
}
