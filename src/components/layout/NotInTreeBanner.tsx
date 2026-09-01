import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const DISMISS_KEY = 'thenahars-not-in-tree-dismissed'

export function NotInTreeBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true')
  }, [])

  const show = !!user && !user.naharId && !dismissed

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden px-3 pt-3 sm:px-6"
        >
          <div className="glass mx-auto flex max-w-6xl items-center gap-3 rounded-2xl px-4 py-3 text-sm">
            <Sparkles size={16} className="shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <p className="flex-1 text-[var(--color-foreground)]">
              You&rsquo;re signed in as <span className="font-semibold">{user?.name ?? user?.email}</span>,
              but not yet linked to a family member.
            </p>
            <Link
              to="/claim"
              className="shrink-0 rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--color-accent-foreground)] transition-[filter] hover:brightness-110"
            >
              Claim Your Profile
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
