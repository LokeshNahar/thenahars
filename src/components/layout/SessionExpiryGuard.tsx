import { AnimatePresence, motion } from 'framer-motion'
import { Clock, LogIn, ShieldAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useIdleSessionTimer } from '../../hooks/useIdleSessionTimer'

/**
 * 5-minute idle-timeout session control (PHONE-OTP-FUTURE-PHASE.md standing
 * requirement, modeled on the Income Tax e-filing portal): warns at 4
 * minutes idle with a countdown + "Extend Session" action, signs out and
 * shows a clear expired screen at 5 if nobody responds. Mounted once near
 * the app root — a portal takeover, so it sits above the navbar and every
 * page regardless of where in the tree it's rendered.
 *
 * Inert while signed out (useIdleSessionTimer(enabled=false) is a no-op),
 * so this renders nothing for an anonymous visitor.
 */
export function SessionExpiryGuard() {
  const { user, signOut, signIn } = useAuth()
  const { status, secondsRemaining, extend, acknowledgeExpiry } = useIdleSessionTimer(!!user)
  const hasSignedOutForExpiry = useRef(false)

  useEffect(() => {
    if (status === 'expired' && !hasSignedOutForExpiry.current) {
      hasSignedOutForExpiry.current = true
      signOut()
    }
    if (status !== 'expired') {
      hasSignedOutForExpiry.current = false
    }
  }, [status, signOut])

  // status === 'expired' is sticky by design (see useIdleSessionTimer) so
  // it survives `user` becoming null the moment signOut() above resolves —
  // otherwise this screen would flash and vanish instead of staying up
  // until the person notices and re-signs-in. A manual sign-out (from
  // UserMenu) never sets status to 'expired' in the first place, so it
  // correctly shows nothing once user is null.
  if (status === 'expired') {
    return renderExpiredScreen(() => {
      acknowledgeExpiry()
      signIn()
    })
  }

  if (!user || status === 'active') return null

  if (status === 'warning') {
    return createPortal(
      <AnimatePresence>
        <motion.div
          key="session-warning"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-warning-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-strong flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
              <Clock size={22} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="session-warning-title"
                className="font-[var(--font-heading)] text-lg font-semibold text-[var(--color-foreground)]"
              >
                Your session is about to expire
              </h2>
              <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
                For your privacy, you&rsquo;ll be signed out in{' '}
                <span className="font-semibold text-[var(--color-foreground)] tabular-nums">
                  {secondsRemaining}s
                </span>{' '}
                due to inactivity.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  signOut()
                }}
                className="flex-1 cursor-pointer rounded-full border border-[var(--glass-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                Sign Out Now
              </button>
              <button
                type="button"
                onClick={extend}
                autoFocus
                className="flex-1 cursor-pointer rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition-[filter] hover:brightness-110"
              >
                Extend Session
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body,
    )
  }

  return null
}

function renderExpiredScreen(onSignInAgain: () => void) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        key="session-expired"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--color-background)] p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="glass-strong flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <ShieldAlert size={22} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="session-expired-title"
              className="font-[var(--font-heading)] text-lg font-semibold text-[var(--color-foreground)]"
            >
              Session expired
            </h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
              You were signed out after 5 minutes of inactivity, to help keep family data private
              on shared or unattended devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignInAgain}
            className="flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition-[filter] hover:brightness-110"
          >
            <LogIn size={15} aria-hidden="true" />
            Sign In Again
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
