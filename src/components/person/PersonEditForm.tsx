import { motion } from 'framer-motion'
import { doc, writeBatch } from 'firebase/firestore'
import { Loader2, Save, X } from 'lucide-react'
import { useState } from 'react'
import type { LifeStatus, Person } from '../../data/schema'
import { db } from '../../lib/firebase'
import { validatePhotoUrl } from '../../lib/photoUrl'
import { OCCUPATIONS, QUALIFICATIONS } from '../../lib/qualifications'
import { DatePickerField } from '../ui/DatePickerField'
import { SelectWithOther } from '../ui/SelectWithOther'

interface PersonEditFormProps {
  person: Person
  /** This person's recorded spouse(s), if any — marriageDate is only editable when at least one is present. */
  spouses: Person[]
  onCancel: () => void
  onSaved: () => void
}

interface FormState {
  name: string
  phone: string
  dateOfBirth: string
  marriageDate: string
  email: string
  profession: string
  qualification: string
  location: string
  photo: string
  instagram: string
  facebook: string
  linkedin: string
  status: LifeStatus
  notes: string
}

function toFormState(person: Person): FormState {
  return {
    name: person.name,
    phone: person.phone ?? '',
    dateOfBirth: person.dateOfBirth ?? '',
    marriageDate: person.marriageDate ?? '',
    email: person.email ?? '',
    profession: person.profession ?? '',
    qualification: person.qualification ?? '',
    location: person.location ?? '',
    photo: person.photo ?? '',
    instagram: person.instagram ?? '',
    facebook: person.facebook ?? '',
    linkedin: person.linkedin ?? '',
    status: person.status,
    notes: person.notes ?? '',
  }
}

/** Strips a leading @, and any full-URL prefix, down to a bare handle. */
function sanitizeHandle(value: string): string {
  const trimmed = value.trim()
  const afterSlash = trimmed.includes('/') ? trimmed.split('/').filter(Boolean).pop()! : trimmed
  return afterSlash.replace(/^@/, '')
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]'
const labelClass =
  'mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase'

export function PersonEditForm({ person, spouses, onCancel, onSaved }: PersonEditFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(person))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedEmail = form.email.trim()
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      setError('That email address doesn’t look right.')
      return
    }
    if (!form.name.trim()) {
      setError('Name can’t be empty.')
      return
    }
    const photoError = validatePhotoUrl(form.photo)
    if (photoError) {
      setError(photoError)
      return
    }
    if (!db) {
      setError('Not connected to a database right now.')
      return
    }

    setSaving(true)
    try {
      const batch = writeBatch(db)
      const personRef = doc(db, 'people', person.nahar_id)
      const privateRef = doc(db, 'people', person.nahar_id, 'private', 'details')

      const marriageDate = spouses.length > 0 ? form.marriageDate || null : person.marriageDate

      // name/status are the only fields still on the public doc — see
      // firestore.rules' file header for why the rest moved to
      // private/details (phone/email/DOB/location/etc. are never public).
      batch.update(personRef, {
        name: form.name.trim(),
        status: form.status,
      })

      batch.update(privateRef, {
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        marriageDate,
        email: trimmedEmail ? trimmedEmail.toLowerCase() : null,
        profession: form.profession.trim() || null,
        qualification: form.qualification.trim() || null,
        location: form.location.trim() || null,
        photo: form.photo.trim() || null,
        instagram: sanitizeHandle(form.instagram) || null,
        facebook: sanitizeHandle(form.facebook) || null,
        linkedin: sanitizeHandle(form.linkedin) || null,
        notes: form.notes.trim() || null,
      })

      // A marriage date is a fact about the COUPLE, not just this person —
      // keep it in sync on every recorded spouse's own private/details
      // doc too, since spouse[] is a symmetric array rather than a shared
      // marriage doc.
      if (spouses.length > 0 && marriageDate !== (spouses[0].marriageDate ?? null)) {
        for (const spouse of spouses) {
          batch.update(doc(db, 'people', spouse.nahar_id, 'private', 'details'), { marriageDate })
        }
      }

      const previousEmail = person.email?.toLowerCase()
      const newEmail = trimmedEmail ? trimmedEmail.toLowerCase() : null
      if (previousEmail !== newEmail) {
        if (previousEmail) batch.delete(doc(db, 'people_by_email', previousEmail))
        if (newEmail) batch.set(doc(db, 'people_by_email', newEmail), { nahar_id: person.nahar_id })
      }

      await batch.commit()
      onSaved()
    } catch (err) {
      console.error('Failed to save changes:', err)
      setError('Couldn’t save your changes. You may not have permission to edit this field.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onSubmit={handleSubmit}
      className="glass-strong flex flex-col gap-5 rounded-3xl p-8 sm:p-10"
    >
      <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[var(--color-foreground)]">
        Edit {person.name.split(' ')[0]}&rsquo;s details
      </h2>

      {error && (
        <p className="rounded-xl bg-[var(--color-destructive)]/10 px-3.5 py-2.5 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            className={inputClass}
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="Not set"
          />
        </div>

        <div>
          <span className={labelClass}>Date of Birth</span>
          <DatePickerField
            value={form.dateOfBirth}
            onChange={(v) => update('dateOfBirth', v)}
            label="Date of birth"
          />
        </div>

        {spouses.length > 0 && (
          <div>
            <span className={labelClass}>Anniversary</span>
            <DatePickerField
              value={form.marriageDate}
              onChange={(v) => update('marriageDate', v)}
              label="Anniversary"
            />
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="Not set"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="profession">
            Occupation
          </label>
          <SelectWithOther
            id="profession"
            value={form.profession}
            onChange={(v) => update('profession', v)}
            options={OCCUPATIONS}
            selectClassName={inputClass}
            inputClassName={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="qualification">
            Highest Qualification
          </label>
          <SelectWithOther
            id="qualification"
            value={form.qualification}
            onChange={(v) => update('qualification', v)}
            options={QUALIFICATIONS}
            selectClassName={inputClass}
            inputClassName={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            className={inputClass}
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="City, region"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="photo">
            Photo URL
          </label>
          <input
            id="photo"
            type="url"
            className={inputClass}
            value={form.photo}
            onChange={(e) => update('photo', e.target.value)}
            placeholder="https://…"
          />
          <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
            Direct image links from Google, Imgur, or GitHub only — other hosts aren’t accepted.
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Social
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="instagram">
            Instagram
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[var(--color-muted-foreground)]">
              @
            </span>
            <input
              id="instagram"
              className={`${inputClass} pl-7`}
              value={form.instagram}
              onChange={(e) => update('instagram', e.target.value)}
              placeholder="username"
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="facebook">
            Facebook
          </label>
          <input
            id="facebook"
            className={inputClass}
            value={form.facebook}
            onChange={(e) => update('facebook', e.target.value)}
            placeholder="username"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="linkedin">
            LinkedIn
          </label>
          <input
            id="linkedin"
            className={inputClass}
            value={form.linkedin}
            onChange={(e) => update('linkedin', e.target.value)}
            placeholder="profile-slug"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={inputClass}
            value={form.status}
            onChange={(e) => update('status', e.target.value as LifeStatus)}
          >
            <option value="living">Living</option>
            <option value="late">In loving memory</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className={`${inputClass} min-h-20 resize-y`}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={15} aria-hidden="true" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </motion.form>
  )
}
