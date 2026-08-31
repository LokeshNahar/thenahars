import { motion } from 'framer-motion'
import { memo } from 'react'

interface TreeEdgeProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  delay?: number
  /** True for an edge on the signed-in viewer's own ancestor path — rendered thicker/warmer. */
  onMyPath?: boolean
}

function TreeEdgeBase({ fromX, fromY, toX, toY, delay = 0, onMyPath = false }: TreeEdgeProps) {
  const midY = (fromY + toY) / 2
  const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={onMyPath ? 'var(--color-accent)' : 'url(#tree-edge-gradient)'}
      strokeWidth={onMyPath ? 5 : 3}
      strokeLinecap="round"
      style={{
        filter: onMyPath
          ? 'drop-shadow(0 2px 4px color-mix(in srgb, var(--color-accent) 40%, transparent))'
          : 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))',
      }}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: onMyPath ? 0.95 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

export const TreeEdge = memo(TreeEdgeBase)
