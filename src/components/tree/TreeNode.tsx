import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { memo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isPlaceholder, type Person } from '../../data/schema'
import { PersonAvatar } from '../person/PersonAvatar'
import { StatusBadge } from '../person/StatusBadge'
import { PersonPreviewPopover } from './PersonPreviewPopover'

interface TreeNodeProps {
  primary: Person
  spouses: Person[]
  hasChildren: boolean
  expanded: boolean
  onToggle: () => void
  x: number
  y: number
}

interface AnchorRect {
  top: number
  left: number
  width: number
}

function MiniCard({ person }: { person: Person }) {
  const placeholder = isPlaceholder(person)
  const [hovering, setHovering] = useState(false)
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  function handleEnter() {
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) setAnchorRect({ top: rect.top, left: rect.left, width: rect.width })
    setHovering(true)
  }

  const body = (
    <div
      ref={cardRef}
      className={`flex w-28 flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center transition-[box-shadow,transform] duration-200 ${
        placeholder
          ? 'border border-dashed border-[var(--color-border)]'
          : 'glass hover:scale-[1.04] hover:shadow-[var(--shadow-glow)]'
      }`}
    >
      <PersonAvatar person={person} size="sm" />
      <p
        className={`line-clamp-2 text-xs leading-tight font-semibold ${
          placeholder ? 'text-[var(--color-muted-foreground)] italic' : 'text-[var(--color-card-foreground)]'
        }`}
      >
        {person.name}
      </p>
      <StatusBadge status={person.status} />
    </div>
  )

  if (placeholder) return <div className="relative">{body}</div>

  return (
    <div className="relative" onPointerEnter={handleEnter} onPointerLeave={() => setHovering(false)}>
      <PersonPreviewPopover person={person} visible={hovering} anchorRect={anchorRect} />
      <Link
        to={`/person/${person.nahar_id}`}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        {body}
      </Link>
    </div>
  )
}

function TreeNodeBase({ primary, spouses, hasChildren, expanded, onToggle, x, y }: TreeNodeProps) {
  const isCouple = spouses.length > 0

  return (
    <motion.div
      layout
      data-node-id={primary.nahar_id}
      initial={{ opacity: 0, scale: 0.75, y: -16 }}
      animate={{ opacity: 1, scale: 1, x, y: y }}
      transition={{ type: 'spring', stiffness: 240, damping: 22, mass: 0.7 }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: 0, top: 0 }}
    >
      <div className="flex items-center gap-2">
        <MiniCard person={primary} />
        {spouses.map((s) => (
          <div key={s.nahar_id} className="flex items-center gap-2">
            {isCouple && (
              <span aria-hidden="true" className="h-px w-3 shrink-0 bg-[var(--color-accent)] opacity-50" />
            )}
            <MiniCard person={s} />
          </div>
        ))}
      </div>

      {hasChildren && (
        <motion.button
          type="button"
          onClick={onToggle}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.1 }}
          aria-label={expanded ? `Collapse ${primary.name}'s children` : `Expand ${primary.name}'s children`}
          aria-expanded={expanded}
          className="absolute -bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          {expanded ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </motion.button>
      )}
    </motion.div>
  )
}

export const TreeNode = memo(TreeNodeBase)
