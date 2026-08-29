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
      stroke="url(#tree-edge-gradient)"
      strokeWidth={2}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

export const TreeEdge = memo(TreeEdgeBase)
