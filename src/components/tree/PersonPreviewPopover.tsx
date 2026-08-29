import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, MapPin } from 'lucide-react'
import { createPortal } from 'react-dom'
import { isPlaceholder, type Person } from '../../data/schema'
import { PersonAvatar } from '../person/PersonAvatar'
import { StatusBadge } from '../person/StatusBadge'

interface PersonPreviewPopoverProps {
  person: Person
  visible: boolean
  /** Screen-space anchor (from getBoundingClientRect) — required so the popover
   * renders at a fixed, un-scaled size regardless of the tree canvas's zoom level. */
  anchorRect: { top: number; left: number; width: number } | null
}

/**
 * Rendered via a portal into document.body rather than inline in the tree.
 * The tree canvas is inside a pan/zoom transform (react-zoom-pan-pinch), and
 * anything rendered as a normal descendant gets scaled along with it — at
 * high zoom a fixed-width popover would balloon to several times its
 * intended size. Portaling out and positioning with `position: fixed` from
 * the anchor's real screen rect keeps it crisp and correctly sized always.
 */
export function PersonPreviewPopover({ person, visible, anchorRect }: PersonPreviewPopoverProps) {
  if (isPlaceholder(person) || !anchorRect) return null

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="glass-strong pointer-events-none fixed z-50 w-56 rounded-2xl p-4 text-left"
          style={{
            top: anchorRect.top - 12,
            left: anchorRect.left + anchorRect.width / 2,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <PersonAvatar person={person} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-[var(--font-heading)] text-sm font-semibold text-[var(--color-foreground)]">
                {person.name}
              </p>
              <StatusBadge status={person.status} />
            </div>
          </div>
          {(person.profession || person.location) && (
            <div className="mt-3 flex flex-col gap-1 border-t border-[var(--glass-border)] pt-2.5">
              {person.profession && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Briefcase size={12} aria-hidden="true" />
                  {person.profession}
                </p>
              )}
              {person.location && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <MapPin size={12} aria-hidden="true" />
                  {person.location}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
