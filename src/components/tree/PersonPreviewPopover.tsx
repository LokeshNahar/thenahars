import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, MapPin } from 'lucide-react'
import { isPlaceholder, type Person } from '../../data/schema'
import { PersonAvatar } from '../person/PersonAvatar'
import { StatusBadge } from '../person/StatusBadge'

export function PersonPreviewPopover({ person, visible }: { person: Person; visible: boolean }) {
  if (isPlaceholder(person)) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="glass-strong pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 w-56 -translate-x-1/2 rounded-2xl p-4 text-left"
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
    </AnimatePresence>
  )
}
