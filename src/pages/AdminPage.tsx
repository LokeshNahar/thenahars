import { motion } from 'framer-motion'
import { arrayRemove, collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import {
  AlertTriangle,
  Check,
  Loader2,
  Search,
  Shield,
  ShieldOff,
  Sparkles,
  Trash2,
  UserSearch,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isPlaceholder, type PendingClaim, type Person } from '../data/schema'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePeople } from '../hooks/usePeople'
import { findClaimCandidates } from '../lib/claimMatching'
import { db } from '../lib/firebase'
import { isAdmin } from '../lib/permissions'

function AdminRow({
  person,
  addedByName,
  allPeople,
  onSaved,
}: {
  person: Person
  addedByName: string | null
  allPeople: Person[]
  onSaved: () => void
}) {
  const [email, setEmail] = useState(person.isPlaceholderEmail ? '' : (person.email ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const hasChildren = person.children.length > 0
  const linkedFamilyChildCount = allPeople.filter((p) => p.linkedFamilyOf === person.nahar_id).length

  async function handleDelete() {
    if (!db) return
    setError(null)
    setSaving(true)
    try {
      const batch = writeBatch(db)

      // Remove this person from any relative's relationship arrays — a
      // deletion must never leave a dangling reference to an id that no
      // longer resolves to a document.
      for (const relativeId of [...person.parents, ...person.spouse]) {
        const relative = allPeople.find((p) => p.nahar_id === relativeId)
        if (!relative) continue
        const update: Record<string, unknown> = {}
        if (relative.spouse.includes(person.nahar_id)) update.spouse = arrayRemove(person.nahar_id)
        if (relative.children.includes(person.nahar_id)) update.children = arrayRemove(person.nahar_id)
        if (Object.keys(update).length > 0) {
          batch.update(doc(db, 'people', relativeId), update)
        }
      }

      if (person.email) {
        batch.delete(doc(db, 'people_by_email', person.email.toLowerCase()))
      }

      batch.delete(doc(db, 'people', person.nahar_id))
      await batch.commit()
      onSaved()
    } catch (err) {
      console.error('Failed to delete person:', err)
      setError('Delete failed.')
      setSaving(false)
    }
  }

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
    <div className="grid grid-cols-1 items-center gap-3 border-b border-[var(--glass-border)] py-4 last:border-0 sm:grid-cols-[1fr_2fr_auto_auto_auto]">
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

      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        disabled={saving || hasChildren || linkedFamilyChildCount > 0}
        title={
          hasChildren
            ? 'Remove or reassign their children before deleting'
            : linkedFamilyChildCount > 0
              ? 'Their linked-family branch still has people in it'
              : 'Remove this person from the family tree'
        }
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--color-destructive)]/30 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--color-destructive)] transition-colors hover:bg-[var(--color-destructive)]/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={13} aria-hidden="true" />
        Delete
      </button>

      {confirmingDelete && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-4 sm:col-span-5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-[var(--color-destructive)]"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--color-foreground)]">
              Permanently delete <strong>{person.name}</strong> ({person.nahar_id})? This removes them from
              any parent&rsquo;s/spouse&rsquo;s records too. This can&rsquo;t be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={saving}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <X size={12} aria-hidden="true" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-destructive)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 size={12} aria-hidden="true" />
              )}
              {saving ? 'Deleting…' : 'Yes, delete permanently'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--color-destructive)] sm:col-span-5">{error}</p>}
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

