import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Shield, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GoogleGlyph } from '../ui/GoogleGlyph'

export function UserMenu() {
  const { user, loading, signIn, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--color-muted)]" aria-hidden="true" />
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className="glass flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--glass-bg-strong)]"
      >
        <GoogleGlyph />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    )
  }

  const initial = (user.name ?? user.email).charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-accent-foreground)] transition-transform hover:scale-105"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="glass-strong absolute top-full right-0 mt-2 w-56 rounded-2xl p-2"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                {user.name ?? user.email}
              </p>
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-[var(--glass-border)]" />
            {user.naharId && (
              <Link
                to={`/person/${user.naharId}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              >
                <UserIcon size={15} aria-hidden="true" />
                My Profile
              </Link>
            )}
            {user.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              >
                <Shield size={15} aria-hidden="true" />
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--color-destructive)] hover:bg-[var(--color-muted)]"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
