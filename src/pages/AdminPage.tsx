import { motion } from 'framer-motion'
import { doc, writeBatch } from 'firebase/firestore'
import { Loader2, Search, Shield, ShieldOff, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isPlaceholder, type Person } from '../data/schema'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePeople } from '../hooks/usePeople'
import { db } from '../lib/firebase'
import { isAdmin } from '../lib/permissions'

function AdminRow({
  person,
  addedByName,
  onSaved,
}: {
  person: Person
  addedByName: string | null
  onSaved: () => void
}) {
  const [email, setEmail] = useState(person.isPlaceholderEmail ? '' : (person.email ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLink() {
    if (!db) return
    setError(null)
    setSaving(true)
    try {
      const trimmed = email.trim().toLowerCase()
      const batch = writeBatch(db)
      batch.update(doc(db, 'people', person.nahar_id), {
        email: trimmed || null,
        // Linking a real email — even to a person who previously had a
        // no-email.* placeholder — means it's no longer a placeholder.
        isPlaceholderEmail: false,
      })

      const previousEmail = person.email?.toLowerCase()
      if (previousEmail && previousEmail !== trimmed) {
        batch.delete(doc(db, 'people_by_email', previousEmail))
      }
      if (trimmed) {
        batch.set(doc(db, 'people_by_email', trimmed), { nahar_id: person.nahar_id })
      }

      await batch.commit()
      onSaved()
    } catch (err) {
      console.error('Failed to link email:', err)
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAdmin() {
    if (!db) return
    setSaving(true)
    try {
      await writeBatch(db)
        .update(doc(db, 'people', person.nahar_id), { role: person.role === 'admin' ? 'member' : 'admin' })
        .commit()
      onSaved()
    } catch (err) {
      console.error('Failed to change role:', err)
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 items-center gap-3 border-b border-[var(--glass-border)] py-4 last:border-0 sm:grid-cols-[1fr_2fr_auto_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={`text-sm font-semibold ${isPlaceholder(person) ? 'text-[var(--color-muted-foreground)] italic' : 'text-[var(--color-foreground)]'}`}
          >
            {person.name}
          </p>
          {person.isPlaceholderEmail && (
            <span
              title="This person has no real email yet — added via self-service without one."
              className="flex items-center gap-1 rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]"
            >
              <Sparkles size={10} aria-hidden="true" />
              No email yet
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">{person.nahar_id}</p>
        {addedByName && (
          <p className="text-xs text-[var(--color-muted-foreground)]">Added by {addedByName}</p>
        )}
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={person.isPlaceholderEmail ? 'Add their real email…' : 'Not linked'}
        disabled={isPlaceholder(person)}
        className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
      />

      <button
        type="button"
        onClick={handleLink}
        disabled={saving || isPlaceholder(person) || email.trim().toLowerCase() === (person.email ?? '')}
        className="cursor-pointer rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? <Loader2 size={13} className="inline animate-spin" aria-hidden="true" /> : 'Save Email'}
      </button>

      <button
        type="button"
        onClick={toggleAdmin}
        disabled={saving || isPlaceholder(person) || !person.email}
        title={!person.email ? 'Link an email before granting admin' : undefined}
        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          person.role === 'admin'
            ? 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/20'
            : 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:brightness-110'
        }`}
      >
        {person.role === 'admin' ? (
          <>
            <ShieldOff size={13} aria-hidden="true" />
            Revoke Admin
          </>
        ) : (
          <>
            <Shield size={13} aria-hidden="true" />
            Make Admin
          </>
        )}
      </button>

      {error && <p className="text-xs text-[var(--color-destructive)] sm:col-span-4">{error}</p>}
    </div>
  )
}

/** Firestore Timestamps land as {seconds, nanoseconds}-shaped objects with a toMillis(); seed/admin-created records have null. */
function addedAtMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return 0
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { people, loading: peopleLoading, refetch } = usePeople()
  const [query, setQuery] = useState('')
  const [recentOnly, setRecentOnly] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 200)

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    let result = people
    if (q) {
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
    }
    if (recentOnly) {
      result = result
        .filter((p) => p.addedBy != null)
        .slice()
        .sort((a, b) => addedAtMillis(b.addedAt) - addedAtMillis(a.addedAt))
    }
    return result
  }, [people, debouncedQuery, recentOnly])

  const recentCount = useMemo(() => people.filter((p) => p.addedBy != null).length, [people])
  const nameById = useMemo(() => new Map(people.map((p) => [p.nahar_id, p.name])), [people])

  if (!authLoading && !isAdmin(user)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="font-[var(--font-heading)] text-3xl font-bold text-[var(--color-foreground)]">
          Admin
        </h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          Link a family member&rsquo;s Google account by email, or promote/revoke admins.
        </p>
      </motion.div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="glass w-full rounded-full py-2.5 pr-4 pl-10 text-sm text-[var(--color-foreground)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setRecentOnly((v) => !v)}
          className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
            recentOnly
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
              : 'glass text-[var(--color-foreground)] hover:bg-[var(--glass-bg-strong)]'
          }`}
        >
          <Sparkles size={14} aria-hidden="true" />
          Recently added ({recentCount})
        </button>
      </div>

      <div className="glass-strong rounded-3xl px-6 py-2">
        {authLoading || peopleLoading ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">No matches.</p>
        ) : (
          filtered.map((person) => (
            <AdminRow
              key={person.nahar_id}
              person={person}
              addedByName={person.addedBy ? (nameById.get(person.addedBy) ?? person.addedBy) : null}
              onSaved={refetch}
            />
          ))
        )}
      </div>
    </div>
  )
}
