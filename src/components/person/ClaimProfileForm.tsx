import { motion } from 'framer-motion'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { CheckCircle2, Loader2, Send, UserSearch } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePeople } from '../../hooks/usePeople'
import { findClaimCandidates } from '../../lib/claimMatching'
import { db } from '../../lib/firebase'

const inputClass =
  'w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]'
const labelClass =
  'mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase'

/**
 * Self-service "who am I" form for a signed-in-but-unmatched visitor. Finds
 * candidate Person matches client-side (loose substring on name + both
 * parent names) purely as a convenience signal saved alongside the
 * request — an admin always makes the final call in AdminPage before any
 * email actually gets linked, so a wrong/missing match here is never a
 * security concern, only a lookup shortcut.
 */
export function ClaimProfileForm() {
  const { user } = useAuth()
  const { people } = usePeople()
  const [name, setName] = useState(user?.name ?? '')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyPending, setAlreadyPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedFather = fatherName.trim()
    const trimmedMother = motherName.trim()
    if (!trimmedName || !trimmedFather || !trimmedMother) {
      setError('Fill in your name and both parents’ names.')
      return
    }
    if (!db || !user?.email) {
      setError('Not connected — try signing in again.')
      return
    }

    setSaving(true)
    try {
      const claimRef = doc(db, 'pending_claims', user.email.toLowerCase())
      const existing = await getDoc(claimRef)
      if (existing.exists()) {
        setAlreadyPending(true)
        return
      }

      const candidates = findClaimCandidates(people, trimmedName, trimmedFather, trimmedMother)
      const matchedNaharId = candidates.length === 1 ? candidates[0].nahar_id : null

      await setDoc(claimRef, {
        email: user.email.toLowerCase(),
        submittedName: trimmedName,
        fatherName: trimmedFather,
        motherName: trimmedMother,
        matchedNaharId,
        status: 'pending',
        submittedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
      })
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit claim:', err)
      setError('Couldn’t submit your request. Please try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong flex flex-col items-center gap-3 rounded-3xl p-8 text-center"
      >
        <CheckCircle2 size={32} className="text-[var(--color-accent)]" aria-hidden="true" />
        <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[var(--color-foreground)]">
          Request sent
        </h2>
        <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
          An admin will review your details and link your account soon. You can keep browsing the directory in
          the meantime.
        </p>
      </motion.div>
    )
  }

  if (alreadyPending) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong flex flex-col items-center gap-3 rounded-3xl p-8 text-center"
      >
        <UserSearch size={32} className="text-[var(--color-accent)]" aria-hidden="true" />
        <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[var(--color-foreground)]">
          Already submitted
        </h2>
        <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
          You already have a request waiting on an admin. If it was rejected and you need to try again with
          corrected details, ask an admin to clear it first.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="glass-strong flex flex-col gap-5 rounded-3xl p-8 sm:p-10"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <UserSearch size={28} className="text-[var(--color-accent)]" aria-hidden="true" />
        <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[var(--color-foreground)]">
          Find your place in the tree
        </h2>
        <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
          Tell us your name and your parents&rsquo; names — an admin will match you to your record and link
          your account.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-[var(--color-destructive)]/10 px-3.5 py-2.5 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="claim-name">
            Your Full Name
          </label>
          <input
            id="claim-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="claim-father">
            Father&rsquo;s Name
          </label>
          <input
            id="claim-father"
            className={inputClass}
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="claim-mother">
            Mother&rsquo;s Name
          </label>
          <input
            id="claim-mother"
            className={inputClass}
            value={motherName}
            onChange={(e) => setMotherName(e.target.value)}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex cursor-pointer items-center justify-center gap-2 self-center rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <Send size={15} aria-hidden="true" />
        )}
        {saving ? 'Submitting…' : 'Submit for Review'}
      </button>
    </motion.form>
  )
}
