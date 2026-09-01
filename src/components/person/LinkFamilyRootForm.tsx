import { motion } from 'framer-motion'
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { Loader2, Mail, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { Gender, Person } from '../../data/schema'
import { db } from '../../lib/firebase'
import { MagneticButton } from '../ui/MagneticButton'

interface LinkFamilyRootFormProps {
  /** The existing person this new external family connects through. */
  anchor: Person
  onCancel: () => void
  onSaved: (newRootId: string) => void
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

function defaultLabel(anchorName: string): string {
  return `${anchorName.split(' ')[0]}'s Family`
}

export function LinkFamilyRootForm({ anchor, onCancel, onSaved }: LinkFamilyRootFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [usingPlaceholder, setUsingPlaceholder] = useState(false)
  const [gender, setGender] = useState<Gender>('male')
  const [label, setLabel] = useState(() => defaultLabel(anchor.name))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNoEmailYet() {
    setUsingPlaceholder(true)
    setEmail('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedLabel = label.trim()
    if (!trimmedName) {
      setError('Name can’t be empty.')
      return
    }
    if (!trimmedLabel) {
      setError('Give this branch a short label, like “Mother’s Family.”')
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

    setSaving(true)
    try {
      const finalEmail = usingPlaceholder ? null : email.trim().toLowerCase()

      const newId = await runTransaction(naharDb, async (tx) => {
        const counterRef = doc(naharDb, 'meta', 'id_counter')
        const counterSnap = await tx.get(counterRef)
        const nextSeq = counterSnap.data()!.nextSeq as number
        const id = `N-${String(nextSeq).padStart(4, '0')}`

        tx.update(counterRef, { nextSeq: nextSeq + 1 })
        tx.set(doc(naharDb, 'people', id), {
          nahar_id: id,
          name: trimmedName,
          gender,
          generation: 1,
          parents: [],
          spouse: [],
          children: [],
          addedBy: user.naharId,
          addedAt: serverTimestamp(),
          isPlaceholderEmail: usingPlaceholder,
          isBloodline: false,
          linkedFamilyOf: anchor.nahar_id,
          linkedFamilyLabel: trimmedLabel,
          status: 'living',
          claimed: false,
          role: 'member',
        })
        return id
      })

      // Separate commit, after the person doc above resolves — see
      // firestore.rules' file header and PHASE2-ADD-PERSON-PLAN.md for why
      // this can't be the same commit as the create above.
      const resolvedEmail = finalEmail ?? placeholderEmail(newId)
      await setDoc(doc(naharDb, 'people', newId, 'private', 'details'), {
        phone: null,
        dateOfBirth: null,
        marriageDate: null,
        email: resolvedEmail,
        profession: null,
        qualification: null,
        location: null,
        photo: null,
        instagram: null,
        facebook: null,
        linkedin: null,
        notes: null,
      })
      await setDoc(doc(naharDb, 'people_by_email', resolvedEmail), { nahar_id: newId })

      onSaved(newId)
    } catch (err) {
      console.error('Failed to link family:', err)
      setError('Couldn’t save — you may not have permission to do this.')
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
        {name.trim() ? initialsOf(name) : <Users size={28} aria-hidden="true" />}
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--color-foreground)]">
          Link Another Family
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-[var(--color-muted-foreground)]">
          Start a separate branch connected through {anchor.name.split(' ')[0]} — it stays tucked away until
          someone opens it.
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
            Branch Label
          </label>
          <input
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Mother's Family"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            This Person&rsquo;s Name
          </label>
          <input
            autoFocus
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mother's father's name"
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
            <Users size={15} aria-hidden="true" />
          )}
          {saving ? 'Linking…' : 'Link Family'}
        </MagneticButton>
      </div>
    </motion.form>
  )
}
