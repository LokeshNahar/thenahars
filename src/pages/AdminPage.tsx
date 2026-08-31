import { motion } from 'framer-motion'
import { doc, writeBatch } from 'firebase/firestore'
import { Loader2, Search, Shield, ShieldOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isPlaceholder, type Person } from '../data/schema'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePeople } from '../hooks/usePeople'
import { db } from '../lib/firebase'
import { isAdmin } from '../lib/permissions'

function AdminRow({ person, onSaved }: { person: Person; onSaved: () => void }) {
  const [email, setEmail] = useState(person.email ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLink() {
    if (!db) return
    setError(null)
    setSaving(true)
    try {
      const trimmed = email.trim().toLowerCase()
      const batch = writeBatch(db)
      batch.update(doc(db, 'people', person.nahar_id), { email: trimmed || null })

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
        <p
          className={`text-sm font-semibold ${isPlaceholder(person) ? 'text-[var(--color-muted-foreground)] italic' : 'text-[var(--color-foreground)]'}`}
        >
          {person.name}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{person.nahar_id}</p>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Not linked"
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

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { people, loading: peopleLoading, refetch } = usePeople()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
  }, [people, debouncedQuery])

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

      <div className="relative mb-6">
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

      <div className="glass-strong rounded-3xl px-6 py-2">
        {authLoading || peopleLoading ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">No matches.</p>
        ) : (
          filtered.map((person) => <AdminRow key={person.nahar_id} person={person} onSaved={refetch} />)
        )}
      </div>
    </div>
  )
}
