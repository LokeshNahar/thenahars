import { motion } from 'framer-motion'
import { doc, writeBatch } from 'firebase/firestore'
import { Loader2, Save, X } from 'lucide-react'
import { useState } from 'react'
import type { LifeStatus, Person } from '../../data/schema'
import { db } from '../../lib/firebase'

interface PersonEditFormProps {
  person: Person
  onCancel: () => void
  onSaved: () => void
}

interface FormState {
  name: string
  phone: string
  email: string
  profession: string
  location: string
  photo: string
  status: LifeStatus
  notes: string
}

function toFormState(person: Person): FormState {
  return {
    name: person.name,
    phone: person.phone ?? '',
    email: person.email ?? '',
    profession: person.profession ?? '',
    location: person.location ?? '',
    photo: person.photo ?? '',
    status: person.status,
    notes: person.notes ?? '',
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]'
const labelClass =
  'mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase'

export function PersonEditForm({ person, onCancel, onSaved }: PersonEditFormProps) {
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
    if (!db) {
      setError('Not connected to a database right now.')
      return
    }

    setSaving(true)
    try {
      const batch = writeBatch(db)
      const personRef = doc(db, 'people', person.nahar_id)

      batch.update(personRef, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: trimmedEmail ? trimmedEmail.toLowerCase() : null,
        profession: form.profession.trim() || null,
        location: form.location.trim() || null,
        photo: form.photo.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      })

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
            Profession
          </label>
          <input
            id="profession"
            className={inputClass}
            value={form.profession}
            onChange={(e) => update('profession', e.target.value)}
            placeholder="Not set"
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
