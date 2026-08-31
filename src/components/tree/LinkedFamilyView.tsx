import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Person } from '../../data/schema'
import { FamilyTreeCanvas } from './FamilyTreeCanvas'

interface LinkedFamilyViewProps {
  /** The linked-family root (linkedFamilyOf set) whose branch is being revealed. */
  root: Person
  /** The main-tree person this branch connects through. */
  anchor: Person
  people: Person[]
  onClose: () => void
}

/**
 * Full-screen takeover: the rest of the tree folds away entirely so the
 * linked branch (e.g. a mother's own birth family) reads as its own space,
 * not a cluttered corner of the main tree. A cooler accent tint (via a
 * scoped CSS var override) keeps it visually distinct from the Nahar tree
 * while reusing every bit of FamilyTreeCanvas's interaction and styling.
 */
export function LinkedFamilyView({ root, anchor, people, onClose }: LinkedFamilyViewProps) {
  const navigate = useNavigate()

  function handleBack() {
    onClose()
    navigate(`/person/${anchor.nahar_id}`)
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="linked-family-takeover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[100] flex flex-col bg-[var(--color-background)]"
        style={{ ['--color-accent' as string]: 'var(--color-linked-accent)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="glass-strong m-4 mb-0 flex flex-col items-start justify-between gap-3 rounded-3xl px-6 py-5 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--color-accent)] uppercase">
              Linked Branch
            </p>
            <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--color-foreground)]">
              {root.linkedFamilyLabel ?? `${anchor.name.split(' ')[0]}'s Family`}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Connected through {anchor.name}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[var(--glass-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to {anchor.name.split(' ')[0]} in the Nahar tree
          </button>
        </motion.div>

        <div className="flex-1 p-4">
          <FamilyTreeCanvas people={people} rootIdOverride={root.nahar_id} />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
