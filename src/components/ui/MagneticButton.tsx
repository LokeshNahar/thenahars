import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMagnetic } from '../../hooks/useMagnetic'

interface MagneticButtonProps {
  children: ReactNode
  to?: string
  onClick?: () => void
  variant?: 'solid' | 'glass'
  className?: string
  type?: 'button' | 'submit'
}

const VARIANT_CLASS: Record<NonNullable<MagneticButtonProps['variant']>, string> = {
  solid:
    'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] hover:brightness-110',
  glass: 'glass text-[var(--color-foreground)] hover:bg-[var(--glass-bg-strong)]',
}

export function MagneticButton({
  children,
  to,
  onClick,
  variant = 'solid',
  className = '',
  type = 'button',
}: MagneticButtonProps) {
  const { ref, x, y, onPointerMove, onPointerLeave } = useMagnetic(0.25)

  const baseClass = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[background-color,box-shadow,filter] duration-200 ${VARIANT_CLASS[variant]} ${className}`

  const motionProps = {
    style: { x, y },
    onPointerMove,
    onPointerLeave,
    whileTap: { scale: 0.95 },
  }

  if (to) {
    return (
      <motion.div ref={ref as React.RefObject<HTMLDivElement>} {...motionProps} className="inline-block">
        <Link to={to} className={baseClass}>
          {children}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      className={baseClass}
      {...motionProps}
    >
      {children}
    </motion.button>
  )
}
