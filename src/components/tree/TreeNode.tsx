import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { memo, useState } from 'react'
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

function MiniCard({ person }: { person: Person }) {
  const placeholder = isPlaceholder(person)
  const [hovering, setHovering] = useState(false)

  const body = (
    <div
      className={`flex w-24 flex-col items-center gap-1 rounded-xl p-2 text-center transition-shadow duration-200 ${
        placeholder ? 'border border-dashed border-[var(--color-border)]' : 'glass hover:shadow-[var(--shadow-glow)]'
      }`}
    >
      <PersonAvatar person={person} size="sm" />
      <p
        className={`line-clamp-2 text-[11px] leading-tight font-medium ${
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
    <div
      className="relative"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <PersonPreviewPopover person={person} visible={hovering} />
      <Link
        to={`/person/${person.nahar_id}`}
        className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        {body}
      </Link>
    </div>
  )
}

function TreeNodeBase({ primary, spouses, hasChildren, expanded, onToggle, x, y }: TreeNodeProps) {
  return (
    <motion.div
      layout
      data-node-id={primary.nahar_id}
      initial={{ opacity: 0, scale: 0.85, y: -12 }}
      animate={{ opacity: 1, scale: 1, x, y: y }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
      style={{ left: 0, top: 0 }}
    >
      <MiniCard person={primary} />
      {spouses.map((s) => (
        <MiniCard key={s.nahar_id} person={s} />
      ))}
      {hasChildren && (
        <motion.button
          type="button"
          onClick={onToggle}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.08 }}
          aria-label={expanded ? `Collapse ${primary.name}'s children` : `Expand ${primary.name}'s children`}
          aria-expanded={expanded}
          className="absolute -bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </motion.button>
      )}
    </motion.div>
  )
}

export const TreeNode = memo(TreeNodeBase)
