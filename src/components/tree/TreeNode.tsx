import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { memo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isPlaceholder, type Person } from '../../data/schema'
import { PersonAvatar } from '../person/PersonAvatar'
import { StatusBadge } from '../person/StatusBadge'
import { LinkedFamilyToggle } from './LinkedFamilyToggle'
import { PersonPreviewPopover } from './PersonPreviewPopover'

interface TreeNodeProps {
  primary: Person
  spouses: Person[]
  hasChildren: boolean
  expanded: boolean
  onToggle: () => void
  x: number
  y: number
  /** True for the person the tree auto-zoomed to (e.g. the signed-in viewer). */
  focused?: boolean
  /** nahar_id -> linkedFamilyLabel, for anyone in this unit who has a linked branch. */
  linkedFamilyByPersonId?: Map<string, string>
  onOpenLinkedFamily?: (personId: string) => void
}

interface AnchorRect {
  top: number
  left: number
  width: number
}

function MiniCard({
  person,
  focused = false,
  linkedFamilyLabel,
  onOpenLinkedFamily,
}: {
  person: Person
  focused?: boolean
  linkedFamilyLabel?: string
  onOpenLinkedFamily?: () => void
}) {
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
      data-focused={focused || undefined}
      className={`flex w-28 flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center transition-[box-shadow,transform] duration-200 ${
        placeholder
          ? 'border border-dashed border-[var(--color-border)]'
          : focused
            ? 'border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 backdrop-blur-[var(--glass-blur)] hover:scale-[1.04]'
            : 'glass hover:scale-[1.04] hover:shadow-[var(--shadow-glow)]'
      } ${focused ? 'focus-ring-pulse' : ''}`}
    >
      {focused && (
        <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[var(--color-accent-foreground)] uppercase">
          You
        </span>
      )}
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
      {linkedFamilyLabel && onOpenLinkedFamily && (
        <LinkedFamilyToggle compact label={linkedFamilyLabel} onClick={onOpenLinkedFamily} />
      )}
    </div>
  )
}

function TreeNodeBase({
  primary,
  spouses,
  hasChildren,
  expanded,
  onToggle,
  x,
  y,
  focused = false,
  linkedFamilyByPersonId,
  onOpenLinkedFamily,
}: TreeNodeProps) {
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
        <MiniCard
          person={primary}
          focused={focused}
          linkedFamilyLabel={linkedFamilyByPersonId?.get(primary.nahar_id)}
          onOpenLinkedFamily={onOpenLinkedFamily ? () => onOpenLinkedFamily(primary.nahar_id) : undefined}
        />
        {spouses.map((s) => (
          <div key={s.nahar_id} className="flex items-center gap-2">
            {isCouple && (
              <span aria-hidden="true" className="h-px w-3 shrink-0 bg-[var(--color-accent)] opacity-50" />
            )}
            <MiniCard
              person={s}
              linkedFamilyLabel={linkedFamilyByPersonId?.get(s.nahar_id)}
              onOpenLinkedFamily={onOpenLinkedFamily ? () => onOpenLinkedFamily(s.nahar_id) : undefined}
            />
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
