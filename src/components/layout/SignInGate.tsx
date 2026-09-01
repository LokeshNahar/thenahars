import { motion } from 'framer-motion'
import { Lock, UserSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GoogleGlyph } from '../ui/GoogleGlyph'

interface SignInGateProps {
  title: string
  description: string
}

/**
 * Shown in place of tree/detail content for a visitor with no resolved
 * naharId — either never signed in, or signed in but not yet linked to a
 * family member. Both states get the identical gated experience, per the
 * family's privacy preference: full details are for recognized members only.
 */
export function SignInGate({ title, description }: SignInGateProps) {
  const { user, signIn } = useAuth()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-strong mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl p-10 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        <Lock size={24} aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[var(--color-foreground)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      {!user ? (
        <button
          type="button"
          onClick={signIn}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition-[filter] hover:brightness-110"
        >
          <GoogleGlyph />
          Sign in with Google
        </button>
      ) : (
        !user.naharId && (
          <Link
            to="/claim"
            className="flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition-[filter] hover:brightness-110"
          >
            <UserSearch size={16} aria-hidden="true" />
            Claim Your Profile
          </Link>
        )
      )}
    </motion.div>
  )
}
