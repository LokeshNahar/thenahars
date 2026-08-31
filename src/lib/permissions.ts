import type { AuthUser } from '../context/AuthContext'
import type { Person } from '../data/schema'

/** Personal fields any authorized editor (self/relative/admin) may change. */
export const EDITABLE_PERSONAL_FIELDS = [
  'name',
  'phone',
  'email',
  'profession',
  'qualification',
  'location',
  'photo',
  'instagram',
  'facebook',
  'linkedin',
  'status',
  'notes',
] as const

export type EditablePersonalField = (typeof EDITABLE_PERSONAL_FIELDS)[number]

/**
 * Mirrors firestore.rules' canEditPerson() for UI purposes (showing/hiding
 * the Edit button). Not itself a security boundary — the deployed rules
 * are what actually enforce this; this just keeps the UI honest about
 * what will succeed.
 */
export function canEditPerson(user: AuthUser | null, target: Person): boolean {
  if (!user || !user.naharId) return false
  if (user.role === 'admin') return true
  if (user.naharId === target.nahar_id) return true

  return (
    target.spouse.includes(user.naharId) ||
    target.parents.includes(user.naharId) || // target is my child
    target.children.includes(user.naharId) // target is my parent
  )
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}
