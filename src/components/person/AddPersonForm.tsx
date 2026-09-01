import { motion } from 'framer-motion'
import { arrayUnion, doc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { Loader2, Mail, Sparkles, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { Gender, LifeStatus, Person } from '../../data/schema'
import { db } from '../../lib/firebase'
import type { RelationKind } from '../../lib/permissions'
import { MagneticButton } from '../ui/MagneticButton'

interface AddPersonFormProps {
  /** The existing person this new relationship is anchored on. */
  anchor: Person
  /** Anchor's recorded spouse(s), needed to resolve the co-parent's own isBloodline for the child case. */
  anchorSpouses: Person[]
  relation: RelationKind
  onCancel: () => void
  onSaved: () => void
}

const RELATION_LABEL: Record<RelationKind, string> = {
  parent: 'Parent',
  spouse: 'Spouse',
  child: 'Child',
}

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function placeholderEmail(naharId: string): string {
  return `no-email.${naharId.toLowerCase()}@thenahars.placeholder`
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function AddPersonForm({ anchor, anchorSpouses, relation, onCancel, onSaved }: AddPersonFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [usingPlaceholder, setUsingPlaceholder] = useState(false)
  const [gender, setGender] = useState<Gender>('female')
  const [status, setStatus] = useState<LifeStatus>('living')
  const [includeCoParent, setIncludeCoParent] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coParentPerson = relation === 'child' ? (anchorSpouses[0] ?? null) : null
  const coParent = coParentPerson?.nahar_id ?? null

  function handleNoEmailYet() {
    setUsingPlaceholder(true)
    setEmail('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name can’t be empty.')
      return
    }
    if (!usingPlaceholder) {
      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        setError('Enter an email, or choose “No email yet.”')
        return
      }
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        setError('That email address doesn’t look right.')
        return
      }
    }
    const naharDb = db
    if (!naharDb || !user?.naharId) {
      setError('Not connected — try signing in again.')
      return
    }
    if (relation === 'parent' && !anchor.isBloodline) {
      setError(
        `${anchor.name.split(' ')[0]} married into the family — use "Link Another Family" below to add their parents.`,
      )
      return
    }

    setSaving(true)
    try {
      const finalEmail = usingPlaceholder ? null : email.trim().toLowerCase()

      const newId = await runTransaction(naharDb, async (tx) => {
        const counterRef = doc(naharDb, 'meta', 'id_counter')
        const counterSnap = await tx.get(counterRef)
        const nextSeq = counterSnap.data()!.nextSeq as number
        const id = `N-${String(nextSeq).padStart(4, '0')}`
        const resolvedEmail = finalEmail ?? placeholderEmail(id)

        const parents =
          relation === 'parent'
            ? []
            : relation === 'child'
              ? includeCoParent && coParent
                ? [anchor.nahar_id, coParent]
                : [anchor.nahar_id]
              : []
        const spouse = relation === 'spouse' ? [anchor.nahar_id] : []
        const children = relation === 'parent' ? [anchor.nahar_id] : []
        const generation =
          relation === 'parent'
            ? anchor.generation - 1
            : relation === 'child'
              ? anchor.generation + 1
              : anchor.generation
        // A new parent always extends the same blood line upward (only
        // reachable when anchor.isBloodline is already true — checked
        // above). A new spouse is always married-in, never bloodline. A
        // new child is bloodline if either parent is.
        const isBloodline =
          relation === 'parent'
            ? true
            : relation === 'spouse'
              ? false
              : anchor.isBloodline || !!coParentPerson?.isBloodline

        tx.update(counterRef, { nextSeq: nextSeq + 1 })
        tx.set(doc(naharDb, 'people', id), {
          nahar_id: id,
          name: trimmedName,
          gender,
          generation,
          parents,
          spouse,
          children,
          addedBy: user.naharId,
          addedAt: serverTimestamp(),
          isPlaceholderEmail: usingPlaceholder,
          isBloodline,
          linkedFamilyOf: null,
          linkedFamilyLabel: null,
          phone: null,
          dateOfBirth: null,
          email: resolvedEmail,
          profession: null,
          qualification: null,
          location: null,
          photo: null,
          instagram: null,
          facebook: null,
          linkedin: null,
          status,
          claimed: false,
          role: 'member',
        })
        return id
      })

      // Second, separate commit: splice the new person into the anchor's
      // relationship array. Rules require this document to already exist
      // (a same-commit create isn't visible to the update's rule check —
      // see PHASE2-ADD-PERSON-PLAN.md), so this must run after Step 1
      // resolves, not inside the same transaction.
      const anchorField = relation === 'parent' ? 'parents' : relation === 'spouse' ? 'spouse' : 'children'
      await updateDoc(doc(naharDb, 'people', anchor.nahar_id), { [anchorField]: arrayUnion(newId) })
      if (relation === 'child' && includeCoParent && coParent) {
        await updateDoc(doc(naharDb, 'people', coParent), { children: arrayUnion(newId) })
      }

      const resolvedEmail = finalEmail ?? placeholderEmail(newId)
      await setDoc(doc(naharDb, 'people_by_email', resolvedEmail), { nahar_id: newId })

      onSaved()
    } catch (err) {
      console.error('Failed to add person:', err)
      setError('Couldn’t save — you may not have permission to add this relationship.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onSubmit={handleSubmit}
      className="glass-strong flex flex-col items-center gap-6 rounded-3xl p-8 text-center sm:p-10"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-2xl font-bold text-[var(--color-accent)]">
        {name.trim() ? initialsOf(name) : <UserPlus size={28} aria-hidden="true" />}
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--color-foreground)]">
          Add {anchor.name.split(' ')[0]}&rsquo;s {RELATION_LABEL[relation]}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Just the basics for now — everything else can be added afterward.
        </p>
      </div>

      {error && (
        <p className="w-full rounded-xl bg-[var(--color-destructive)]/10 px-3.5 py-2.5 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-4 text-left">
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Name
          </label>
          <input
            autoFocus
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
              Email
            </label>
            {!usingPlaceholder && (
              <button
                type="button"
                onClick={handleNoEmailYet}
                className="cursor-pointer text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                No email yet
              </button>
            )}
          </div>
          {usingPlaceholder ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--glass-border)] px-3.5 py-2.5 text-sm text-[var(--color-muted-foreground)]">
              <Sparkles size={14} className="shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span className="flex-1">
                We&rsquo;ll add a placeholder — an admin can link a real email later.
              </span>
              <button
                type="button"
                onClick={() => setUsingPlaceholder(false)}
                className="shrink-0 cursor-pointer font-semibold text-[var(--color-accent)] hover:underline"
              >
                Undo
              </button>
            </div>
          ) : (
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                aria-hidden="true"
              />
              <input
                type="email"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] py-2.5 pr-3.5 pl-10 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="their@email.com"
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Gender
          </label>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`flex-1 cursor-pointer rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  gender === opt.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                    : 'border-[var(--glass-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {relation === 'parent' && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-foreground)]">
            <input
              type="checkbox"
              checked={status === 'late'}
              onChange={(e) => setStatus(e.target.checked ? 'late' : 'living')}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            No longer living
          </label>
        )}

        {relation === 'child' && coParent && (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-foreground)]">
            <input
              type="checkbox"
              checked={includeCoParent}
              onChange={(e) => setIncludeCoParent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
            />
            Also {anchor.name.split(' ')[0]}&rsquo;s spouse&rsquo;s child
          </label>
        )}
      </div>

      <div className="flex w-full max-w-sm justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="cursor-pointer rounded-full border border-[var(--glass-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <MagneticButton type="submit" variant="solid" disabled={saving}>
          {saving ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus size={15} aria-hidden="true" />
          )}
          {saving ? 'Adding…' : `Add ${RELATION_LABEL[relation]}`}
        </MagneticButton>
      </div>
    </motion.form>
  )
}