/** Admin-only, so fetched directly here rather than through the shared dataSource (which anonymous visitors also read). */
function usePendingClaims(): { claims: PendingClaim[]; loading: boolean; refetch: () => void } {
  const [claims, setClaims] = useState<PendingClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(0)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getDocs(collection(db, 'pending_claims'))
      .then((snap) => {
        if (!cancelled) setClaims(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingClaim))
      })
      .catch((err: unknown) => console.error('Failed to load pending claims:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const refetch = useCallback(() => setToken((t) => t + 1), [])
  return { claims, loading, refetch }
}

function ClaimRow({
  claim,
  people,
  currentAdminId,
  onReviewed,
}: {
  claim: PendingClaim
  people: Person[]
  currentAdminId: string | null
  onReviewed: () => void
}) {
  const candidates = useMemo(
    () => findClaimCandidates(people, claim.submittedName, claim.fatherName, claim.motherName),
    [people, claim.submittedName, claim.fatherName, claim.motherName],
  )
  const [selectedId, setSelectedId] = useState(claim.matchedNaharId ?? candidates[0]?.nahar_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPerson = people.find((p) => p.nahar_id === selectedId) ?? null

  async function handleApprove() {
    if (!db || !selectedPerson) return
    setError(null)
    setSaving(true)
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'people', selectedPerson.nahar_id), {
        email: claim.email,
        isPlaceholderEmail: false,
        claimed: true,
      })
      const previousEmail = selectedPerson.email?.toLowerCase()
      if (previousEmail && previousEmail !== claim.email) {
        batch.delete(doc(db, 'people_by_email', previousEmail))
      }
      batch.set(doc(db, 'people_by_email', claim.email), { nahar_id: selectedPerson.nahar_id })
      batch.update(doc(db, 'pending_claims', claim.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: currentAdminId,
      })
      await batch.commit()
      onReviewed()
    } catch (err) {
      console.error('Failed to approve claim:', err)
      setError('Approval failed.')
      setSaving(false)
    }
  }

  async function handleReject() {
    if (!db) return
    setError(null)
    setSaving(true)
    try {
      await writeBatch(db)
        .update(doc(db, 'pending_claims', claim.id), {
          status: 'rejected',
          reviewedAt: serverTimestamp(),
          reviewedBy: currentAdminId,
        })
        .commit()
      onReviewed()
    } catch (err) {
      console.error('Failed to reject claim:', err)
      setError('Rejection failed.')
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!db) return
    setError(null)
    setSaving(true)
    try {
      await writeBatch(db)
        .delete(doc(db, 'pending_claims', claim.id))
        .commit()
      onReviewed()
    } catch (err) {
      console.error('Failed to clear claim:', err)
      setError('Clearing failed.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--glass-border)] py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <UserSearch size={15} className="text-[var(--color-accent)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[var(--color-foreground)]">{claim.submittedName}</p>
        <span className="text-xs text-[var(--color-muted-foreground)]">{claim.email}</span>
        {claim.status !== 'pending' && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              claim.status === 'approved'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]'
            }`}
          >
            {claim.status}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Father: <span className="font-medium text-[var(--color-foreground)]">{claim.fatherName}</span> ·
        Mother: <span className="font-medium text-[var(--color-foreground)]">{claim.motherName}</span>
      </p>

      {claim.status === 'pending' && (
        <>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
              Match to
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)]"
            >
              <option value="">— Select a person —</option>
              {candidates.map((p) => (
                <option key={p.nahar_id} value={p.nahar_id}>
                  {p.name} ({p.nahar_id}) — suggested match
                </option>
              ))}
              {people
                .filter((p) => !isPlaceholder(p) && !candidates.some((c) => c.nahar_id === p.nahar_id))
                .map((p) => (
                  <option key={p.nahar_id} value={p.nahar_id}>
                    {p.name} ({p.nahar_id})
                  </option>
                ))}
            </select>
          </div>

          {error && <p className="text-xs text-[var(--color-destructive)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={saving}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-destructive)]/30 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-destructive)] transition-colors hover:bg-[var(--color-destructive)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={12} aria-hidden="true" />
              Reject
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving || !selectedPerson}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent-foreground)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <Check size={12} aria-hidden="true" />
              )}
              {saving ? 'Approving…' : `Approve as ${selectedPerson?.name ?? '…'}`}
            </button>
          </div>
        </>
      )}

      {claim.status === 'rejected' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={12} aria-hidden="true" />
            Clear (allow resubmit)
          </button>
        </div>
      )}
    </div>
  )
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { people, loading: peopleLoading, refetch } = usePeople()
  const { claims, loading: claimsLoading, refetch: refetchClaims } = usePendingClaims()
  const [query, setQuery] = useState('')
  const [recentOnly, setRecentOnly] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 200)

  const pendingClaims = useMemo(() => claims.filter((c) => c.status === 'pending'), [claims])
  const otherClaims = useMemo(() => claims.filter((c) => c.status !== 'pending'), [claims])

  function handleClaimReviewed() {
    refetchClaims()
    refetch()
  }

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
          Link a family member&rsquo;s Google account by email, promote/revoke admins, or remove a
          mistakenly-added record.
        </p>
      </motion.div>

      {!claimsLoading && (pendingClaims.length > 0 || otherClaims.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass-strong mb-8 rounded-3xl px-6 py-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <UserSearch size={16} className="text-[var(--color-accent)]" aria-hidden="true" />
            <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--color-foreground)]">
              Profile Claims{pendingClaims.length > 0 && ` (${pendingClaims.length} pending)`}
            </h2>
          </div>
          {pendingClaims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              people={people}
              currentAdminId={user?.naharId ?? null}
              onReviewed={handleClaimReviewed}
            />
          ))}
          {otherClaims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              people={people}
              currentAdminId={user?.naharId ?? null}
              onReviewed={handleClaimReviewed}
            />
          ))}
        </motion.div>
      )}

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
              allPeople={people}
              onSaved={refetch}
            />
          ))
        )}
      </div>
    </div>
  )
}
