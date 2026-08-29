import { motion } from 'framer-motion'
import { memo } from 'react'

interface TreeEdgeProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

function TreeEdgeBase({ fromX, fromY, toX, toY }: TreeEdgeProps) {
  const midY = (fromY + toY) / 2
  const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`

  return (
    <motion.path
      d={path}
      fill="none"
      stroke="var(--color-border)"
      strokeWidth={2}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    />
  )
}

export const TreeEdge = memo(TreeEdgeBase)
