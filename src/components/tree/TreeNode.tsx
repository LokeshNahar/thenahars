import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { isPlaceholder, type Person } from '../../data/schema'
import { PersonAvatar } from '../person/PersonAvatar'
import { StatusBadge } from '../person/StatusBadge'

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
  const body = (
    <div
      className={`flex w-24 flex-col items-center gap-1 rounded-xl border p-2 text-center ${
        placeholder
          ? 'border-dashed border-[var(--color-border)]'
          : 'border-[var(--color-border)] bg-[var(--color-card)]'
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

  if (placeholder) return body
  return (
    <Link
      to={`/person/${person.nahar_id}`}
      className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
    >
      {body}
    </Link>
  )
}

function TreeNodeBase({ primary, spouses, hasChildren, expanded, onToggle, x, y }: TreeNodeProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
      style={{ left: 0, top: 0 }}
    >
      <MiniCard person={primary} />
      {spouses.map((s) => (
        <MiniCard key={s.nahar_id} person={s} />
      ))}
      {hasChildren && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? `Collapse ${primary.name}'s children` : `Expand ${primary.name}'s children`}
          aria-expanded={expanded}
          className="absolute -bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          {expanded ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>
      )}
    </motion.div>
  )
}

export const TreeNode = memo(TreeNodeBase)
