import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, Search, Sparkles, TreePine } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { MagneticButton } from '../ui/MagneticButton'

export function Hero() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { user } = useAuth()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const springX = useSpring(px, { stiffness: 60, damping: 20 })
  const springY = useSpring(py, { stiffness: 60, damping: 20 })
  const glowTransform = useMotionTemplate`translate3d(${springX}px, ${springY}px, 0)`

  const fullName = user?.naharId ? user.name : null
  const nameParts = fullName?.trim().split(/\s+/) ?? []
  const firstName = nameParts.length > 0 ? nameParts[0] : null
  const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (prefersReducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    px.set(((e.clientX - rect.left) / rect.width - 0.5) * 40)
    py.set(((e.clientY - rect.top) / rect.height - 0.5) * 40)
  }

  return (
    <section
      onPointerMove={onPointerMove}
      className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16"
    >
      <motion.div
        aria-hidden="true"
        style={{ transform: glowTransform }}
        className="pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]/20 blur-[90px]"
      />

      <AnimatePresence mode="wait">
        {firstName ? (
          <motion.p
            key="welcome"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.45, type: 'spring', stiffness: 190, damping: 20 }}
            className="relative z-10 mb-3 font-[var(--font-heading)] text-2xl font-semibold text-[var(--color-foreground)] sm:text-3xl"
          >
            Welcome back, {firstName}
            {surname && (
              <>
                {' '}
                <span className="bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
                  {surname}
                </span>
              </>
            )}
          </motion.p>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
            className="glass relative z-10 mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-widest text-[var(--color-accent)] uppercase"
          >
            <Sparkles size={12} aria-hidden="true" />
            Est. with Bhanwar Lal & Bhanwari Devi Nahar
          </motion.div>
        )}
      </AnimatePresence>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 font-[var(--font-heading)] text-5xl font-bold text-balance text-[var(--color-foreground)] sm:text-7xl"
      >
        The Nahars
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="relative z-10 mt-5 max-w-xl text-lg text-[var(--color-muted-foreground)]"
      >
        A living record of our family — every branch, every generation — kept together in one place.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative z-10 mt-9 flex flex-col gap-3 sm:flex-row"
      >
        {firstName ? (
          <MagneticButton to="/tree" variant="solid">
            <TreePine size={16} aria-hidden="true" />
            View Your Branch
          </MagneticButton>
        ) : (
          <MagneticButton to="/tree" variant="solid">
            Explore the Tree
            <ArrowRight size={16} aria-hidden="true" />
          </MagneticButton>
        )}
        <MagneticButton to="/directory" variant="glass">
          <Search size={16} aria-hidden="true" />
          Search Directory
        </MagneticButton>
      </motion.div>
    </section>
  )
}
